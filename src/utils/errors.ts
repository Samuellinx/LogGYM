const technicalMessagePatterns = [
  /developer_error/i,
  /oauth/i,
  /keystore/i,
  /keychain/i,
  /sqlite/i,
  /web client/i,
  /\bjson\b/i,
  /\btypeerror\b/i,
  /\breferenceerror\b/i,
  /\bsyntaxerror\b/i,
  /network request failed/i,
  /@react-native/i,
  /%userprofile%/i,
  /[a-z]:\\/i,
];

const looksTechnical = (message: string) =>
  technicalMessagePatterns.some(pattern => pattern.test(message)) ||
  message.length > 180;

export const toUserMessage = (
  error: unknown,
  fallback = 'Ocorreu um erro inesperado.',
) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return looksTechnical(error.message) ? fallback : error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return looksTechnical(error) ? fallback : error;
  }

  return fallback;
};
