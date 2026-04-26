import {
  defaultProfileAvatarId,
  normalizeProfileAvatarId,
  profileAvatarCatalog,
} from '@/features/auth/profileAvatarCatalog';

describe('profileAvatarCatalog', () => {
  it('keeps a fixed set of eight unique avatars and a valid default id', () => {
    expect(profileAvatarCatalog).toHaveLength(8);

    const ids = profileAvatarCatalog.map(avatar => avatar.id);
    expect(new Set(ids).size).toBe(8);
    expect(ids).toContain(defaultProfileAvatarId);
  });

  it('falls back to the default avatar when the id is missing or invalid', () => {
    expect(normalizeProfileAvatarId(null)).toBe(defaultProfileAvatarId);
    expect(normalizeProfileAvatarId(undefined)).toBe(defaultProfileAvatarId);
    expect(normalizeProfileAvatarId('nao-existe')).toBe(defaultProfileAvatarId);
  });

  it('keeps valid avatar ids untouched', () => {
    const sampleAvatarId = profileAvatarCatalog[3]?.id;

    expect(sampleAvatarId).toBeDefined();
    expect(normalizeProfileAvatarId(sampleAvatarId)).toBe(sampleAvatarId);
  });
});
