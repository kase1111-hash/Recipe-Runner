import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeText, sanitizeAiResponse, sanitizeUrl } from './sanitize';

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
