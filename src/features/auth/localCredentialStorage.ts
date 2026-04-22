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
const LEGACY_PASSWORD_ITERATION_COUNT = 210_000;
const LEGACY_RECOVERY_ITERATION_COUNT = 120_000;
const PASSWORD_ITERATION_COUNT = 120_000;
const RECOVERY_ITERATION_COUNT = 60_000;
const HASH_ASYNC_TICK_MS = 4;
const PASSWORD_VERSION = 'pbkdf2-sha256-v2';

export type LocalCredentialRecord = {
  version: typeof PASSWORD_VERSION;
  userId: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
  passwordIterations?: number;
  recoverySalt: string;
  recoveryHash: string;
  recoveryIterations?: number;
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
      asyncTick: HASH_ASYNC_TICK_MS,
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
const yieldToEventLoop = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const normalizeRecoveryCode = (recoveryCode: string) =>
  recoveryCode.trim().toUpperCase();

export const normalizeCredentialEmail = (email: string) =>
  email.trim().toLowerCase();

const debugAuthLog = (message: string) => {
  if (__DEV__) {
    console.log(`[auth-debug] ${message}`);
  }
};

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
  debugAuthLog('buildLocalCredentialRecord:start');
  const createdAt = new Date().toISOString();
  const passwordSalt = createSaltHex();
  const recoverySalt = createSaltHex();
  debugAuthLog('buildLocalCredentialRecord:before-password-hash');
  const passwordHash = await deriveHash(
    password,
    passwordSalt,
    PASSWORD_ITERATION_COUNT,
  );
  debugAuthLog('buildLocalCredentialRecord:after-password-hash');

  // Avoid running both derivations in parallel on the JS thread during signup.
  await yieldToEventLoop();

  debugAuthLog('buildLocalCredentialRecord:before-recovery-hash');
  const recoveryHash = await deriveHash(
    normalizeRecoveryCode(recoveryCode),
    recoverySalt,
    RECOVERY_ITERATION_COUNT,
  );
  debugAuthLog('buildLocalCredentialRecord:after-recovery-hash');

  return {
    version: PASSWORD_VERSION,
    userId,
    email: normalizeCredentialEmail(email),
    passwordSalt,
    passwordHash,
    passwordIterations: PASSWORD_ITERATION_COUNT,
    recoverySalt,
    recoveryHash,
    recoveryIterations: RECOVERY_ITERATION_COUNT,
    createdAt,
    updatedAt: createdAt,
  } satisfies LocalCredentialRecord;
};

export const persistLocalCredentialRecord = async (
  record: LocalCredentialRecord,
) => {
  const service = getServiceName(record.email);

  debugAuthLog(`persistLocalCredentialRecord:start:${service}`);
  await Keychain.setGenericPassword(record.email, JSON.stringify(record), {
    ...getKeychainOptions(service),
  });
  debugAuthLog(`persistLocalCredentialRecord:done:${service}`);
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

const getPasswordIterations = (record: LocalCredentialRecord) =>
  record.passwordIterations ?? LEGACY_PASSWORD_ITERATION_COUNT;

const getRecoveryIterations = (record: LocalCredentialRecord) =>
  record.recoveryIterations ?? LEGACY_RECOVERY_ITERATION_COUNT;

export const verifyLocalPassword = async (
  record: LocalCredentialRecord,
  password: string,
) => {
  const candidateHash = await deriveHash(
    password,
    record.passwordSalt,
    getPasswordIterations(record),
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
    getRecoveryIterations(record),
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
    version: PASSWORD_VERSION,
    passwordSalt,
    passwordHash,
    passwordIterations: PASSWORD_ITERATION_COUNT,
    updatedAt: new Date().toISOString(),
  } satisfies LocalCredentialRecord;
};
