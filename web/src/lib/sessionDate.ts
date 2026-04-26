const extractCalendarDate = (value: string) => {
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

export const toSessionDate = (value: string) => {
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

export const normalizeSessionDateInput = (value: string) => {
  const calendarDate = extractCalendarDate(value.trim());

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

  return new Date(value.trim()).toISOString();
};
