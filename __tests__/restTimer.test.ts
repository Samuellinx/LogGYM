import {formatRestTimerTime} from '../src/utils/restTimer';
import {formatRestTimerTime as formatWebRestTimerTime} from '../web/src/lib/restTimer';

describe('rest timer formatting', () => {
  it('formats countdown seconds as minute clock text', () => {
    expect(formatRestTimerTime(30)).toBe('0:30');
    expect(formatRestTimerTime(60)).toBe('1:00');
    expect(formatRestTimerTime(125)).toBe('2:05');
    expect(formatRestTimerTime(-4)).toBe('0:00');
  });

  it('keeps mobile and web timer formatting aligned', () => {
    expect(formatWebRestTimerTime(240)).toBe(formatRestTimerTime(240));
  });
});
