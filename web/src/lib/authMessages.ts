export const getUnauthorizedDomainMessage = (hostname?: string) => {
  if (hostname === '127.0.0.1') {
    return 'Abra o painel em http://localhost:5173 para entrar com Google em DEV.';
  }

  if (hostname === 'localhost') {
    return 'Autorize localhost no Firebase Auth para usar o login Google em DEV.';
  }

  return 'Este endereço ainda não está autorizado para login no Firebase Auth.';
};
