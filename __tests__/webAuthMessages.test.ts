import {getUnauthorizedDomainMessage} from '../web/src/lib/authMessages';

describe('web auth messages', () => {
  it('guides local Google login away from 127.0.0.1', () => {
    expect(getUnauthorizedDomainMessage('127.0.0.1')).toBe(
      'Abra o painel em http://localhost:5173 para entrar com Google em DEV.',
    );
  });

  it('keeps localhost authorization actionable', () => {
    expect(getUnauthorizedDomainMessage('localhost')).toBe(
      'Autorize localhost no Firebase Auth para usar o login Google em DEV.',
    );
  });
});
