import {formatSessionDate} from '../web/src/lib/dashboard';
import {
  normalizeSessionDateInput,
  resolveDraftSessionDateInput,
} from '../web/src/lib/sessionDate';

describe('web training session date handling', () => {
  it('preserves the selected calendar date when normalizing a date input', () => {
    expect(normalizeSessionDateInput('2026-04-26').startsWith('2026-04-26')).toBe(true);
  });

  it('formats stored ISO strings using the intended calendar date', () => {
    expect(formatSessionDate('2026-04-26T00:00:00.000Z')).toBe('26/04/2026');
  });

  it('does not reuse a stale autosave date when starting a new execution', () => {
    const currentDate = new Date(2026, 4, 5, 9, 30);

    expect(
      resolveDraftSessionDateInput('2026-04-27T15:00:00.000Z', currentDate),
    ).toBe('2026-05-05');
    expect(
      resolveDraftSessionDateInput('2026-05-05T15:00:00.000Z', currentDate),
    ).toBe('2026-05-05');
  });
});
