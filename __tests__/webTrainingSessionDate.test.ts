import {formatSessionDate} from '../web/src/lib/dashboard';
import {normalizeSessionDateInput} from '../web/src/lib/sessionDate';

describe('web training session date handling', () => {
  it('preserves the selected calendar date when normalizing a date input', () => {
    expect(normalizeSessionDateInput('2026-04-26').startsWith('2026-04-26')).toBe(true);
  });

  it('formats stored ISO strings using the intended calendar date', () => {
    expect(formatSessionDate('2026-04-26T00:00:00.000Z')).toBe('26/04/2026');
  });
});
