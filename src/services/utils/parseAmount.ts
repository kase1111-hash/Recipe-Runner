// Shared Amount Parsing Utility
// Handles fractions, unicode fractions, and mixed numbers

/**
 * Unicode fraction mapping
 */
const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '⅓': 1/3,
  '⅔': 2/3,
  '¼': 0.25,
  '¾': 0.75,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
  '⅙': 1/6,
  '⅚': 5/6,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

export interface ParsedAmount {
  value: number;
  unit: string;
  original: string;
}

/**
 * Parse an amount string that may contain:
 * - Whole numbers: "2", "10"
 * - Fractions: "1/2", "3/4"
 * - Mixed numbers: "1 1/2", "2 3/4"
 * - Unicode fractions: "½", "¾", "1½"
 * - Decimals: "1.5", "0.25"
 *
 * @param amount The amount string to parse
 * @param defaultValue Value to return if parsing fails (default: 0)
 * @returns Parsed numeric value
 */
export function parseAmount(amount: string, defaultValue: number = 0): number {
  if (!amount || typeof amount !== 'string') {
    return defaultValue;
  }

  let value = 0;
  let remaining = amount.trim();

  // First, replace unicode fractions with their decimal values
  for (const [unicode, decimal] of Object.entries(UNICODE_FRACTIONS)) {
    if (remaining.includes(unicode)) {
      // Check if there's a whole number before the unicode fraction
      const match = remaining.match(new RegExp(`(\\d+)?\\s*${unicode}`));
      if (match) {
        const whole = match[1] ? parseInt(match[1], 10) : 0;
        value += whole + decimal;
        remaining = remaining.replace(match[0], '').trim();
      }
    }
  }

  // Handle remaining parts (whole numbers and ASCII fractions)
  const parts = remaining.split(/\s+/).filter(p => p.length > 0);

  for (const part of parts) {
    if (part.includes('/')) {
      // Handle ASCII fractions like "1/2", "3/4"
      const [num, denom] = part.split('/').map(Number);
      if (!isNaN(num) && !isNaN(denom) && denom !== 0) {
        value += num / denom;
      }
    } else {
      // Handle whole numbers and decimals
      const num = parseFloat(part);
      if (!isNaN(num)) {
        value += num;
      }
    }
  }

  return value || defaultValue;
}

/**
 * Parse amount with unit extraction
 * @param amount The amount string with optional unit
 * @returns ParsedAmount object with value, unit, and original string
 */
export function parseAmountWithUnit(amount: string): ParsedAmount {
  const original = amount;
  const value = parseAmount(amount, 0);

  // Extract unit if present (letters at end)
  const unitMatch = amount.match(/[a-zA-Z]+$/);
  const unit = unitMatch ? unitMatch[0] : '';

  return { value, unit, original };
}

/**
 * Format a numeric amount back to a nice fraction string
 * @param value The numeric value to format
 * @returns Formatted string with fractions where appropriate
 */
export function formatAmount(value: number): string {
  const fractions: Record<number, string> = {
    0.125: '1/8',
    0.25: '1/4',
    0.333: '1/3',
    0.375: '3/8',
    0.5: '1/2',
    0.625: '5/8',
    0.666: '2/3',
    0.667: '2/3',
    0.75: '3/4',
    0.875: '7/8',
  };

  if (value === 0) return '0';

  const whole = Math.floor(value);
  const decimal = value - whole;

  // Find closest fraction
  let closestFraction = '';
  let minDiff = 0.05; // Tolerance

  for (const [key, frac] of Object.entries(fractions)) {
    const diff = Math.abs(decimal - parseFloat(key));
    if (diff < minDiff) {
      minDiff = diff;
      closestFraction = frac;
    }
  }

  if (whole === 0 && closestFraction) {
    return closestFraction;
  } else if (closestFraction) {
    return `${whole} ${closestFraction}`;
  } else if (Number.isInteger(value)) {
    return value.toString();
  } else {
    // Round to reasonable precision
    return value.toFixed(value < 1 ? 2 : 1).replace(/\.?0+$/, '');
  }
}
