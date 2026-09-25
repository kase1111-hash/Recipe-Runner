import { describe, it, expect } from 'vitest';
import {
  parseAmount,
  parseAmountWithUnit,
  parseQuantity,
  parseLeadingQuantity,
  findQuantity,
  formatAmount,
  formatQuantity,
} from './parseAmount';

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

  describe('stops at the end of the leading number', () => {
    it('does not sum the two ends of a range', () => {
      expect(parseAmount('2 to 3')).toBe(2);
      expect(parseAmount('1 or 2')).toBe(1);
      expect(parseAmount('1/2 to 3/4')).toBe(0.5);
      expect(parseAmount('2-3')).toBe(2);
      expect(parseAmount('2 - 3')).toBe(2);
    });

    it('reads a hyphenated mixed number as one number', () => {
      expect(parseAmount('1-1/2')).toBe(1.5);
      expect(parseAmount('2-3/4 cups')).toBe(2.75);
    });

    it('ignores trailing words and numbers', () => {
      expect(parseAmount('2 cups')).toBe(2);
      expect(parseAmount('2 (14 oz) cans')).toBe(2);
      expect(parseAmount('2 3')).toBe(2);
      expect(parseAmount('½ cup plus 1 tbsp')).toBe(0.5);
    });

    it('returns the default when the amount does not start with a number', () => {
      expect(parseAmount('to taste')).toBe(0);
      expect(parseAmount('about 2', 7)).toBe(7);
    });

    it('does not split a bare fraction into a mixed number', () => {
      expect(parseAmount('11/2')).toBe(5.5);
    });

    it('treats a zero denominator as unparseable', () => {
      expect(parseAmount('1/0', 3)).toBe(3);
    });
  });
});

describe('parseQuantity', () => {
  it('parses single numbers with low === high', () => {
    expect(parseQuantity('2')).toEqual({ low: 2, high: 2 });
    expect(parseQuantity('1.5')).toEqual({ low: 1.5, high: 1.5 });
    expect(parseQuantity('.5')).toEqual({ low: 0.5, high: 0.5 });
    expect(parseQuantity('1/2')).toEqual({ low: 0.5, high: 0.5 });
    expect(parseQuantity('1 1/2')).toEqual({ low: 1.5, high: 1.5 });
    expect(parseQuantity('1-1/2')).toEqual({ low: 1.5, high: 1.5 });
    expect(parseQuantity('½')).toEqual({ low: 0.5, high: 0.5 });
    expect(parseQuantity('1½')).toEqual({ low: 1.5, high: 1.5 });
    expect(parseQuantity('1 ½')).toEqual({ low: 1.5, high: 1.5 });
    expect(parseQuantity('1,000')).toEqual({ low: 1000, high: 1000 });
  });

  it('tolerates surrounding whitespace, the fraction slash, and non-breaking spaces', () => {
    expect(parseQuantity('  3  ')).toEqual({ low: 3, high: 3 });
    expect(parseQuantity('1\u20442')).toEqual({ low: 0.5, high: 0.5 });
    expect(parseQuantity('1\u00a01/2')).toEqual({ low: 1.5, high: 1.5 });
  });

  it('parses hyphen and dash ranges', () => {
    expect(parseQuantity('2-3')).toEqual({ low: 2, high: 3 });
    expect(parseQuantity('2 - 3')).toEqual({ low: 2, high: 3 });
    expect(parseQuantity('2–3')).toEqual({ low: 2, high: 3 });
    expect(parseQuantity('2—3')).toEqual({ low: 2, high: 3 });
    expect(parseQuantity('1/2-3/4')).toEqual({ low: 0.5, high: 0.75 });
    expect(parseQuantity('1-2 1/2')).toEqual({ low: 1, high: 2.5 });
    expect(parseQuantity('1 1/2-2')).toEqual({ low: 1.5, high: 2 });
  });

  it('parses word ranges', () => {
    expect(parseQuantity('2 to 3')).toEqual({ low: 2, high: 3 });
    expect(parseQuantity('2 TO 3')).toEqual({ low: 2, high: 3 });
    expect(parseQuantity('1/2 to 3/4')).toEqual({ low: 0.5, high: 0.75 });
    expect(parseQuantity('2 or 3')).toEqual({ low: 2, high: 3 });
    expect(parseQuantity('½ to ¾')).toEqual({ low: 0.5, high: 0.75 });
    expect(parseQuantity('1 1/2 to 2 1/4')).toEqual({ low: 1.5, high: 2.25 });
  });

  it('returns null for anything that is not purely a number or range', () => {
    expect(parseQuantity('to taste')).toBeNull();
    expect(parseQuantity('a pinch')).toBeNull();
    expect(parseQuantity('')).toBeNull();
    expect(parseQuantity('   ')).toBeNull();
    expect(parseQuantity('2 large')).toBeNull();
    expect(parseQuantity('2 cups')).toBeNull();
    expect(parseQuantity('about 2')).toBeNull();
    expect(parseQuantity('2 3')).toBeNull();
    expect(parseQuantity('2 tomatoes')).toBeNull();
  });

  it('rejects zero denominators and backwards ranges', () => {
    expect(parseQuantity('1/0')).toBeNull();
    expect(parseQuantity('3-2')).toBeNull();
    expect(parseQuantity('1 - 1/2')).toBeNull();
  });

  it('handles null/undefined gracefully', () => {
    expect(parseQuantity(null as unknown as string)).toBeNull();
    expect(parseQuantity(undefined as unknown as string)).toBeNull();
  });
});

describe('parseLeadingQuantity', () => {
  it('splits a leading number from trailing text', () => {
    expect(parseLeadingQuantity('2 large')).toEqual({ low: 2, high: 2, rest: ' large' });
    expect(parseLeadingQuantity('1 1/2 (14 oz) cans')).toEqual({ low: 1.5, high: 1.5, rest: ' (14 oz) cans' });
  });

  it('keeps a leading range together', () => {
    expect(parseLeadingQuantity('2-3 medium')).toEqual({ low: 2, high: 3, rest: ' medium' });
    expect(parseLeadingQuantity('2 to 3 large')).toEqual({ low: 2, high: 3, rest: ' large' });
  });

  it('does not treat a word that starts with "to" as a range', () => {
    expect(parseLeadingQuantity('2 tomatoes')).toEqual({ low: 2, high: 2, rest: ' tomatoes' });
  });

  it('returns null when there is no leading number', () => {
    expect(parseLeadingQuantity('to taste')).toBeNull();
    expect(parseLeadingQuantity('')).toBeNull();
  });
});

describe('findQuantity', () => {
  it('finds a number after leading words', () => {
    expect(findQuantity('Serves 4')).toEqual({ low: 4, high: 4, before: 'Serves ', rest: '' });
    expect(findQuantity('Makes 12 cookies')).toEqual({ low: 12, high: 12, before: 'Makes ', rest: ' cookies' });
  });

  it('finds ranges and mixed numbers', () => {
    expect(findQuantity('4-6 servings')).toEqual({ low: 4, high: 6, before: '', rest: ' servings' });
    expect(findQuantity('1 1/2 cups')).toEqual({ low: 1.5, high: 1.5, before: '', rest: ' cups' });
  });

  it('returns null when there is no number', () => {
    expect(findQuantity('a family-sized portion')).toBeNull();
  });
});

describe('formatQuantity', () => {
  it('formats single numbers like formatAmount', () => {
    expect(formatQuantity({ low: 2, high: 2 })).toBe('2');
    expect(formatQuantity({ low: 1.5, high: 1.5 })).toBe('1 1/2');
  });

  it('formats simple ranges with a hyphen', () => {
    expect(formatQuantity({ low: 4, high: 6 })).toBe('4-6');
    expect(formatQuantity({ low: 0.5, high: 0.75 })).toBe('1/2-3/4');
  });

  it('uses "to" when either end is a mixed number', () => {
    expect(formatQuantity({ low: 1, high: 1.5 })).toBe('1 to 1 1/2');
    expect(formatQuantity({ low: 1.5, high: 2 })).toBe('1 1/2 to 2');
  });

  it('round-trips through parseQuantity', () => {
    for (const q of [{ low: 4, high: 6 }, { low: 1, high: 1.5 }, { low: 0.5, high: 0.75 }, { low: 2.25, high: 3.5 }]) {
      expect(parseQuantity(formatQuantity(q))).toEqual(q);
    }
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
