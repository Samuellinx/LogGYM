import {
  maskDecimalInput,
  maskIntegerInput,
  maskLoadInput,
  maskRepRangeInput,
} from '../src/utils/inputMasks';

describe('input masks', () => {
  it('keeps only digits and one decimal separator for decimal fields', () => {
    expect(maskDecimalInput('20 kg')).toBe('20');
    expect(maskDecimalInput('12,5kg')).toBe('12,5');
    expect(maskDecimalInput('1.2.3')).toBe('1.23');
  });

  it('keeps only digits for integer fields', () => {
    expect(maskIntegerInput('12 reps')).toBe('12');
    expect(maskIntegerInput('a1b2c3')).toBe('123');
  });

  it('keeps only digits and one range separator for rep range fields', () => {
    expect(maskRepRangeInput('8a-1b0')).toBe('8-10');
    expect(maskRepRangeInput('8--10')).toBe('8-10');
    expect(maskRepRangeInput('abc')).toBe('');
  });

  it('allows short text labels for load fields', () => {
    expect(maskLoadInput('2 placas')).toBe('2 placas');
    expect(maskLoadInput('10 KG')).toBe('10 KG');
    expect(maskLoadInput('12 placas')).toBe('12 placa');
    expect(maskLoadInput('2@ placas!')).toBe('2 placas');
  });
});
