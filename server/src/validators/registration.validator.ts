export const EDUCATION_LEVELS = [
  "ประถมศึกษา",
  "มัธยมศึกษาตอนต้น",
  "มัธยมศึกษาตอนปลาย / ปวช.",
  "ปวส. / อนุปริญญา",
  "ปริญญาตรี",
  "ปริญญาโท",
  "ปริญญาเอก",
  "อื่น ๆ",
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

// Shape of the register form body
export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  educationLevel: string;
  hasPracticed: boolean | null;
  experienceDetail?: string;
  password: string;
  pdpaConsent: boolean;
}

// Cleaned values, ready to store
export interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  educationLevel: EducationLevel;
  hasPracticed: boolean;
  experienceDetail: string;
  password: string;
}

export type FieldErrors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 100;
const MAX_DETAIL = 1000;

// Phone is stored as digits only
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function validateRegistration(input: RegisterInput): { errors: FieldErrors; value?: RegistrationData } {
  const errors: FieldErrors = {};

  const firstName = input.firstName?.trim() ?? "";
  const lastName = input.lastName?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  const phone = normalizePhone(input.phone ?? "");
  const experienceDetail = input.experienceDetail?.trim() ?? "";

  if (!firstName || firstName.length > MAX_NAME) errors.firstName = "กรุณากรอกชื่อ (ไม่เกิน 100 ตัวอักษร)";
  if (!lastName || lastName.length > MAX_NAME) errors.lastName = "กรุณากรอกนามสกุล (ไม่เกิน 100 ตัวอักษร)";
  if (!EMAIL_RE.test(email)) errors.email = "รูปแบบอีเมลไม่ถูกต้อง";
  if (!/^0\d{9}$/.test(phone)) errors.phone = "เบอร์โทรศัพท์ต้องเป็นเลข 10 หลัก ขึ้นต้นด้วย 0";
  if (!(EDUCATION_LEVELS as readonly string[]).includes(input.educationLevel)) {
    errors.educationLevel = "กรุณาเลือกระดับการศึกษาจากรายการ";
  }
  if (typeof input.hasPracticed !== "boolean") errors.hasPracticed = "กรุณาตอบว่าเคยปฏิบัติวิปัสสนากรรมฐานหรือไม่";
  if (experienceDetail.length > MAX_DETAIL) errors.experienceDetail = "รายละเอียดประสบการณ์ยาวเกินไป (ไม่เกิน 1000 ตัวอักษร)";
  if (typeof input.password !== "string" || input.password.length < 8) {
    errors.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
  }
  if (input.pdpaConsent !== true) errors.pdpaConsent = "ต้องยอมรับนโยบายความเป็นส่วนตัว (PDPA) ก่อนสมัครสมาชิก";

  if (Object.keys(errors).length > 0) return { errors };

  return {
    errors,
    value: {
      firstName,
      lastName,
      email,
      phone,
      educationLevel: input.educationLevel as EducationLevel,
      hasPracticed: input.hasPracticed as boolean,
      // Only keep the detail when the person said they have practiced before
      experienceDetail: input.hasPracticed ? experienceDetail : "",
      password: input.password,
    },
  };
}

export function validateLogin(input: { identifier?: unknown; password?: unknown }): {
  errors: FieldErrors;
  value?: { identifier: string; password: string };
} {
  const errors: FieldErrors = {};
  const identifier = typeof input.identifier === "string" ? input.identifier.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!identifier) errors.identifier = "กรุณากรอกอีเมลหรือเบอร์โทรศัพท์";
  if (!password) errors.password = "กรุณากรอกรหัสผ่าน";

  if (Object.keys(errors).length > 0) return { errors };
  return { errors, value: { identifier, password } };
}
