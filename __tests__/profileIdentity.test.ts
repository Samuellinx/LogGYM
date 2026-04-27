import {resolveProfileDisplayName} from '../web/src/lib/profileIdentity';

describe('profile identity resolution', () => {
  it('prefers the explicit signup name over auth fallbacks', () => {
    expect(
      resolveProfileDisplayName({
        user: {
          displayName: null,
          email: 'samuel@example.com',
        },
        currentProfile: {
          name: 'samuel',
        },
        preferredName: 'Samuel Souza',
      }),
    ).toBe('Samuel Souza');
  });

  it('uses the persisted profile name before falling back to e-mail', () => {
    expect(
      resolveProfileDisplayName({
        user: {
          displayName: null,
          email: 'samuel@example.com',
        },
        currentProfile: {
          name: 'Samuel Souza',
        },
      }),
    ).toBe('Samuel Souza');
  });
});
