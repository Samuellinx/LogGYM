import {
  getProfileAvatarById,
  type ProfileAvatarDefinition,
} from '../lib/profileAvatarCatalog';

const renderHair = (avatar: ProfileAvatarDefinition) => {
  switch (avatar.hairShape) {
    case 'fade':
      return (
        <>
          <path d="M23 36C27 21 42 15 54 16C66 17 75 26 77 40H19C19 38 20 37 23 36Z" fill={avatar.hairColor} />
          <rect x="18" y="34" width="8" height="18" rx="4" fill={avatar.hairColor} />
          <rect x="70" y="34" width="8" height="18" rx="4" fill={avatar.hairColor} />
        </>
      );
    case 'wave':
      return (
        <path
          d="M18 40C19 25 32 15 48 15C61 15 76 22 78 39C71 35 66 31 60 34C55 36 51 31 46 31C40 31 36 36 30 36C25 36 22 33 18 40Z"
          fill={avatar.hairColor}
        />
      );
    case 'long':
      return (
        <>
          <path d="M19 38C21 24 33 15 48 15C63 15 75 24 77 40C72 36 67 34 61 34C55 34 49 35 43 35C35 35 27 34 19 38Z" fill={avatar.hairColor} />
          <path d="M23 39C22 60 23 72 28 79H37C34 66 33 53 34 40Z" fill={avatar.hairColor} />
          <path d="M73 39C74 60 73 72 68 79H59C62 66 63 53 62 40Z" fill={avatar.hairColor} />
        </>
      );
    case 'short':
    default:
      return (
        <path
          d="M20 39C22 24 34 15 48 15C61 15 73 23 76 38C69 35 63 32 57 32C50 32 44 35 37 35C31 35 26 34 20 39Z"
          fill={avatar.hairColor}
        />
      );
  }
};

export const ProfileAvatar = ({
  avatarId,
  size = 88,
}: {
  avatarId?: string | null;
  size?: number;
}) => {
  const avatar = getProfileAvatarById(avatarId);
  const gradientId = `profile-avatar-${avatar.id}`;

  return (
    <svg viewBox="0 0 96 96" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="16" y1="12" x2="80" y2="84">
          <stop offset="0" stopColor={avatar.backgroundStart} />
          <stop offset="1" stopColor={avatar.backgroundEnd} />
        </linearGradient>
      </defs>

      <circle cx="48" cy="48" r="48" fill={`url(#${gradientId})`} />
      <circle cx="48" cy="48" r="46" fill="rgba(255,255,255,0.03)" />
      <path d="M18 88C21 70 34 62 48 62C62 62 75 70 78 88" fill={avatar.shirtColor} />
      <path
        d="M32 88C34 74 40 67 48 67C56 67 62 74 64 88"
        fill={avatar.shirtAccent}
        opacity="0.9"
      />
      <rect x="42" y="52" width="12" height="12" rx="6" fill={avatar.skinTone} />
      <ellipse cx="48" cy="40" rx="18" ry="20" fill={avatar.skinTone} />
      {renderHair(avatar)}
      <circle cx="41" cy="42" r="2.3" fill="#101419" />
      <circle cx="55" cy="42" r="2.3" fill="#101419" />
      <path
        d="M42 51C44 53 46 54 48 54C50 54 52 53 54 51"
        fill="none"
        stroke="#613728"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};
