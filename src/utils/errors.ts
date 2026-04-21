export const toUserMessage = (
  error: unknown,
  fallback = 'Ocorreu um erro inesperado.',
) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  return fallback;
};
