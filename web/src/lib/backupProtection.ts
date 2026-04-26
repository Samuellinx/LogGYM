import {xchacha20poly1305} from '@noble/ciphers/chacha.js';
import {
  bytesToHex,
  bytesToUtf8,
  hexToBytes,
  randomBytes,
  utf8ToBytes,
} from '@noble/ciphers/utils.js';
import {scryptAsync} from '@noble/hashes/scrypt.js';
import {z} from 'zod';

const ENCRYPTED_BACKUP_FORMAT = 'loggym-encrypted-backup';
const BACKUP_PASSWORD_MIN_LENGTH = 8;
const SCRYPT_OPTIONS = {
  N: 2 ** 14,
  r: 8,
  p: 1,
  dkLen: 32,
  asyncTick: 10,
} as const;

const encryptedBackupEnvelopeSchema = z.object({
  format: z.literal(ENCRYPTED_BACKUP_FORMAT),
  schemaVersion: z.literal(1),
  exportedAt: z.string().trim().min(10).max(40),
  kdf: z.object({
    name: z.literal('scrypt'),
    N: z.literal(SCRYPT_OPTIONS.N),
    r: z.literal(SCRYPT_OPTIONS.r),
    p: z.literal(SCRYPT_OPTIONS.p),
    dkLen: z.literal(SCRYPT_OPTIONS.dkLen),
    saltHex: z.string().trim().regex(/^[0-9a-f]+$/iu),
  }),
  cipher: z.object({
    name: z.literal('xchacha20poly1305'),
    nonceHex: z.string().trim().regex(/^[0-9a-f]+$/iu),
  }),
  ciphertextHex: z.string().trim().regex(/^[0-9a-f]+$/iu),
});

const deriveBackupKey = (password: string, salt: Uint8Array) =>
  scryptAsync(password, salt, SCRYPT_OPTIONS);

export const validateBackupPassword = (
  password: string,
  confirmPassword?: string,
) => {
  const normalizedPassword = password.trim();

  if (normalizedPassword.length < BACKUP_PASSWORD_MIN_LENGTH) {
    throw new Error('Use uma senha com pelo menos 8 caracteres para proteger a cópia.');
  }

  if (confirmPassword !== undefined && normalizedPassword !== confirmPassword.trim()) {
    throw new Error('A confirmação da senha da cópia não confere.');
  }

  return normalizedPassword;
};

export const encryptBackupJson = async (
  backupJson: string,
  password: string,
) => {
  const normalizedPassword = validateBackupPassword(password);
  const salt = randomBytes(16);
  const nonce = randomBytes(24);
  const key = await deriveBackupKey(normalizedPassword, salt);
  const ciphertext = xchacha20poly1305(key, nonce).encrypt(
    utf8ToBytes(backupJson),
  );

  return `${JSON.stringify(
    encryptedBackupEnvelopeSchema.parse({
      format: ENCRYPTED_BACKUP_FORMAT,
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      kdf: {
        name: 'scrypt',
        N: SCRYPT_OPTIONS.N,
        r: SCRYPT_OPTIONS.r,
        p: SCRYPT_OPTIONS.p,
        dkLen: SCRYPT_OPTIONS.dkLen,
        saltHex: bytesToHex(salt),
      },
      cipher: {
        name: 'xchacha20poly1305',
        nonceHex: bytesToHex(nonce),
      },
      ciphertextHex: bytesToHex(ciphertext),
    }),
    null,
    2,
  )}\n`;
};

export const decryptBackupJson = async (
  fileContents: string,
  password: string,
) => {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(fileContents) as unknown;
  } catch {
    throw new Error('O arquivo selecionado não é um backup válido do LogGYM.');
  }

  const encryptedEnvelope = encryptedBackupEnvelopeSchema.safeParse(parsedJson);

  if (!encryptedEnvelope.success) {
    return fileContents;
  }

  const normalizedPassword = validateBackupPassword(password);

  try {
    const salt = hexToBytes(encryptedEnvelope.data.kdf.saltHex);
    const nonce = hexToBytes(encryptedEnvelope.data.cipher.nonceHex);
    const ciphertext = hexToBytes(encryptedEnvelope.data.ciphertextHex);
    const key = await deriveBackupKey(normalizedPassword, salt);
    const plaintext = xchacha20poly1305(key, nonce).decrypt(ciphertext);

    return bytesToUtf8(plaintext);
  } catch {
    throw new Error('Senha inválida ou arquivo de cópia corrompido.');
  }
};
