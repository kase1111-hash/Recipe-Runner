import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeText, sanitizeAiResponse, sanitizePlainText, sanitizeUrl } from './sanitize';

describe('sanitizeHtml', () => {
  it('allows safe HTML tags', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).toContain('Hello');
    expect(result).toContain('world');
  });

  it('removes script tags', () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('script');
    expect(result).not.toContain('alert');
    expect(result).toContain('Hello');
  });

  it('removes dangerous attributes', () => {
    const input = '<p onclick="alert(1)">Click me</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onclick');
    expect(result).toContain('Click me');
  });

  it('removes iframe tags', () => {
    const input = '<iframe src="evil.com"></iframe>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('iframe');
    expect(result).not.toContain('evil.com');
  });

  it('returns empty string for null/undefined', () => {
    expect(sanitizeHtml(null as unknown as string)).toBe('');
    expect(sanitizeHtml(undefined as unknown as string)).toBe('');
    expect(sanitizeHtml('')).toBe('');
  });
});

describe('sanitizeText', () => {
  it('escapes HTML entities', () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitizeText(input);
    expect(result).toContain('&lt;script&gt;');
    expect(result).not.toContain('<script>');
  });

  it('preserves plain text', () => {
    const input = 'Hello, world!';
    const result = sanitizeText(input);
    expect(result).toBe('Hello, world!');
  });

  it('escapes special characters', () => {
    const input = 'Tom & Jerry <3';
    const result = sanitizeText(input);
    expect(result).toContain('&amp;');
    expect(result).toContain('&lt;');
  });

  it('returns empty string for null/undefined', () => {
    expect(sanitizeText(null as unknown as string)).toBe('');
    expect(sanitizeText(undefined as unknown as string)).toBe('');
  });
});

describe('sanitizeAiResponse', () => {
  it('strips all HTML from AI responses', () => {
    const input = '<p>Use <b>1 cup</b> of flour</p>';
    const result = sanitizeAiResponse(input);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).toContain('1 cup');
    expect(result).toContain('flour');
  });

  it('removes malicious content', () => {
    const input = 'Add flour<script>document.cookie</script> and sugar';
    const result = sanitizeAiResponse(input);
    expect(result).not.toContain('script');
    expect(result).not.toContain('cookie');
    expect(result).toContain('Add flour');
    expect(result).toContain('sugar');
  });

  it('preserves text content', () => {
    const input = 'Mix 1/2 cup of flour with 1 tsp salt';
    const result = sanitizeAiResponse(input);
    expect(result).toBe(input);
  });

  it('returns empty string for null/undefined', () => {
    expect(sanitizeAiResponse(null as unknown as string)).toBe('');
    expect(sanitizeAiResponse(undefined as unknown as string)).toBe('');
  });

  it('keeps stray angle brackets that are not real tags', () => {
    expect(sanitizeAiResponse('whisk <eggs>')).toBe('whisk <eggs>');
    expect(sanitizeAiResponse('x<y and y>z')).toBe('x<y and y>z');
    expect(sanitizeAiResponse('cook until < 165°F, then rest > 5 min')).toBe('cook until < 165°F, then rest > 5 min');
    expect(sanitizeAiResponse('I <3 butter')).toBe('I <3 butter');
  });

  it('keeps text after an unclosed tag-like fragment', () => {
    expect(sanitizeAiResponse('bring to <a rolling boil')).toBe('bring to <a rolling boil');
  });

  it('still strips real tags mixed with stray brackets', () => {
    const result = sanitizeAiResponse('whisk <eggs> <b>well</b><script>alert(1)</script> until x<y');
    expect(result).toBe('whisk <eggs> well until x<y');
  });

  it('strips tags regardless of case and attributes', () => {
    const result = sanitizeAiResponse('a<SCRIPT type="text/javascript">steal()</SCRIPT>b<img src=x onerror="a>b">c');
    expect(result).not.toContain('steal');
    expect(result).not.toContain('onerror');
    expect(result).not.toMatch(/<img/i);
    expect(result).toContain('a');
    expect(result).toContain('c');
  });

  it('strips comments', () => {
    expect(sanitizeAiResponse('salt<!-- hidden -->pepper')).toBe('saltpepper');
  });
});

describe('sanitizePlainText', () => {
  it('returns plain text unchanged', () => {
    const input = 'Fold in ½ cup flour — bake at 180°C (350°F) 🍰';
    expect(sanitizePlainText(input)).toBe(input);
  });

  it('preserves ampersands and entity-looking text exactly', () => {
    expect(sanitizePlainText('Salt & pepper')).toBe('Salt & pepper');
    expect(sanitizePlainText('Tom &amp; Jerry <3')).toBe('Tom &amp; Jerry <3');
  });

  it('keeps stray angle brackets', () => {
    expect(sanitizePlainText('whisk <eggs>')).toBe('whisk <eggs>');
    expect(sanitizePlainText('x<y and y>z')).toBe('x<y and y>z');
  });

  it('removes real tags and script content', () => {
    const result = sanitizePlainText('Chop <b>onions</b><script>alert("xss")</script> finely<iframe src="evil.com"></iframe>');
    expect(result).toBe('Chop onions finely');
  });

  it('returns empty string for null/undefined', () => {
    expect(sanitizePlainText(null as unknown as string)).toBe('');
    expect(sanitizePlainText(undefined as unknown as string)).toBe('');
  });
});

describe('sanitizeUrl', () => {
  it('allows valid http URLs', () => {
    const url = 'http://example.com/recipe';
    expect(sanitizeUrl(url)).toBe(url);
  });

  it('allows valid https URLs', () => {
    const url = 'https://example.com/recipe?id=123';
    expect(sanitizeUrl(url)).toBe(url);
  });

  it('rejects javascript: URLs', () => {
    const url = 'javascript:alert(1)';
    expect(sanitizeUrl(url)).toBe('');
  });

  it('rejects data: URLs', () => {
    const url = 'data:text/html,<script>alert(1)</script>';
    expect(sanitizeUrl(url)).toBe('');
  });

  it('rejects invalid URLs', () => {
    expect(sanitizeUrl('not a url')).toBe('');
    expect(sanitizeUrl('ftp://example.com')).toBe('');
  });

  it('returns empty string for null/undefined', () => {
    expect(sanitizeUrl(null as unknown as string)).toBe('');
    expect(sanitizeUrl(undefined as unknown as string)).toBe('');
  });
});
