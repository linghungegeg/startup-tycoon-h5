import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type PasswordRecord = {
  passwordHash: string;
  passwordSalt: string;
};

export const hashPassword = (password: string, salt: string): string =>
  scryptSync(password, salt, 32).toString("hex");

export const createPasswordRecord = (password: string): PasswordRecord => {
  const passwordSalt = randomBytes(16).toString("hex");
  return {
    passwordHash: hashPassword(password, passwordSalt),
    passwordSalt
  };
};

export const verifyPassword = (
  record: PasswordRecord,
  password: string
): boolean => {
  const expected = Buffer.from(record.passwordHash, "hex");
  const actual = Buffer.from(hashPassword(password, record.passwordSalt), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
