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
  // SAFE: textContent assigns plain text only; reading innerHTML returns the
  // browser's entity-encoded version (e.g. "<" → "&lt;"). No user-controlled
  // HTML is ever parsed here.
  div.textContent = text;
  return div.innerHTML;
}

// Element names the HTML parser treats as real markup (HTML + SVG/MathML roots).
// A "<" followed by anything else ("whisk <eggs>", "x<y", "< 5 min") is literal
// recipe text and must survive stripping instead of being swallowed as a tag.
const HTML_TAG_NAMES = new Set([
  'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo',
  'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col',
  'colgroup', 'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'dir', 'div', 'dl',
  'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'frame',
  'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i',
  'iframe', 'image', 'img', 'input', 'ins', 'kbd', 'keygen', 'label', 'legend', 'li', 'link',
  'main', 'map', 'mark', 'marquee', 'math', 'menu', 'meta', 'meter', 'nav', 'noembed',
  'noframes', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param',
  'picture', 'plaintext', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script',
  'search', 'section', 'select', 'slot', 'small', 'source', 'span', 'strike', 'strong', 'style',
  'sub', 'summary', 'sup', 'svg', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th',
  'thead', 'time', 'title', 'tr', 'track', 'tt', 'u', 'ul', 'var', 'video', 'wbr', 'xmp',
]);

// "<" plus what follows it, when that could start markup: an element name the
// parser would accept as a tag ("<p>", "</div", "<img src"), or "<!" / "<?"
// (comments, doctypes, bogus comments).
const MARKUP_START = /<(?:(\/?)([a-zA-Z][a-zA-Z0-9-]*)(?=[\s/>])|([!?]))?/g;

/**
 * Entity-escape every "<" that does not begin real markup, so the HTML parser
 * keeps it as text. Real tags are left alone for DOMPurify to remove.
 */
function escapeLiteralAngleBrackets(input: string): string {
  return input.replace(
    MARKUP_START,
    (match: string, _slash: string | undefined, name: string | undefined, bang: string | undefined, offset: number) => {
      // Markup with no closing ">" makes the parser drop everything to the end
      // of the input, so treat it as text too.
      const closed = input.indexOf('>', offset) !== -1;
      const isMarkup = closed && (bang !== undefined || (name !== undefined && HTML_TAG_NAMES.has(name.toLowerCase())));
      return isMarkup ? match : `&lt;${match.slice(1)}`;
    }
  );
}

function stripMarkup(input: string, decodeEntities: boolean): string {
  // Preserving entities: escape "&" first so "&amp;" typed by a user comes back
  // as "&amp;" rather than "&" (and so our own "&lt;" escapes are not doubled).
  const prepared = escapeLiteralAngleBrackets(decodeEntities ? input : input.replace(/&/g, '&amp;'));

  const sanitized = DOMPurify.sanitize(prepared, {
    ALLOWED_TAGS: [], // Strip all HTML (script/style contents are dropped too)
    ALLOWED_ATTR: [],
  });

  // SAFE: The input to innerHTML is already DOMPurify-cleaned with zero allowed
  // tags/attrs, so all HTML has been stripped. A textarea parses its innerHTML
  // as RCDATA (no elements), and textarea.value decodes the remaining entities
  // (e.g. "&lt;" → "<") into plain text.
  const textarea = document.createElement('textarea');
  textarea.innerHTML = sanitized;
  return textarea.value;
}

/**
 * Sanitize AI response that might contain markdown or HTML
 * Strips all HTML tags and returns plain text. Stray "<" / ">" that are not
 * part of a real tag ("cook until < 165°F", "whisk <eggs>") are kept.
 * The result is plain text: render it as React text, never as HTML.
 * @param response AI-generated response
 * @returns Plain text with HTML stripped
 */
export function sanitizeAiResponse(response: string): string {
  if (!response || typeof response !== 'string') {
    return '';
  }

  return stripMarkup(response, true);
}

/**
 * Strip HTML tags from user-supplied plain text (e.g. recipe fields received
 * in a share link) while keeping every other character exactly as typed,
 * including "&", entity-like text and stray "<" / ">".
 * The result is plain text: render it as React text, never as HTML.
 * @param text Untrusted plain text
 * @returns The text with any HTML tags removed
 */
export function sanitizePlainText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Fast path: without "<" there is no markup to strip.
  if (!text.includes('<')) {
    return text;
  }

  return stripMarkup(text, false);
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

/**
 * Validate an Ollama endpoint URL. Returns whether the URL is valid and
 * whether it points to a non-local server (which is a security concern since
 * all recipe data and conversations are sent to this endpoint).
 */
export function validateOllamaEndpoint(endpoint: string): { valid: boolean; isLocal: boolean; warning?: string } {
  if (!endpoint || typeof endpoint !== 'string') {
    return { valid: false, isLocal: false };
  }

  const sanitized = sanitizeUrl(endpoint);
  if (!sanitized) {
    return { valid: false, isLocal: false };
  }

  try {
    const url = new URL(sanitized);
    const isLocal =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '::1' ||
      url.hostname.startsWith('192.168.') ||
      url.hostname.startsWith('10.') ||
      // RFC 1918 private block 172.16.0.0 – 172.31.255.255
      /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname) ||
      url.hostname.endsWith('.local');

    if (!isLocal) {
      return {
        valid: true,
        isLocal: false,
        warning:
          'This endpoint is not on your local network. All recipe data, cooking context, ' +
          'and conversations will be sent to this remote server.',
      };
    }

    return { valid: true, isLocal: true };
  } catch {
    return { valid: false, isLocal: false };
  }
}
