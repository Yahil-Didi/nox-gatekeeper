import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const KEY_LENGTH = 64;

/**
 * SHA-256 for agent keys and session tokens. They are long random values, so a fast hash is safe
 * (no one can guess them), and it lets us look them up by hash.
 */
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

/** A random token for session cookies: 32 bytes, URL-safe. */
export const randomToken = (): string => randomBytes(32).toString('base64url');

/** Passwords are short and guessable, so they get scrypt (slow on purpose) with a random salt. */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
};

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const [saltHex, hashHex] = stored.split(':');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), KEY_LENGTH);
  return timingSafeEqual(actual, expected);
};
