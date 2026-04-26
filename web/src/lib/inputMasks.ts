export const maskIntegerInput = (value: string) => value.replace(/\D/gu, '');

export const maskDecimalInput = (value: string) => {
  const cleaned = value.replace(/[^\d,.]/gu, '');
  const separatorIndex = cleaned.search(/[,.]/u);

  if (separatorIndex === -1) {
    return maskIntegerInput(cleaned);
  }

  const separator = cleaned[separatorIndex];
  const integer = maskIntegerInput(cleaned.slice(0, separatorIndex));
  const decimal = maskIntegerInput(cleaned.slice(separatorIndex + 1));

  return `${integer}${separator}${decimal}`;
};

export const maskRepRangeInput = (value: string) => {
  const cleaned = value.replace(/[^\d-]/gu, '');
  const separatorIndex = cleaned.indexOf('-');

  if (separatorIndex === -1) {
    return maskIntegerInput(cleaned);
  }

  const first = maskIntegerInput(cleaned.slice(0, separatorIndex));
  const second = maskIntegerInput(cleaned.slice(separatorIndex + 1));

  return `${first}-${second}`;
};
