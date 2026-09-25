// Shared Amount Parsing Utility
// Handles fractions, unicode fractions, mixed numbers, and ranges

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

/** A numeric quantity: low === high for a single number, low < high for a range */
export interface Quantity {
  low: number;
  high: number;
}

// ============================================
// Number grammar
// ============================================
// One number is (alternatives tried in this order, so the longest reading wins):
//   mixed with ASCII fraction:   "1 1/2", "1-1/2"
//   mixed with unicode fraction: "1½", "1 ½"
//   plain fraction:              "1/2", "½"
//   decimal / integer:           "1,000", "1.5", ".5", "2"
// A range is two numbers joined by "-", "–", "—", "to" or "or".

const UNICODE_CLASS = `[${Object.keys(UNICODE_FRACTIONS).join('')}]`;
const NUMBER_SOURCE =
  '(?:\\d+(?:\\s+|-)\\d+/\\d+' +
  `|\\d+(?:\\s+|-)?${UNICODE_CLASS}` +
  '|\\d+/\\d+' +
  `|${UNICODE_CLASS}` +
  '|\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?' +
  '|\\d+(?:\\.\\d+)?' +
  '|\\.\\d+)';
const RANGE_SEPARATOR_SOURCE = '(?:\\s*[-\\u2013\\u2014]\\s*|\\s+(?:to|or)\\s+)';
const QUANTITY_SOURCE = `(${NUMBER_SOURCE})(?:${RANGE_SEPARATOR_SOURCE}(${NUMBER_SOURCE}))?`;

const WHOLE_QUANTITY = new RegExp(`^${QUANTITY_SOURCE}$`, 'i');
const LEADING_QUANTITY = new RegExp(`^${QUANTITY_SOURCE}`, 'i');
const ANY_QUANTITY = new RegExp(QUANTITY_SOURCE, 'i');
const LEADING_NUMBER = new RegExp(`^${NUMBER_SOURCE}`);
const UNICODE_TOKEN = new RegExp(`^(\\d+)?(?:\\s+|-)?(${UNICODE_CLASS})$`);
const FRACTION_TOKEN = /^(?:(\d+)(?:\s+|-))?(\d+)\/(\d+)$/;

/** Trim, and turn the fraction slash (⁄) into "/" and non-breaking spaces into spaces */
function normalizeAmountText(text: string): string {
  return text.replace(/\u2044/g, '/').replace(/\u00a0/g, ' ').trim();
}

/** Numeric value of one token matched by NUMBER_SOURCE (NaN if it can't be evaluated) */
function numberTokenValue(token: string): number {
  const unicodeMatch = token.match(UNICODE_TOKEN);
  if (unicodeMatch) {
    const whole = unicodeMatch[1] ? parseInt(unicodeMatch[1], 10) : 0;
    return whole + UNICODE_FRACTIONS[unicodeMatch[2]];
  }

  const fractionMatch = token.match(FRACTION_TOKEN);
  if (fractionMatch) {
    const whole = fractionMatch[1] ? parseInt(fractionMatch[1], 10) : 0;
    const denominator = parseInt(fractionMatch[3], 10);
    if (denominator === 0) return NaN;
    return whole + parseInt(fractionMatch[2], 10) / denominator;
  }

  return parseFloat(token.replace(/,/g, ''));
}

/** Turn a QUANTITY_SOURCE match into a Quantity, or null if it isn't a sane number/range */
function quantityFromMatch(match: RegExpMatchArray): Quantity | null {
  const low = numberTokenValue(match[1]);
  const high = match[2] !== undefined ? numberTokenValue(match[2]) : low;
  // A "range" that runs backwards ("3-2") is more likely a typo than a quantity
  if (!Number.isFinite(low) || !Number.isFinite(high) || high < low) return null;
  return { low, high };
}

/**
 * Strictly parse an ENTIRE amount string as a single number or a range.
 *
 * Numbers: "2", "1.5", "1/2", "1 1/2", "1-1/2", "½", "1½"
 * Ranges:  "2-3", "2 - 3", "2–3", "2 to 3", "1/2 to 3/4", "2 or 3"
 *
 * Returns { low, high } (low === high for a single number), or null when the
 * string is anything else: "to taste", "a pinch", "", "2 large".
 */
export function parseQuantity(amount: string): Quantity | null {
  if (!amount || typeof amount !== 'string') return null;
  const match = normalizeAmountText(amount).match(WHOLE_QUANTITY);
  return match ? quantityFromMatch(match) : null;
}

/**
 * Parse a number or range at the START of a string and return the remaining
 * text verbatim: "2 large" → { low: 2, high: 2, rest: " large" }.
 * Returns null if the string doesn't begin with a quantity.
 */
export function parseLeadingQuantity(amount: string): (Quantity & { rest: string }) | null {
  if (!amount || typeof amount !== 'string') return null;
  const text = normalizeAmountText(amount);
  const match = text.match(LEADING_QUANTITY);
  if (!match) return null;
  const quantity = quantityFromMatch(match);
  return quantity ? { ...quantity, rest: text.slice(match[0].length) } : null;
}

/**
 * Find the first number or range anywhere in a string (e.g. a yield like
 * "Serves 4-6"), along with the text before and after it.
 */
export function findQuantity(text: string): (Quantity & { before: string; rest: string }) | null {
  if (!text || typeof text !== 'string') return null;
  const normalized = normalizeAmountText(text);
  const match = normalized.match(ANY_QUANTITY);
  if (!match || match.index === undefined) return null;
  const quantity = quantityFromMatch(match);
  if (!quantity) return null;
  return {
    ...quantity,
    before: normalized.slice(0, match.index),
    rest: normalized.slice(match.index + match[0].length),
  };
}

/**
 * Parse the LEADING number of an amount string. Handles:
 * - Whole numbers: "2", "10"
 * - Fractions: "1/2", "3/4"
 * - Mixed numbers: "1 1/2", "2 3/4", "1-1/2"
 * - Unicode fractions: "½", "¾", "1½"
 * - Decimals: "1.5", "0.25"
 *
 * Parsing stops at the first thing that isn't part of that number, so
 * "2 to 3" → 2 and "2 cups" → 2. Use parseQuantity() to understand ranges or
 * to reject amounts that aren't purely numeric.
 *
 * @param amount The amount string to parse
 * @param defaultValue Value to return if parsing fails (default: 0)
 * @returns Parsed numeric value
 */
export function parseAmount(amount: string, defaultValue: number = 0): number {
  if (!amount || typeof amount !== 'string') {
    return defaultValue;
  }

  const match = normalizeAmountText(amount).match(LEADING_NUMBER);
  if (!match) return defaultValue;

  const value = numberTokenValue(match[0]);
  return Number.isFinite(value) && value !== 0 ? value : defaultValue;
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

/**
 * Format a Quantity: "2", "1 1/2", or a range. Ranges use "-" between plain
 * numbers ("4-6") and " to " when either end is a mixed number
 * ("1 1/2 to 2") so the result stays readable and re-parses the same way.
 */
export function formatQuantity(quantity: Quantity): string {
  const low = formatAmount(quantity.low);
  if (quantity.high === quantity.low) return low;
  const high = formatAmount(quantity.high);
  if (low === high) return low;
  return low.includes(' ') || high.includes(' ') ? `${low} to ${high}` : `${low}-${high}`;
}
