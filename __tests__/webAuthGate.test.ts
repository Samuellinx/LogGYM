import {resolveAuthView} from '../web/src/lib/authGate';

describe('web auth gate', () => {
  it('keeps the login screen hidden while Firebase restores the current user', () => {
    expect(resolveAuthView({isAuthReady: false, user: null})).toBe('loading');
  });

  it('shows the login screen only after auth is ready and there is no user', () => {
    expect(resolveAuthView({isAuthReady: true, user: null})).toBe('auth');
  });

  it('shows the workspace after auth is ready and a user exists', () => {
    expect(resolveAuthView({isAuthReady: true, user: {uid: 'user-1'}})).toBe(
      'workspace',
    );
  });
});
