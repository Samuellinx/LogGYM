import * as Keychain from 'react-native-keychain';
import {pbkdf2Async} from '@noble/hashes/pbkdf2.js';
import {sha256} from '@noble/hashes/sha2.js';
import {
  bytesToHex,
  hexToBytes,
  randomBytes,
  utf8ToBytes,
} from '@noble/hashes/utils.js';

const LOCAL_ACCOUNT_SERVICE_PREFIX = 'loggym.credentials';
const PASSWORD_ITERATION_COUNT = 210_000;
const RECOVERY_ITERATION_COUNT = 120_000;
const PASSWORD_VERSION = 'pbkdf2-sha256-v1';

export type LocalCredentialRecord = {
  version: typeof PASSWORD_VERSION;
  userId: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
  recoverySalt: string;
  recoveryHash: string;
  createdAt: string;
  updatedAt: string;
};

const getServiceName = (email: string) =>
  `${LOCAL_ACCOUNT_SERVICE_PREFIX}.${normalizeCredentialEmail(email)}`;

const getKeychainOptions = (service: string) => ({
  service,
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
  storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
});

const deriveHash = async (
  secret: string,
  saltHex: string,
  iterationCount: number,
) => {
  const derived = await pbkdf2Async(
    sha256,
    utf8ToBytes(secret),
    hexToBytes(saltHex),
    {
      // PBKDF2 keeps local sign-in responsive on-device while avoiding plaintext secrets.
      c: iterationCount,
      dkLen: 32,
    },
  );

  return bytesToHex(derived);
};

const matchesHash = (expectedHash: string, candidateHash: string) => {
  try {
    const expectedBytes = hexToBytes(expectedHash);
    const candidateBytes = hexToBytes(candidateHash);

    if (expectedBytes.length !== candidateBytes.length) {
      return false;
    }

    let hasDifference = false;

    for (let index = 0; index < expectedBytes.length; index += 1) {
      if (expectedBytes[index] !== candidateBytes[index]) {
        hasDifference = true;
      }
    }

    return !hasDifference;
  } catch {
    return false;
  }
};

const createSaltHex = () => bytesToHex(randomBytes(16));

const normalizeRecoveryCode = (recoveryCode: string) =>
  recoveryCode.trim().toUpperCase();

export const normalizeCredentialEmail = (email: string) =>
  email.trim().toLowerCase();

export const buildLocalCredentialRecord = async ({
  userId,
  email,
  password,
  recoveryCode,
}: {
  userId: string;
  email: string;
  password: string;
  recoveryCode: string;
}) => {
  const createdAt = new Date().toISOString();
  const passwordSalt = createSaltHex();
  const recoverySalt = createSaltHex();

  const [passwordHash, recoveryHash] = await Promise.all([
    deriveHash(password, passwordSalt, PASSWORD_ITERATION_COUNT),
    deriveHash(
      normalizeRecoveryCode(recoveryCode),
      recoverySalt,
      RECOVERY_ITERATION_COUNT,
    ),
  ]);

  return {
    version: PASSWORD_VERSION,
    userId,
    email: normalizeCredentialEmail(email),
    passwordSalt,
    passwordHash,
    recoverySalt,
    recoveryHash,
    createdAt,
    updatedAt: createdAt,
  } satisfies LocalCredentialRecord;
};

export const persistLocalCredentialRecord = async (
  record: LocalCredentialRecord,
) => {
  const service = getServiceName(record.email);

  await Keychain.setGenericPassword(record.email, JSON.stringify(record), {
    ...getKeychainOptions(service),
  });
};

export const loadLocalCredentialRecord = async (email: string) => {
  const service = getServiceName(email);
  const credentials = await Keychain.getGenericPassword({service});

  if (!credentials) {
    return null;
  }

  try {
    return JSON.parse(credentials.password) as LocalCredentialRecord;
  } catch {
    await Keychain.resetGenericPassword({service});
    return null;
  }
};

export const clearLocalCredentialRecord = async (email: string) => {
  await Keychain.resetGenericPassword({service: getServiceName(email)});
};

export const verifyLocalPassword = async (
  record: LocalCredentialRecord,
  password: string,
) => {
  const candidateHash = await deriveHash(
    password,
    record.passwordSalt,
    PASSWORD_ITERATION_COUNT,
  );

  return matchesHash(record.passwordHash, candidateHash);
};

export const verifyRecoveryCode = async (
  record: LocalCredentialRecord,
  recoveryCode: string,
) => {
  const candidateHash = await deriveHash(
    normalizeRecoveryCode(recoveryCode),
    record.recoverySalt,
    RECOVERY_ITERATION_COUNT,
  );

  return matchesHash(record.recoveryHash, candidateHash);
};

export const buildUpdatedPasswordRecord = async (
  record: LocalCredentialRecord,
  newPassword: string,
) => {
  const passwordSalt = createSaltHex();
  const passwordHash = await deriveHash(
    newPassword,
    passwordSalt,
    PASSWORD_ITERATION_COUNT,
  );

  return {
    ...record,
    passwordSalt,
    passwordHash,
    updatedAt: new Date().toISOString(),
  } satisfies LocalCredentialRecord;
};
