import type {User} from 'firebase/auth';

import type {AuthProvider, UserProfileDocument} from '../types';

export const resolveProfileDisplayName = ({
  user,
  currentProfile,
  preferredName,
}: {
  user: Pick<User, 'displayName' | 'email'>;
  currentProfile?: Pick<UserProfileDocument, 'name'> | null;
  preferredName?: string | null;
}) =>
  preferredName?.trim() ||
  user.displayName?.trim() ||
  currentProfile?.name?.trim() ||
  user.email?.split('@')[0]?.trim() ||
  'Atleta';

export const buildProfileNameParts = (name: string) => {
  const trimmedName = name.trim();
  const [givenName, ...familyNameParts] = trimmedName.split(/\s+/).filter(Boolean);

  return {
    name: trimmedName || 'Atleta',
    givenName: givenName ?? 'Atleta',
    familyName: familyNameParts.join(' ').trim() || null,
  };
};

export const getUserAuthProvider = (
  user: Pick<User, 'providerData'>,
): AuthProvider => {
  if (user.providerData.some(item => item.providerId === 'google.com')) {
    return 'google';
  }

  if (user.providerData.some(item => item.providerId === 'password')) {
    return 'password';
  }

  return 'password';
};
