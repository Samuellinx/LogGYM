import type {SessionUser} from '@/types/domain';
import {createId} from '@/utils/ids';
import {
  buildLocalCredentialRecord,
  buildUpdatedPasswordRecord,
  clearLocalCredentialRecord,
  loadLocalCredentialRecord,
  normalizeCredentialEmail,
  persistLocalCredentialRecord,
  verifyLocalPassword,
  verifyRecoveryCode,
} from '@/features/auth/localCredentialStorage';
import {
  ensureUserRecord,
  findUserByEmail,
} from '@/features/workouts/workoutRepository';

const buildCredentialUser = ({
  id,
  name,
  email,
  lastLoginAt,
}: {
  id: string;
  name: string;
  email: string;
  lastLoginAt: string;
}): SessionUser => ({
  id,
  name: name.trim(),
  email: normalizeCredentialEmail(email),
  photo: null,
  familyName: null,
  givenName: name.trim().split(/\s+/)[0] ?? name.trim(),
  provider: 'credentials',
  lastLoginAt,
});

const getMissingCredentialError = () =>
  new Error(
    'Essa conta local nao esta disponivel neste aparelho. Restaure um backup ou use outro metodo de entrada.',
  );

export const signUpWithCredentialAccount = async ({
  name,
  email,
  password,
  recoveryCode,
}: {
  name: string;
  email: string;
  password: string;
  recoveryCode: string;
}) => {
  const normalizedEmail = normalizeCredentialEmail(email);
  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    if (existingUser.provider === 'google') {
      throw new Error('Esse e-mail ja esta vinculado ao login com Google.');
    }

    throw new Error('Ja existe uma conta cadastrada com esse e-mail.');
  }

  const lastLoginAt = new Date().toISOString();
  const user = buildCredentialUser({
    id: createId(),
    name,
    email: normalizedEmail,
    lastLoginAt,
  });
  const credentialRecord = await buildLocalCredentialRecord({
    userId: user.id,
    email: normalizedEmail,
    password,
    recoveryCode,
  });

  await persistLocalCredentialRecord(credentialRecord);

  try {
    await ensureUserRecord(user);
  } catch (error) {
    await clearLocalCredentialRecord(normalizedEmail);
    throw error;
  }

  return user;
};

export const signInWithCredentialAccount = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  const normalizedEmail = normalizeCredentialEmail(email);
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw new Error('Conta nao encontrada para esse e-mail.');
  }

  if (user.provider !== 'credentials') {
    throw new Error(
      user.provider === 'google'
        ? 'Esse e-mail usa entrada com Google.'
        : 'Esse e-mail nao usa senha local.',
    );
  }

  const credentialRecord = await loadLocalCredentialRecord(normalizedEmail);

  if (!credentialRecord || credentialRecord.userId !== user.id) {
    throw getMissingCredentialError();
  }

  const isValidPassword = await verifyLocalPassword(credentialRecord, password);

  if (!isValidPassword) {
    throw new Error('E-mail ou senha invalidos.');
  }

  return {
    ...user,
    provider: 'credentials',
    lastLoginAt: new Date().toISOString(),
  } satisfies SessionUser;
};

export const resetCredentialPassword = async ({
  email,
  recoveryCode,
  newPassword,
}: {
  email: string;
  recoveryCode: string;
  newPassword: string;
}) => {
  const normalizedEmail = normalizeCredentialEmail(email);
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw new Error('Conta nao encontrada para esse e-mail.');
  }

  if (user.provider !== 'credentials') {
    throw new Error(
      user.provider === 'google'
        ? 'Esse e-mail usa entrada com Google.'
        : 'Esse e-mail nao usa senha local.',
    );
  }

  const credentialRecord = await loadLocalCredentialRecord(normalizedEmail);

  if (!credentialRecord || credentialRecord.userId !== user.id) {
    throw getMissingCredentialError();
  }

  const hasValidRecoveryCode = await verifyRecoveryCode(
    credentialRecord,
    recoveryCode,
  );

  if (!hasValidRecoveryCode) {
    throw new Error('Codigo de recuperacao invalido.');
  }

  const updatedRecord = await buildUpdatedPasswordRecord(
    credentialRecord,
    newPassword,
  );

  await persistLocalCredentialRecord(updatedRecord);
};
