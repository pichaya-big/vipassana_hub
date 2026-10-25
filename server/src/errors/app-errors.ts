// Errors carry an HTTP status and a stable code. The error middleware turns them into responses,
// so services and controllers never build error responses themselves.
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(fields: Record<string, string>, message = "ข้อมูลไม่ครบหรือไม่ถูกต้อง") {
    super(400, "validation_failed", message, fields);
  }
}

const DUPLICATE_MESSAGES = {
  email: "อีเมลนี้ถูกใช้สมัครแล้ว กรุณาเข้าสู่ระบบแทน",
  phone: "เบอร์โทรศัพท์นี้ถูกใช้สมัครแล้ว กรุณาเข้าสู่ระบบแทน",
} as const;

export class DuplicateUserError extends AppError {
  constructor(field: "email" | "phone") {
    super(409, "duplicate", DUPLICATE_MESSAGES[field], { [field]: DUPLICATE_MESSAGES[field] });
  }
}

// The request clashes with the current state, e.g. the record changed since it was loaded
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "conflict", message);
  }
}

// Same message for unknown account and wrong password, so attackers cannot probe for accounts
export class InvalidCredentialsError extends AppError {
  constructor() {
    super(401, "invalid_credentials", "อีเมล/เบอร์โทร หรือรหัสผ่านไม่ถูกต้อง");
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super(401, "unauthorized", "กรุณาเข้าสู่ระบบก่อน");
  }
}

// Logged in, but the role does not allow this action
export class ForbiddenError extends AppError {
  constructor(message = "คุณไม่มีสิทธิ์เข้าถึงส่วนนี้") {
    super(403, "forbidden", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "ไม่พบข้อมูลที่ต้องการ") {
    super(404, "not_found", message);
  }
}

// MongoDB error code 11000 = a unique index rejected the insert
export function isDuplicateKeyError(err: unknown): err is { code: 11000; keyPattern?: Record<string, number> } {
  return typeof err === "object" && err !== null && "code" in err && err.code === 11000;
}
