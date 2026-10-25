// Business rules for registration and login. Talks to the database only through the model layer.
import bcrypt from "bcryptjs";
import { logger } from "../config/logger.js";
import { DEFAULT_ROLE } from "../authz/roles.js";
import { DuplicateUserError, InvalidCredentialsError, ValidationError, isDuplicateKeyError } from "../errors/app-errors.js";
import * as userModel from "../models/user.model.js";
import type { PublicUser, UserDocument } from "../models/user.model.js";
import { normalizePhone, validateLogin, validateRegistration, type RegisterInput } from "../validators/registration.validator.js";

// Bump when the PDPA text changes, so we know which version each user agreed to
export const PDPA_VERSION = "2026-10";
const BCRYPT_ROUNDS = 12;

// Used when the account does not exist, so a login attempt takes about the same time either way
const DUMMY_HASH = bcrypt.hashSync("timing-equalizer", BCRYPT_ROUNDS);

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const { errors, value } = validateRegistration(input);
  if (!value) throw new ValidationError(errors);

  const now = new Date();
  const doc: UserDocument = {
    firstName: value.firstName,
    lastName: value.lastName,
    email: value.email,
    phone: value.phone,
    educationLevel: value.educationLevel,
    // Always the default role. Roles are never taken from the registration form.
    role: DEFAULT_ROLE,
    meditation: { hasPracticed: value.hasPracticed, experienceDetail: value.experienceDetail },
    pdpa: { accepted: true, acceptedAt: now, version: PDPA_VERSION },
    passwordHash: await bcrypt.hash(value.password, BCRYPT_ROUNDS),
    createdAt: now,
    updatedAt: now,
  };

  try {
    const _id = await userModel.insertUser(doc);
    logger.info({ userId: _id.toString(), role: doc.role }, "user registered");
    return userModel.toPublicUser({ ...doc, _id });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new DuplicateUserError(err.keyPattern?.phone ? "phone" : "email");
    }
    throw err;
  }
}

export async function loginUser(body: { identifier?: unknown; password?: unknown }): Promise<PublicUser> {
  const { errors, value } = validateLogin(body);
  if (!value) throw new ValidationError(errors);

  // Text with "@" is an email, anything else is treated as a phone number
  const user = value.identifier.includes("@")
    ? await userModel.findUserByEmail(value.identifier.toLowerCase())
    : await userModel.findUserByPhone(normalizePhone(value.identifier));

  const passwordOk = await bcrypt.compare(value.password, user?.passwordHash ?? DUMMY_HASH);
  // The reason is logged for debugging, but never the email or phone that was typed
  if (!user || !passwordOk) {
    logger.warn({ reason: user ? "bad_password" : "unknown_account" }, "login failed");
    throw new InvalidCredentialsError();
  }

  logger.info({ userId: user._id.toString() }, "login succeeded");
  return userModel.toPublicUser(user);
}
