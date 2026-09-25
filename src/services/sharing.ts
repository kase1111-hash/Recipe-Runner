// Social Sharing Service
// Phase 7 Feature - Share recipes with others

import { v4 as uuid } from 'uuid';
import type {
  CourseType,
  DifficultyScore,
  Ingredient,
  Recipe,
  SafeTemp,
  Source,
  SourceType,
  Step,
  Temperature,
} from '../types';
import { CourseTypeLabels } from '../types';
import { exportRecipe, type ExportFormat, type ExportOptions } from './export';
import { sanitizePlainText, sanitizeUrl } from './utils/sanitize';

// ============================================
// Types
// ============================================

export type SharedStep = Omit<Step, 'index' | 'visual_prompt'>;

/**
 * The recipe content carried inside a share link.
 *
 * Left out on purpose:
 * - id, cookbook_id, created_at, modified_at, favorite: local to the sharer's device
 * - cook_history: the sharer's personal cook log (dates, ratings, cook notes)
 * - step index: positional, rebuilt on import
 * - step visual_prompt: regenerable AI image-prompt data that is never shown
 *   while cooking and would roughly double the link length
 *
 * `notes` is kept: it holds the recipe's own notes (from the source or the
 * editor). Per-cook notes live in cook_history, which is never shared.
 */
export interface SharedRecipeData {
  name: string;
  description: string;
  total_time: string;
  active_time: string;
  yield: string;
  difficulty: DifficultyScore;
  safe_temp: SafeTemp | null;
  equipment: string[];
  tags: string[];
  course_type: CourseType | null;
  cuisine: string | null;
  source: Source;
  ingredients: Ingredient[];
  steps: SharedStep[];
  notes: string;
}

// ============================================
// Share Links (self-contained, no server)
// ============================================
//
// A share link carries the whole recipe in the URL fragment:
//   https://<origin>/shared#<payload>
// The fragment is never sent to the web server, so links work on any device
// without a backend and the host never sees the recipe. The payload is a
// 2-character header followed by base64url data:
//   "1z" + base64url(deflate-raw(UTF-8 JSON))   when CompressionStream exists
//   "1j" + base64url(UTF-8 JSON)                fallback / tiny recipes
// "1" is the payload version; bump it if the JSON shape ever changes
// incompatibly so old links can still be told apart.

export const SHARE_LINK_PATH = '/shared';

const PAYLOAD_VERSION = '1';
const FORMAT_DEFLATE = 'z';
const FORMAT_JSON = 'j';

// Hard limits applied before any parsing, so a hostile link can't make us
// allocate unbounded memory (e.g. a deflate "zip bomb").
const MAX_PAYLOAD_LENGTH = 300_000;  // characters after the "#"
const MAX_JSON_BYTES = 512 * 1024;   // decoded/decompressed JSON size

// Caps applied to the decoded recipe. Generous for real recipes; anything
// longer is truncated rather than rejected.
const LIMITS = {
  name: 200,
  shortText: 200,     // times, yield, amounts, units, tags, equipment, cuisine
  mediumText: 1_000,  // ingredient item/prep, step titles, temperature notes
  longText: 5_000,    // description, instructions, tips
  notes: 10_000,
  url: 2_000,
  ingredients: 200,
  steps: 200,
  listItems: 50,      // equipment, tags, substitutes
  maxMinutes: 60 * 24 * 365,  // fermentation/preservation can take months
  maxTemperature: 1_000,
};

const SOURCE_TYPES: readonly SourceType[] = ['book', 'url', 'original', 'pdf', 'ocr'];
const TEMP_UNITS: readonly SafeTemp['unit'][] = ['°F', '°C'];

/**
 * Build a self-contained share link for a recipe.
 * Rejects only if the recipe itself is unusable (no name, or stored data of
 * the wrong shape), so a link we hand out always decodes on the other end.
 */
export async function createShareLink(recipe: Recipe): Promise<string> {
  const data = validateSharedRecipe(pickShareFields(recipe));
  if (!data) {
    throw new Error('This recipe is missing required information and cannot be shared.');
  }
  const payload = await encodeSharedRecipe(data);
  return `${window.location.origin}${SHARE_LINK_PATH}#${payload}`;
}

/**
 * Return the share payload if `location` is a share link, otherwise null.
 * Pass `window.location`.
 */
export function getSharePayloadFromLocation(location: { pathname: string; hash: string }): string | null {
  const path = location.pathname.replace(/\/+$/, '');
  if (path !== SHARE_LINK_PATH) return null;
  return location.hash.replace(/^#/, '');
}

/**
 * Encode already-validated recipe data as a share payload (the part after "#").
 */
export async function encodeSharedRecipe(data: SharedRecipeData): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(compact(data)));

  if (typeof CompressionStream === 'function') {
    try {
      const deflated = await transformBytes(json, new CompressionStream('deflate-raw'), Infinity);
      // Tiny recipes can come out larger after compression; keep the shorter one.
      if (deflated && deflated.byteLength < json.byteLength) {
        return PAYLOAD_VERSION + FORMAT_DEFLATE + toBase64Url(deflated);
      }
    } catch {
      // Fall through to the uncompressed format
    }
  }

  return PAYLOAD_VERSION + FORMAT_JSON + toBase64Url(json);
}

/**
 * Decode a share payload (the part after "#", with or without the "#").
 * Never throws: truncated, tampered or garbage input resolves to null.
 */
export async function decodeSharedRecipe(payload: string): Promise<SharedRecipeData | null> {
  try {
    if (typeof payload !== 'string') return null;
    const trimmed = payload.trim().replace(/^#/, '');
    if (trimmed.length < 3 || trimmed.length > MAX_PAYLOAD_LENGTH) return null;
    if (trimmed[0] !== PAYLOAD_VERSION) return null;

    const raw = fromBase64Url(trimmed.slice(2));
    if (!raw) return null;

    let json: Uint8Array | null;
    switch (trimmed[1]) {
      case FORMAT_DEFLATE:
        // Browsers without DecompressionStream can't open compressed links
        if (typeof DecompressionStream !== 'function') return null;
        json = await transformBytes(raw, new DecompressionStream('deflate-raw'), MAX_JSON_BYTES);
        break;
      case FORMAT_JSON:
        json = raw.byteLength <= MAX_JSON_BYTES ? raw : null;
        break;
      default:
        return null;
    }
    if (!json) return null;

    const text = new TextDecoder('utf-8', { fatal: true }).decode(json);
    return validateSharedRecipe(JSON.parse(text));
  } catch {
    return null;
  }
}

/**
 * Turn decoded share data into a new Recipe owned by the recipient.
 */
export function createRecipeFromShared(data: SharedRecipeData, cookbookId: string): Recipe {
  const now = new Date().toISOString();

  return {
    id: uuid(),
    cookbook_id: cookbookId,
    name: data.name,
    description: data.description,
    total_time: data.total_time,
    active_time: data.active_time,
    yield: data.yield,
    difficulty: { ...data.difficulty },
    safe_temp: data.safe_temp ? { ...data.safe_temp } : null,
    equipment: [...data.equipment],
    tags: [...data.tags],
    course_type: data.course_type,
    cuisine: data.cuisine,
    source: { ...data.source },
    ingredients: data.ingredients.map((ing) => ({ ...ing, substitutes: [...ing.substitutes] })),
    steps: data.steps.map((step, index) => ({
      ...step,
      temperature: step.temperature ? { ...step.temperature } : null,
      index,
      visual_prompt: '',
    })),
    notes: data.notes,
    created_at: now,
    modified_at: now,
    cook_history: [],
  };
}

// --------------------------------------------
// Payload helpers
// --------------------------------------------

function pickShareFields(recipe: Recipe): Record<string, unknown> {
  return {
    name: recipe.name,
    description: recipe.description,
    total_time: recipe.total_time,
    active_time: recipe.active_time,
    yield: recipe.yield,
    difficulty: recipe.difficulty,
    safe_temp: recipe.safe_temp,
    equipment: recipe.equipment,
    tags: recipe.tags,
    course_type: recipe.course_type,
    cuisine: recipe.cuisine,
    source: recipe.source,
    ingredients: recipe.ingredients,
    steps: recipe.steps?.map((step) => ({
      title: step.title,
      instruction: step.instruction,
      time_minutes: step.time_minutes,
      time_display: step.time_display,
      type: step.type,
      tip: step.tip,
      temperature: step.temperature,
      timer_default: step.timer_default,
    })),
    notes: recipe.notes,
  };
}

// Drop empty values ('' / null / false) from objects so links stay short.
// The decoder restores every one of them as a default. Arrays are kept even
// when empty, because `ingredients` and `steps` must be present.
function compact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compact);
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry === undefined || entry === null || entry === '' || entry === false) continue;
      out[key] = compact(entry);
    }
    return out;
  }
  return value;
}

/**
 * Run bytes through a (de)compression stream. Resolves to null if the output
 * would exceed `maxOutput` bytes; rejects if the input is corrupt.
 */
async function transformBytes(
  bytes: Uint8Array<ArrayBuffer>,
  transform: CompressionStream | DecompressionStream,
  maxOutput: number
): Promise<Uint8Array<ArrayBuffer> | null> {
  const writer = transform.writable.getWriter();
  // Errors surface on the readable side; silence the writer's copies of them.
  writer.write(bytes).catch(() => {});
  writer.close().catch(() => {});

  const reader = transform.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxOutput) {
      reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;  // stay well under engine argument-count limits
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  // A length of 1 mod 4 can never come from base64 encoding
  if (!/^[A-Za-z0-9_-]+$/.test(text) || text.length % 4 === 1) return null;
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// --------------------------------------------
// Validation
// --------------------------------------------
//
// Policy: a value of the wrong JSON type (e.g. a number where a string is
// expected, or a non-object ingredient) rejects the whole payload, since our
// encoder never produces one. Missing/empty optional values get defaults,
// unknown enum values fall back to a safe default, over-long text and lists
// are truncated, and every string has HTML tags and control characters removed.

class InvalidShareData extends Error {}

function invalid(): never {
  throw new InvalidShareData();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// C0 controls except tab (\u0009) and newline (\u000A), plus DEL
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F]/g;

function cleanText(value: string, max: number): string {
  const text = sanitizePlainText(value.replace(/\r\n?/g, '\n').replace(CONTROL_CHARS, '')).trim();
  if (text.length <= max) return text;
  // Don't leave half of a surrogate pair (e.g. an emoji) at the cut
  const cut = text.slice(0, max);
  return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut;
}

function readText(obj: Record<string, unknown>, key: string, max: number, fallback = ''): string {
  const value = obj[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') invalid();
  return cleanText(value, max) || fallback;
}

function readOptionalText(obj: Record<string, unknown>, key: string, max: number): string | null {
  return readText(obj, key, max) || null;
}

function readNumber(obj: Record<string, unknown>, key: string, min: number, max: number, fallback: number): number {
  const value = obj[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) invalid();
  return Math.min(max, Math.max(min, value));
}

function readBoolean(obj: Record<string, unknown>, key: string): boolean {
  const value = obj[key];
  if (value === undefined || value === null) return false;
  if (typeof value !== 'boolean') invalid();
  return value;
}

function readTextList(obj: Record<string, unknown>, key: string, maxItems: number, maxLength: number): string[] {
  const value = obj[key];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) invalid();
  return value
    .slice(0, maxItems)
    .map((entry) => {
      if (typeof entry !== 'string') invalid();
      return cleanText(entry, maxLength);
    })
    .filter(Boolean);
}

function readObjectList(obj: Record<string, unknown>, key: string, maxItems: number): Record<string, unknown>[] {
  const value = obj[key];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) invalid();
  return value.slice(0, maxItems).map((entry) => (isRecord(entry) ? entry : invalid()));
}

function readRecord(obj: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = obj[key];
  if (value === undefined || value === null) return null;
  return isRecord(value) ? value : invalid();
}

function readDifficulty(obj: Record<string, unknown>): DifficultyScore {
  const raw = readRecord(obj, 'difficulty') ?? {};
  // Scores are whole numbers 1-5 (DifficultyLabels is keyed by integer)
  const score = (key: keyof DifficultyScore) => Math.round(readNumber(raw, key, 1, 5, 3));
  return {
    overall: score('overall'),
    technique: score('technique'),
    timing: score('timing'),
    ingredients: score('ingredients'),
    equipment: score('equipment'),
  };
}

function readTempUnit(obj: Record<string, unknown>): SafeTemp['unit'] | null {
  const unit = readText(obj, 'unit', LIMITS.shortText);
  return TEMP_UNITS.includes(unit as SafeTemp['unit']) ? (unit as SafeTemp['unit']) : null;
}

function readSafeTemp(obj: Record<string, unknown>): SafeTemp | null {
  const raw = readRecord(obj, 'safe_temp');
  if (!raw) return null;
  const unit = readTempUnit(raw);
  const value = readNumber(raw, 'value', -LIMITS.maxTemperature, LIMITS.maxTemperature, NaN);
  if (!unit || Number.isNaN(value)) return null;
  return { value, unit, location: readText(raw, 'location', LIMITS.mediumText) };
}

function readTemperature(obj: Record<string, unknown>): Temperature | null {
  const raw = readRecord(obj, 'temperature');
  if (!raw) return null;
  const unit = readTempUnit(raw);
  const value = readNumber(raw, 'value', -LIMITS.maxTemperature, LIMITS.maxTemperature, NaN);
  if (!unit || Number.isNaN(value)) return null;
  const target = readText(raw, 'target', LIMITS.shortText);
  return target ? { value, unit, target } : { value, unit };
}

function readSource(obj: Record<string, unknown>): Source {
  const raw = readRecord(obj, 'source');
  if (!raw) return { type: 'original' };
  const type = readText(raw, 'type', LIMITS.shortText);
  const source: Source = { type: SOURCE_TYPES.includes(type as SourceType) ? (type as SourceType) : 'original' };
  const title = readText(raw, 'title', LIMITS.mediumText);
  if (title) source.title = title;
  const page = readNumber(raw, 'page', 0, 100_000, 0);
  if (page > 0) source.page = Math.round(page);
  // Only http(s) URLs survive; anything else (javascript:, data:) is dropped
  const url = sanitizeUrl(readText(raw, 'url', LIMITS.url));
  if (url) source.url = url;
  return source;
}

function readCourseType(obj: Record<string, unknown>): CourseType | null {
  const value = readText(obj, 'course_type', LIMITS.shortText);
  return Object.prototype.hasOwnProperty.call(CourseTypeLabels, value) ? (value as CourseType) : null;
}

function readIngredient(raw: Record<string, unknown>): Ingredient {
  // Amounts are strings ("1 1/2"), but accept a bare number too
  const amount = typeof raw.amount === 'number' && Number.isFinite(raw.amount)
    ? String(raw.amount)
    : readText(raw, 'amount', LIMITS.shortText);

  return {
    item: readText(raw, 'item', LIMITS.mediumText),
    amount,
    unit: readText(raw, 'unit', LIMITS.shortText),
    prep: readOptionalText(raw, 'prep', LIMITS.mediumText),
    optional: readBoolean(raw, 'optional'),
    substitutes: readTextList(raw, 'substitutes', LIMITS.listItems, LIMITS.mediumText),
  };
}

function readStep(raw: Record<string, unknown>): SharedStep {
  const timeMinutes = readNumber(raw, 'time_minutes', 0, LIMITS.maxMinutes, 0);
  const timerDefault = readNumber(raw, 'timer_default', 0, LIMITS.maxMinutes * 60, 0);

  return {
    title: readText(raw, 'title', LIMITS.mediumText),
    instruction: readText(raw, 'instruction', LIMITS.longText),
    time_minutes: timeMinutes,
    time_display: readText(raw, 'time_display', LIMITS.shortText),
    type: readText(raw, 'type', LIMITS.shortText) === 'passive' ? 'passive' : 'active',
    tip: readOptionalText(raw, 'tip', LIMITS.longText),
    temperature: readTemperature(raw),
    timer_default: timerDefault > 0 ? Math.round(timerDefault) : null,
  };
}

/**
 * Validate and normalize untrusted recipe data. Returns null if it isn't a
 * usable recipe.
 */
function validateSharedRecipe(input: unknown): SharedRecipeData | null {
  try {
    if (!isRecord(input)) return null;

    const name = readText(input, 'name', LIMITS.name);
    if (!name) return null;
    if (!Array.isArray(input.ingredients) || !Array.isArray(input.steps)) return null;

    const ingredients = readObjectList(input, 'ingredients', LIMITS.ingredients)
      .map(readIngredient)
      .filter((ing) => ing.item);  // a blank ingredient row carries nothing

    const steps = readObjectList(input, 'steps', LIMITS.steps)
      .map(readStep)
      .filter((step) => step.title || step.instruction)
      .map((step, i) => ({ ...step, title: step.title || `Step ${i + 1}` }));

    return {
      name,
      description: readText(input, 'description', LIMITS.longText),
      total_time: readText(input, 'total_time', LIMITS.shortText),
      active_time: readText(input, 'active_time', LIMITS.shortText),
      yield: readText(input, 'yield', LIMITS.shortText),
      difficulty: readDifficulty(input),
      safe_temp: readSafeTemp(input),
      equipment: readTextList(input, 'equipment', LIMITS.listItems, LIMITS.shortText),
      tags: readTextList(input, 'tags', LIMITS.listItems, LIMITS.shortText),
      course_type: readCourseType(input),
      cuisine: readOptionalText(input, 'cuisine', LIMITS.shortText),
      source: readSource(input),
      ingredients,
      steps,
      notes: readText(input, 'notes', LIMITS.notes),
    };
  } catch (error) {
    if (error instanceof InvalidShareData) return null;
    throw error;
  }
}

// ============================================
// Social Media Sharing
// ============================================

export interface SocialShareOptions {
  title: string;
  text: string;
  url?: string;
}

// Options for exports that leave the device through a share action: include
// the recipe's own notes, never the sharer's personal cook history.
export const SHARE_EXPORT_OPTIONS: Omit<ExportOptions, 'format'> = {
  includeNotes: true,
  includeHistory: false,
};

export function canNativeShare(): boolean {
  return 'share' in navigator;
}

export async function nativeShare(options: SocialShareOptions): Promise<boolean> {
  if (!canNativeShare()) return false;

  try {
    await navigator.share({
      title: options.title,
      text: options.text,
      url: options.url,
    });
    return true;
  } catch {
    return false;
  }
}

export function generateShareText(recipe: Recipe): string {
  const parts = [
    `Check out this recipe: ${recipe.name}`,
    recipe.description,
    `Serves ${recipe.yield} | ${recipe.total_time}`,
    `#RecipeRunner #Cooking`,
  ];
  return parts.filter(Boolean).join('\n\n');
}

export function shareToTwitter(text: string, url?: string): void {
  const params = new URLSearchParams({
    text,
    ...(url && { url }),
  });
  window.open(`https://twitter.com/intent/tweet?${params}`, '_blank', 'width=600,height=400');
}

export function shareToFacebook(url: string): void {
  const params = new URLSearchParams({ u: url });
  window.open(`https://www.facebook.com/sharer/sharer.php?${params}`, '_blank', 'width=600,height=400');
}

export function shareToPinterest(url: string, description: string, imageUrl?: string): void {
  const params = new URLSearchParams({
    url,
    description,
    ...(imageUrl && { media: imageUrl }),
  });
  window.open(`https://pinterest.com/pin/create/button/?${params}`, '_blank', 'width=600,height=400');
}

export function shareViaEmail(recipe: Recipe): void {
  const subject = encodeURIComponent(`Recipe: ${recipe.name}`);
  const body = encodeURIComponent(exportRecipe(recipe, { format: 'text', ...SHARE_EXPORT_OPTIONS }));
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

// ============================================
// Export for Sharing
// ============================================

export function getRecipeShareData(recipe: Recipe, format: ExportFormat = 'json'): string {
  return exportRecipe(recipe, { format, ...SHARE_EXPORT_OPTIONS });
}

// ============================================
// QR Code Generation (local, no external API)
// ============================================

// QR codes are generated locally to avoid leaking share URLs to third-party APIs.
// Previously used api.qrserver.com which received all share URLs.

// Share links carry the whole recipe, so they can get long. Past this length
// a QR code needs so many modules that phone cameras can't read it off a
// screen (and ~2900 bytes is the format's absolute maximum).
export const QR_CODE_MAX_URL_LENGTH = 1500;

export function canEncodeAsQRCode(url: string): boolean {
  return url.length <= QR_CODE_MAX_URL_LENGTH;
}

let qrcodeModule: typeof import('qrcode') | null = null;

async function ensureQRCode(): Promise<typeof import('qrcode')> {
  if (qrcodeModule) return qrcodeModule;
  qrcodeModule = await import('qrcode');
  return qrcodeModule;
}

export async function generateQRCodeDataUrl(data: string): Promise<string> {
  const QRCode = await ensureQRCode();
  // Low error correction keeps long URLs as sparse (scannable) as possible;
  // a code shown on a screen doesn't need damage tolerance.
  return QRCode.toDataURL(data, { width: 400, margin: 2, errorCorrectionLevel: 'L' });
}
