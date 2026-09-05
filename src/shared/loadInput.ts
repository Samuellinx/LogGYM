export const MAX_LOAD_LABEL_LENGTH = 8;

const allowedLoadCharactersPattern = /[^\p{L}\p{N}\s,./-]/gu;
const loadNumberPattern = /\d+(?:[,.]\d+)?/u;

export const maskLoadInput = (value: string) =>
  value
    .replace(allowedLoadCharactersPattern, '')
    .replace(/\s+/gu, ' ')
    .trimStart()
    .slice(0, MAX_LOAD_LABEL_LENGTH);

export const normalizeLoadLabel = (value: string) =>
  maskLoadInput(value).trim();

export const parseLoadInputNumber = (value: string) => {
  const match = normalizeLoadLabel(value).match(loadNumberPattern);

  return match ? Number(match[0].replace(',', '.')) : 0;
};

export const hasLoadInputValue = (value: string) =>
  normalizeLoadLabel(value).length > 0;

export const buildSessionSetLoadFields = (value: string) => {
  const loadLabel = normalizeLoadLabel(value);

  return {
    load: parseLoadInputNumber(loadLabel),
    ...(loadLabel ? {loadLabel} : {}),
  };
};
