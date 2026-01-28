// HTML Sanitization Utility
// Uses DOMPurify to sanitize AI-generated content

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'
    ],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize plain text by escaping HTML entities
 * Use this for content that should NOT contain any HTML
 * @param text The text to sanitize
 * @returns Escaped text safe for rendering
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sanitize AI response that might contain markdown or HTML
 * Strips all HTML and returns plain text
 * @param response AI-generated response
 * @returns Plain text with HTML stripped
 */
export function sanitizeAiResponse(response: string): string {
  if (!response || typeof response !== 'string') {
    return '';
  }

  // First sanitize with DOMPurify
  const sanitized = DOMPurify.sanitize(response, {
    ALLOWED_TAGS: [], // Strip all HTML
    ALLOWED_ATTR: [],
  });

  // Decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = sanitized;
  return textarea.value;
}

/**
 * Sanitize URL for safe usage
 * @param url The URL to validate and sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.href;
  } catch {
    return '';
  }
}
