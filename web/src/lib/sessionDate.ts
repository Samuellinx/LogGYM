const padCalendarPart = (value: number) => value.toString().padStart(2, '0');

const extractCalendarDate = (value: string | Date) => {
  if (value instanceof Date) {
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    };
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/u);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
};

export const toSessionDate = (value: string | Date) => {
  const calendarDate = extractCalendarDate(value);

  if (calendarDate) {
    return new Date(
      calendarDate.year,
      calendarDate.month - 1,
      calendarDate.day,
      12,
      0,
      0,
      0,
    );
  }

  return new Date(value);
};

export const getSessionDateInputValue = (value: string | Date) => {
  const date = toSessionDate(value);

  return [
    date.getFullYear(),
    padCalendarPart(date.getMonth() + 1),
    padCalendarPart(date.getDate()),
  ].join('-');
};

export const normalizeSessionDateInput = (value: string | Date) => {
  const normalizedValue = typeof value === 'string' ? value.trim() : value;
  const calendarDate = extractCalendarDate(normalizedValue);

  if (calendarDate) {
    return new Date(
      calendarDate.year,
      calendarDate.month - 1,
      calendarDate.day,
      12,
      0,
      0,
      0,
    ).toISOString();
  }

  return new Date(normalizedValue).toISOString();
};

export const resolveSessionFinishedAt = (session: {
  finishedAt?: string | null;
  createdAt?: string | null;
  performedAt?: string | null;
}) => session.finishedAt ?? session.createdAt ?? session.performedAt ?? null;

export const resolveDraftSessionDateInput = (
  savedPerformedAt: string | null | undefined,
  now = new Date(),
) => {
  const currentDateInput = getSessionDateInputValue(now);

  if (!savedPerformedAt) {
    return currentDateInput;
  }

  return getSessionDateInputValue(savedPerformedAt) === currentDateInput
    ? getSessionDateInputValue(savedPerformedAt)
    : currentDateInput;
};
