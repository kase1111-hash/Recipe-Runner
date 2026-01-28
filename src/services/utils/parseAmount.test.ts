import { describe, it, expect } from 'vitest';
import { parseAmount, parseAmountWithUnit, formatAmount } from './parseAmount';

describe('parseAmount', () => {
  describe('whole numbers', () => {
    it('parses simple whole numbers', () => {
      expect(parseAmount('1')).toBe(1);
      expect(parseAmount('2')).toBe(2);
      expect(parseAmount('10')).toBe(10);
      expect(parseAmount('100')).toBe(100);
    });

    it('parses decimal numbers', () => {
      expect(parseAmount('1.5')).toBe(1.5);
      expect(parseAmount('0.25')).toBe(0.25);
      expect(parseAmount('2.75')).toBe(2.75);
    });
  });

  describe('ASCII fractions', () => {
    it('parses simple fractions', () => {
      expect(parseAmount('1/2')).toBe(0.5);
      expect(parseAmount('1/4')).toBe(0.25);
      expect(parseAmount('3/4')).toBe(0.75);
      expect(parseAmount('1/3')).toBeCloseTo(0.333, 2);
      expect(parseAmount('2/3')).toBeCloseTo(0.667, 2);
    });

    it('parses mixed numbers', () => {
      expect(parseAmount('1 1/2')).toBe(1.5);
      expect(parseAmount('2 1/4')).toBe(2.25);
      expect(parseAmount('3 3/4')).toBe(3.75);
      expect(parseAmount('1 1/3')).toBeCloseTo(1.333, 2);
    });
  });

  describe('unicode fractions', () => {
    it('parses simple unicode fractions', () => {
      expect(parseAmount('½')).toBe(0.5);
      expect(parseAmount('¼')).toBe(0.25);
      expect(parseAmount('¾')).toBe(0.75);
      expect(parseAmount('⅓')).toBeCloseTo(0.333, 2);
      expect(parseAmount('⅔')).toBeCloseTo(0.667, 2);
    });

    it('parses mixed numbers with unicode fractions', () => {
      expect(parseAmount('1½')).toBe(1.5);
      expect(parseAmount('2¼')).toBe(2.25);
      expect(parseAmount('3¾')).toBe(3.75);
    });

    it('parses less common unicode fractions', () => {
      expect(parseAmount('⅛')).toBe(0.125);
      expect(parseAmount('⅜')).toBe(0.375);
      expect(parseAmount('⅝')).toBe(0.625);
      expect(parseAmount('⅞')).toBe(0.875);
      expect(parseAmount('⅕')).toBe(0.2);
      expect(parseAmount('⅖')).toBe(0.4);
    });
  });

  describe('edge cases', () => {
    it('returns default value for empty string', () => {
      expect(parseAmount('')).toBe(0);
      expect(parseAmount('', 1)).toBe(1);
    });

    it('returns default value for invalid input', () => {
      expect(parseAmount('abc')).toBe(0);
      expect(parseAmount('abc', 5)).toBe(5);
    });

    it('handles whitespace', () => {
      expect(parseAmount('  1  ')).toBe(1);
      expect(parseAmount('  1/2  ')).toBe(0.5);
      expect(parseAmount('  1  1/2  ')).toBe(1.5);
    });

    it('handles null/undefined gracefully', () => {
      expect(parseAmount(null as unknown as string)).toBe(0);
      expect(parseAmount(undefined as unknown as string)).toBe(0);
    });
  });
});

describe('parseAmountWithUnit', () => {
  it('extracts value and unit from amount string', () => {
    const result = parseAmountWithUnit('2 cups');
    expect(result.value).toBe(2);
    expect(result.unit).toBe('cups');
    expect(result.original).toBe('2 cups');
  });

  it('handles fractions with units', () => {
    const result = parseAmountWithUnit('1/2 cup');
    expect(result.value).toBe(0.5);
    expect(result.unit).toBe('cup');
  });

  it('handles amount without unit', () => {
    const result = parseAmountWithUnit('3');
    expect(result.value).toBe(3);
    expect(result.unit).toBe('');
  });
});

describe('formatAmount', () => {
  it('formats whole numbers', () => {
    expect(formatAmount(1)).toBe('1');
    expect(formatAmount(2)).toBe('2');
    expect(formatAmount(10)).toBe('10');
  });

  it('formats common fractions', () => {
    expect(formatAmount(0.5)).toBe('1/2');
    expect(formatAmount(0.25)).toBe('1/4');
    expect(formatAmount(0.75)).toBe('3/4');
  });

  it('formats mixed numbers', () => {
    expect(formatAmount(1.5)).toBe('1 1/2');
    expect(formatAmount(2.25)).toBe('2 1/4');
    expect(formatAmount(3.75)).toBe('3 3/4');
  });

  it('formats values that are close to fractions', () => {
    // Values close to known fractions get formatted as fractions
    expect(formatAmount(1.3)).toBe('1 1/3');  // Close to 1/3 (0.333)
    expect(formatAmount(0.15)).toBe('1/8');   // Close to 0.125
    expect(formatAmount(1.7)).toBe('1 2/3');  // Close to 2/3 (0.666)
    expect(formatAmount(1.9)).toBe('1 7/8');  // Close to 7/8 (0.875)
    expect(formatAmount(2.1)).toBe('2 1/8');  // Close to 1/8 (0.125)
  });

  it('formats values that are not close to any fraction as decimals', () => {
    expect(formatAmount(0.07)).toBe('0.07');  // Not close to any fraction
    expect(formatAmount(1.43)).toBe('1.4');   // Not close to any fraction
    expect(formatAmount(0.55)).toBe('0.55');  // Not within 0.05 tolerance of 0.5
    expect(formatAmount(0.52)).toBe('1/2');   // Within tolerance of 0.5
  });

  it('handles zero', () => {
    expect(formatAmount(0)).toBe('0');
  });
});
