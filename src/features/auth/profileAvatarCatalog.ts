export type ProfileAvatarId =
  | 'caio-surge'
  | 'lia-vibe'
  | 'enzo-pulse'
  | 'maya-glow'
  | 'noah-beat'
  | 'clara-shift'
  | 'kenji-flare'
  | 'yuna-bloom';

export type ProfileAvatarDefinition = {
  id: ProfileAvatarId;
  name: string;
  skinTone: string;
  hairColor: string;
  hairShape: 'short' | 'fade' | 'wave' | 'long';
  shirtColor: string;
  shirtAccent: string;
  backgroundStart: string;
  backgroundEnd: string;
};

export const profileAvatarCatalog: readonly ProfileAvatarDefinition[] = [
  {
    id: 'caio-surge',
    name: 'Caio',
    skinTone: '#5B3A2A',
    hairColor: '#16181D',
    hairShape: 'fade',
    shirtColor: '#57D46A',
    shirtAccent: '#B7FF88',
    backgroundStart: '#16291B',
    backgroundEnd: '#203D2C',
  },
  {
    id: 'lia-vibe',
    name: 'Lia',
    skinTone: '#7A4B3B',
    hairColor: '#1F1519',
    hairShape: 'long',
    shirtColor: '#F26CA7',
    shirtAccent: '#FFC0D9',
    backgroundStart: '#2B1824',
    backgroundEnd: '#472033',
  },
  {
    id: 'enzo-pulse',
    name: 'Enzo',
    skinTone: '#E0B79D',
    hairColor: '#4D3425',
    hairShape: 'short',
    shirtColor: '#4FCBFF',
    shirtAccent: '#9FE7FF',
    backgroundStart: '#142230',
    backgroundEnd: '#23384D',
  },
  {
    id: 'maya-glow',
    name: 'Maya',
    skinTone: '#F0C8B0',
    hairColor: '#6B4136',
    hairShape: 'long',
    shirtColor: '#9D7BFF',
    shirtAccent: '#D5C4FF',
    backgroundStart: '#211833',
    backgroundEnd: '#372459',
  },
  {
    id: 'noah-beat',
    name: 'Noah',
    skinTone: '#BC7A5D',
    hairColor: '#251A16',
    hairShape: 'wave',
    shirtColor: '#FF8D57',
    shirtAccent: '#FFD3B8',
    backgroundStart: '#2A1A16',
    backgroundEnd: '#4A2A23',
  },
  {
    id: 'clara-shift',
    name: 'Clara',
    skinTone: '#D39473',
    hairColor: '#3A231F',
    hairShape: 'long',
    shirtColor: '#FFD45C',
    shirtAccent: '#FFF0B0',
    backgroundStart: '#312511',
    backgroundEnd: '#4A3A16',
  },
  {
    id: 'kenji-flare',
    name: 'Kenji',
    skinTone: '#E7C0A5',
    hairColor: '#151A22',
    hairShape: 'short',
    shirtColor: '#4ED6C2',
    shirtAccent: '#B5FFF1',
    backgroundStart: '#132724',
    backgroundEnd: '#1F3F3A',
  },
  {
    id: 'yuna-bloom',
    name: 'Yuna',
    skinTone: '#F0CCB4',
    hairColor: '#22181D',
    hairShape: 'long',
    shirtColor: '#7B9BFF',
    shirtAccent: '#C7D5FF',
    backgroundStart: '#1A2136',
    backgroundEnd: '#293552',
  },
] as const;

const avatarIdSet = new Set(profileAvatarCatalog.map(avatar => avatar.id));

export const defaultProfileAvatarId: ProfileAvatarId = 'caio-surge';

export const normalizeProfileAvatarId = (
  value: string | null | undefined,
): ProfileAvatarId =>
  value && avatarIdSet.has(value as ProfileAvatarId)
    ? (value as ProfileAvatarId)
    : defaultProfileAvatarId;

export const getProfileAvatarById = (value: string | null | undefined) =>
  profileAvatarCatalog.find(avatar => avatar.id === normalizeProfileAvatarId(value)) ??
  profileAvatarCatalog[0];
