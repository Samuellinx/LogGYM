import type {User} from 'firebase/auth';
import {doc, getDoc, onSnapshot, setDoc, type Unsubscribe} from 'firebase/firestore';
import {z} from 'zod';

import type {AuthProvider, UserProfileDocument} from '../types';
import {firebaseDb} from './firebase';
import {buildProfileNameParts, resolveProfileDisplayName} from './profileIdentity';
import {
  defaultProfileAvatarId,
  normalizeProfileAvatarId,
} from './profileAvatarCatalog';

const isoDateSchema = z
  .string()
  .trim()
  .min(10)
  .max(40)
  .refine(value => !Number.isNaN(Date.parse(value)), 'Data ISO inválida.');

const userProfileDocumentSchema = z.object({
  uid: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(1).max(120),
  photo: z.string().trim().max(2000).nullable(),
  avatarId: z.string().trim().min(1).max(40),
  givenName: z.string().trim().max(120).nullable(),
  familyName: z.string().trim().max(120).nullable(),
  provider: z.enum(['google', 'password', 'dev-local']),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  lastLoginAt: isoDateSchema,
});

const getUserProfileRef = (userId: string) => doc(firebaseDb, 'users', userId);

const getUserProvider = (user: User): AuthProvider => {
  if (user.providerData.some(item => item.providerId === 'google.com')) {
    return 'google';
  }

  if (user.providerData.some(item => item.providerId === 'password')) {
    return 'password';
  }

  return 'password';
};

const parseProfile = (value: unknown): UserProfileDocument | null => {
  const parsed = userProfileDocumentSchema.safeParse(value);

  if (!parsed.success) {
    return null;
  }

  return {
    ...parsed.data,
    avatarId: normalizeProfileAvatarId(parsed.data.avatarId),
  };
};

const buildUserProfileDocument = (
  user: User,
  avatarId: string,
  currentProfile?: UserProfileDocument | null,
  preferredName?: string | null,
): UserProfileDocument => {
  const now = new Date().toISOString();
  const nameParts = buildProfileNameParts(
    resolveProfileDisplayName({
      user,
      currentProfile,
      preferredName,
    }),
  );
  const normalizedAvatarId = normalizeProfileAvatarId(avatarId);

  return {
    uid: user.uid,
    email: user.email?.trim().toLowerCase() || currentProfile?.email || 'athlete@loggym.local',
    name: nameParts.name,
    photo: null,
    avatarId: normalizedAvatarId,
    givenName: nameParts.givenName,
    familyName: nameParts.familyName,
    provider: getUserProvider(user),
    createdAt: currentProfile?.createdAt ?? now,
    updatedAt: now,
    lastLoginAt: user.metadata.lastSignInTime
      ? new Date(user.metadata.lastSignInTime).toISOString()
      : now,
  };
};

export const loadUserProfile = async (userId: string) => {
  const snapshot = await getDoc(getUserProfileRef(userId));

  if (!snapshot.exists()) {
    return null;
  }

  return parseProfile(snapshot.data());
};

export const ensureUserProfileDocument = async (
  user: User,
  preferredAvatarId = defaultProfileAvatarId,
  preferredName?: string | null,
) => {
  const currentProfile = await loadUserProfile(user.uid);
  const payload = buildUserProfileDocument(
    user,
    currentProfile?.avatarId ?? preferredAvatarId,
    currentProfile,
    preferredName,
  );

  await setDoc(getUserProfileRef(user.uid), payload, {merge: true});
  return payload;
};

export const updateUserProfileAvatar = async (user: User, avatarId: string) => {
  const currentProfile = await loadUserProfile(user.uid);
  const payload = buildUserProfileDocument(
    user,
    currentProfile?.avatarId ?? avatarId,
    currentProfile,
  );
  payload.avatarId = normalizeProfileAvatarId(avatarId);

  await setDoc(getUserProfileRef(user.uid), payload, {merge: true});
  return payload;
};

export const watchUserProfile = (
  userId: string,
  listener: (profile: UserProfileDocument | null) => void,
): Unsubscribe =>
  onSnapshot(getUserProfileRef(userId), snapshot => {
    if (!snapshot.exists()) {
      listener(null);
      return;
    }

    listener(parseProfile(snapshot.data()));
  });
