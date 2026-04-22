const numericPattern = /^\d+(?:[.,]\d+)?$/u;

export type ParsedBaseLoad = {
  kg: string;
  plates: string;
  fallback: string;
};

const cleanValue = (value: string) => value.trim().replace(',', '.');

const formatNumericValue = (value: string) => {
  const normalized = cleanValue(value);

  if (!normalized || !numericPattern.test(normalized)) {
    return '';
  }

  return normalized.endsWith('.0') ? normalized.slice(0, -2) : normalized;
};

export const parseBaseLoad = (value: string): ParsedBaseLoad => {
  const normalized = value.trim();

  if (!normalized) {
    return {
      kg: '',
      plates: '',
      fallback: '',
    };
  }

  const kgMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*kg\b/iu);
  const platesMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*plates?\b/iu);

  if (!kgMatch && !platesMatch) {
    return {
      kg: '',
      plates: '',
      fallback: normalized,
    };
  }

  return {
    kg: kgMatch ? formatNumericValue(kgMatch[1]) : '',
    plates: platesMatch ? formatNumericValue(platesMatch[1]) : '',
    fallback: '',
  };
};

export const composeBaseLoad = ({
  kg,
  plates,
  fallback = '',
}: ParsedBaseLoad) => {
  const kgValue = formatNumericValue(kg);
  const platesValue = formatNumericValue(plates);
  const parts: string[] = [];

  if (kgValue) {
    parts.push(`${kgValue} kg`);
  }

  if (platesValue) {
    const numericPlates = Number(platesValue);
    parts.push(`${platesValue} ${numericPlates === 1 ? 'plate' : 'plates'}`);
  }

  if (parts.length > 0) {
    return parts.join(' + ');
  }

  return fallback.trim();
};

export const formatBaseLoadLabel = (value: string) => {
  const parsed = parseBaseLoad(value);

  return composeBaseLoad(parsed);
};

