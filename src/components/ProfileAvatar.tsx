import {StyleSheet, View} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import {
  getProfileAvatarById,
  type ProfileAvatarDefinition,
} from '@/features/auth/profileAvatarCatalog';
import {theme} from '@/theme';

const renderHair = (avatar: ProfileAvatarDefinition) => {
  switch (avatar.hairShape) {
    case 'fade':
      return (
        <>
          <Path d="M23 36C27 21 42 15 54 16C66 17 75 26 77 40H19C19 38 20 37 23 36Z" fill={avatar.hairColor} />
          <Rect x="18" y="34" width="8" height="18" rx="4" fill={avatar.hairColor} />
          <Rect x="70" y="34" width="8" height="18" rx="4" fill={avatar.hairColor} />
        </>
      );
    case 'wave':
      return (
        <Path
          d="M18 40C19 25 32 15 48 15C61 15 76 22 78 39C71 35 66 31 60 34C55 36 51 31 46 31C40 31 36 36 30 36C25 36 22 33 18 40Z"
          fill={avatar.hairColor}
        />
      );
    case 'long':
      return (
        <>
          <Path d="M19 38C21 24 33 15 48 15C63 15 75 24 77 40C72 36 67 34 61 34C55 34 49 35 43 35C35 35 27 34 19 38Z" fill={avatar.hairColor} />
          <Path d="M23 39C22 60 23 72 28 79H37C34 66 33 53 34 40Z" fill={avatar.hairColor} />
          <Path d="M73 39C74 60 73 72 68 79H59C62 66 63 53 62 40Z" fill={avatar.hairColor} />
        </>
      );
    case 'short':
    default:
      return (
        <Path
          d="M20 39C22 24 34 15 48 15C61 15 73 23 76 38C69 35 63 32 57 32C50 32 44 35 37 35C31 35 26 34 20 39Z"
          fill={avatar.hairColor}
        />
      );
  }
};

export const ProfileAvatar = ({
  avatarId,
  size = 72,
  selected = false,
}: {
  avatarId?: string | null;
  size?: number;
  selected?: boolean;
}) => {
  const avatar = getProfileAvatarById(avatarId);
  const gradientId = `profile-avatar-${avatar.id}`;
  const frameStyle = [
    styles.frame,
    selected ? styles.frameSelected : null,
    {
      width: size,
      height: size,
    },
  ];

  return (
    <View style={frameStyle}>
      <Svg width={size} height={size} viewBox="0 0 96 96">
        <Defs>
          <LinearGradient id={gradientId} x1="16" y1="12" x2="80" y2="84">
            <Stop offset="0" stopColor={avatar.backgroundStart} />
            <Stop offset="1" stopColor={avatar.backgroundEnd} />
          </LinearGradient>
        </Defs>

        <Circle cx="48" cy="48" r="48" fill={`url(#${gradientId})`} />
        <Circle cx="48" cy="48" r="46" fill="rgba(255,255,255,0.03)" />

        <Path
          d="M18 88C21 70 34 62 48 62C62 62 75 70 78 88"
          fill={avatar.shirtColor}
        />
        <Path
          d="M32 88C34 74 40 67 48 67C56 67 62 74 64 88"
          fill={avatar.shirtAccent}
          opacity="0.9"
        />
        <Rect x="42" y="52" width="12" height="12" rx="6" fill={avatar.skinTone} />
        <Ellipse cx="48" cy="40" rx="18" ry="20" fill={avatar.skinTone} />
        {renderHair(avatar)}
        <Circle cx="41" cy="42" r="2.3" fill="#101419" />
        <Circle cx="55" cy="42" r="2.3" fill="#101419" />
        <Path
          d="M42 51C44 53 46 54 48 54C50 54 52 53 54 51"
          fill="none"
          stroke="#613728"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: theme.colors.surfaceElevated,
    shadowColor: '#000000',
    elevation: 5,
  },
  frameSelected: {
    borderColor: theme.colors.accentSecondary,
    shadowColor: theme.colors.accentSecondary,
  },
});
