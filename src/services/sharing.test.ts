import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  createShareLink,
  decodeSharedRecipe,
  encodeSharedRecipe,
  createRecipeFromShared,
  getSharePayloadFromLocation,
  canEncodeAsQRCode,
  QR_CODE_MAX_URL_LENGTH,
  SHARE_LINK_PATH,
  type SharedRecipeData,
} from './sharing';
import type { Recipe } from '../types';

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'recipe-123',
    cookbook_id: 'cookbook-9',
    name: 'Crème Brûlée',
    description: 'Silky custard with a crackly top — c’est magnifique! 🍮',
    total_time: '5 hr',
    active_time: '30 min',
    yield: '6 ramekins',
    difficulty: { overall: 3, technique: 4, timing: 3, ingredients: 2, equipment: 3 },
    safe_temp: { value: 80, unit: '°C', location: 'center of custard' },
    equipment: ['Ramekins', 'Kitchen torch'],
    tags: ['dessert', 'français'],
    course_type: 'dessert',
    cuisine: 'French',
    source: { type: 'book', title: 'Le Cordon Bleu', page: 212, url: 'https://example.com/creme' },
    ingredients: [
      { item: 'heavy cream', amount: '2', unit: 'cups', prep: null, optional: false, substitutes: [] },
      { item: 'sugar', amount: '½', unit: 'cup', prep: 'divided', optional: false, substitutes: ['caster sugar'] },
      { item: 'vanilla bean', amount: '1', unit: '', prep: 'split & scraped', optional: true, substitutes: ['1 tbsp extract'] },
    ],
    steps: [
      {
        index: 0,
        title: 'Heat the cream',
        instruction: 'Warm cream to 80°C — don’t let it boil. Whisk <eggs> separately.',
        time_minutes: 10,
        time_display: '10 min',
        type: 'active',
        tip: 'Tiny bubbles at the edge = ready 👍',
        visual_prompt: 'A saucepan of steaming cream on a stove, photorealistic',
        temperature: { value: 80, unit: '°C', target: 'cream' },
        timer_default: 600,
      },
      {
        index: 1,
        title: 'Chill',
        instruction: 'Refrigerate until set.',
        time_minutes: 240,
        time_display: '4 hr',
        type: 'passive',
        tip: null,
        visual_prompt: 'Ramekins in a fridge',
        temperature: null,
        timer_default: null,
      },
    ],
    notes: 'Keeps 3 days. x<y and y>z still reads fine.',
    created_at: '2024-03-01T10:00:00.000Z',
    modified_at: '2024-03-02T10:00:00.000Z',
    cook_history: [
      { date: '2024-03-05T18:00:00.000Z', completed: true, notes: 'my private cook note', adjustments: ['less sugar'], rating: 5 },
    ],
    favorite: true,
    ...overrides,
  };
}

// What the recipient should get back for makeRecipe()
function expectedShareData(recipe: Recipe): SharedRecipeData {
  return {
    name: recipe.name,
    description: recipe.description,
    total_time: recipe.total_time,
    active_time: recipe.active_time,
    yield: recipe.yield,
    difficulty: recipe.difficulty,
    safe_temp: recipe.safe_temp ?? null,
    equipment: recipe.equipment,
    tags: recipe.tags,
    course_type: recipe.course_type ?? null,
    cuisine: recipe.cuisine ?? null,
    source: recipe.source,
    ingredients: recipe.ingredients,
    steps: recipe.steps.map((step) => ({
      title: step.title,
      instruction: step.instruction,
      time_minutes: step.time_minutes,
      time_display: step.time_display,
      type: step.type,
      tip: step.tip ?? null,
      temperature: step.temperature ?? null,
      timer_default: step.timer_default ?? null,
    })),
    notes: recipe.notes,
  };
}

function payloadOf(link: string): string {
  const payload = getSharePayloadFromLocation(new URL(link));
  if (payload === null) throw new Error(`Not a share link: ${link}`);
  return payload;
}

function base64UrlToText(body: string): string {
  const base64 = body.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

function textToBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// A hand-built uncompressed payload for arbitrary JSON
function rawPayload(value: unknown): string {
  return '1j' + textToBase64Url(JSON.stringify(value));
}

async function deflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const stream = new CompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  void writer.write(bytes);
  void writer.close();
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createShareLink / decodeSharedRecipe', () => {
  it('builds a self-contained /shared# link on the current origin', async () => {
    const link = await createShareLink(makeRecipe());
    expect(link.startsWith(`${window.location.origin}${SHARE_LINK_PATH}#1`)).toBe(true);
    // Nothing that needs escaping in a URL fragment
    expect(payloadOf(link)).toMatch(/^1[zj][A-Za-z0-9_-]+$/);
  });

  it('round-trips a recipe, including unicode (é ½ ° emoji)', async () => {
    const recipe = makeRecipe();
    const decoded = await decodeSharedRecipe(payloadOf(await createShareLink(recipe)));
    expect(decoded).toEqual(expectedShareData(recipe));
    expect(decoded?.ingredients[1].amount).toBe('½');
    expect(decoded?.steps[0].tip).toBe('Tiny bubbles at the edge = ready 👍');
  });

  it('uses deflate compression when CompressionStream is available', async () => {
    expect(typeof CompressionStream).toBe('function');
    const payload = payloadOf(await createShareLink(makeRecipe()));
    expect(payload.startsWith('1z')).toBe(true);
  });

  it('falls back to uncompressed JSON when CompressionStream is missing', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    const recipe = makeRecipe();
    const payload = payloadOf(await createShareLink(recipe));
    expect(payload.startsWith('1j')).toBe(true);
    expect(await decodeSharedRecipe(payload)).toEqual(expectedShareData(recipe));
  });

  it('decodes uncompressed links even without DecompressionStream', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    const recipe = makeRecipe();
    const payload = payloadOf(await createShareLink(recipe));
    vi.stubGlobal('DecompressionStream', undefined);
    expect(await decodeSharedRecipe(payload)).toEqual(expectedShareData(recipe));
  });

  it('returns null (not a throw) for a compressed link on a browser without DecompressionStream', async () => {
    const payload = payloadOf(await createShareLink(makeRecipe()));
    vi.stubGlobal('DecompressionStream', undefined);
    await expect(decodeSharedRecipe(payload)).resolves.toBeNull();
  });

  it('leaves personal and device-specific data out of the link', async () => {
    vi.stubGlobal('CompressionStream', undefined);  // so the JSON is readable
    const payload = payloadOf(await createShareLink(makeRecipe()));
    const json = base64UrlToText(payload.slice(2));

    for (const leaked of ['recipe-123', 'cookbook-9', 'my private cook note', 'less sugar', '2024-03-0', 'cook_history', 'favorite', 'visual_prompt', 'photorealistic']) {
      expect(json).not.toContain(leaked);
    }
    // The recipe's own notes are recipe content and do travel
    expect(json).toContain('Keeps 3 days');
  });

  it('round-trips a large recipe', async () => {
    const recipe = makeRecipe({
      ingredients: Array.from({ length: 150 }, (_, i) => ({
        item: `ingredient ${i} with a fairly descriptive name`,
        amount: `${i % 7} ½`,
        unit: i % 2 ? 'cups' : 'g',
        prep: i % 3 ? 'finely chopped' : null,
        optional: i % 5 === 0,
        substitutes: i % 4 ? [] : [`alt ${i}`],
      })),
      steps: Array.from({ length: 100 }, (_, i) => ({
        index: i,
        title: `Step title ${i}`,
        instruction: Array(40).fill(`Do thing ${i}.`).join(' '),
        time_minutes: i,
        time_display: `${i} min`,
        type: i % 2 ? 'passive' as const : 'active' as const,
        tip: i % 3 ? `Tip ${i}` : null,
        visual_prompt: 'x'.repeat(200),
        temperature: null,
        timer_default: i ? i * 60 : null,
      })),
    });

    const link = await createShareLink(recipe);
    const decoded = await decodeSharedRecipe(payloadOf(link));
    expect(decoded).toEqual(expectedShareData(recipe));
    expect(decoded?.ingredients).toHaveLength(150);
    expect(decoded?.steps).toHaveLength(100);
  });

  it('rejects recipes that cannot be shared', async () => {
    await expect(createShareLink(makeRecipe({ name: '   ' }))).rejects.toThrow();
  });
});

describe('decodeSharedRecipe with bad input', () => {
  it('returns null for garbage payloads', async () => {
    const garbage = [
      '',
      '#',
      '1',
      '1z',
      'abc',
      'hello world',
      '1z!!!!',
      '1z%%%%',
      '1zA',         // impossible base64 length
      '1jAAAA',      // valid base64, not JSON
      '1zAAAAAAAA',  // valid base64, not deflate
      '2j' + textToBase64Url('{"name":"x","ingredients":[],"steps":[]}'),  // unknown version
      '1x' + textToBase64Url('{"name":"x","ingredients":[],"steps":[]}'),  // unknown format
      '1j' + textToBase64Url('null'),
      '1j' + textToBase64Url('[]'),
      '1j' + textToBase64Url('"a string"'),
    ];
    for (const payload of garbage) {
      await expect(decodeSharedRecipe(payload), payload).resolves.toBeNull();
    }
  });

  it('returns null for non-string input', async () => {
    await expect(decodeSharedRecipe(undefined as unknown as string)).resolves.toBeNull();
    await expect(decodeSharedRecipe(42 as unknown as string)).resolves.toBeNull();
  });

  it('returns null for a truncated link', async () => {
    const payload = payloadOf(await createShareLink(makeRecipe()));
    for (const cut of [3, 10, Math.floor(payload.length / 2), payload.length - 5]) {
      await expect(decodeSharedRecipe(payload.slice(0, cut))).resolves.toBeNull();
    }
  });

  it('never throws on tampered payloads', async () => {
    const payload = payloadOf(await createShareLink(makeRecipe()));
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let seed = 12345;
    const random = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;

    for (let i = 0; i < 200; i++) {
      const pos = 2 + Math.floor(random() * (payload.length - 2));
      const mutated = payload.slice(0, pos) + alphabet[Math.floor(random() * alphabet.length)] + payload.slice(pos + 1);
      const result = await decodeSharedRecipe(mutated);
      // Either rejected, or still a well-formed recipe
      if (result !== null) {
        expect(typeof result.name).toBe('string');
        expect(result.name.length).toBeGreaterThan(0);
        expect(Array.isArray(result.ingredients)).toBe(true);
        expect(Array.isArray(result.steps)).toBe(true);
      }
    }
  });

  it('rejects data of the wrong shape', async () => {
    const base = { name: 'Toast', ingredients: [{ item: 'bread' }], steps: [{ title: 'Toast', instruction: 'Toast it' }] };
    const bad: unknown[] = [
      { ...base, name: '' },
      { ...base, name: 42 },
      { ...base, name: { text: 'Toast' } },
      { name: 'Toast', steps: base.steps },                  // no ingredients
      { name: 'Toast', ingredients: base.ingredients },      // no steps
      { ...base, ingredients: 'bread' },
      { ...base, ingredients: ['bread'] },
      { ...base, ingredients: [{ item: 42 }] },
      { ...base, ingredients: [{ item: 'bread', substitutes: [1, 2] }] },
      { ...base, ingredients: [{ item: 'bread', optional: 'yes' }] },
      { ...base, steps: [null] },
      { ...base, steps: [{ title: 'Toast', instruction: 'Toast it', time_minutes: '10' }] },
      { ...base, steps: [{ title: 'Toast', instruction: 'Toast it', time_minutes: true }] },
      { ...base, tags: 'breakfast' },
      { ...base, difficulty: 3 },
      { ...base, safe_temp: 'hot' },
    ];
    for (const value of bad) {
      await expect(decodeSharedRecipe(rawPayload(value)), JSON.stringify(value)).resolves.toBeNull();
    }
  });

  it('fills defaults for a minimal recipe', async () => {
    const decoded = await decodeSharedRecipe(rawPayload({ name: 'Toast', ingredients: [{ item: 'bread', amount: 2 }], steps: [{ instruction: 'Toast it' }] }));
    expect(decoded).toEqual({
      name: 'Toast',
      description: '',
      total_time: '',
      active_time: '',
      yield: '',
      difficulty: { overall: 3, technique: 3, timing: 3, ingredients: 3, equipment: 3 },
      safe_temp: null,
      equipment: [],
      tags: [],
      course_type: null,
      cuisine: null,
      source: { type: 'original' },
      ingredients: [{ item: 'bread', amount: '2', unit: '', prep: null, optional: false, substitutes: [] }],
      steps: [{
        title: 'Step 1',
        instruction: 'Toast it',
        time_minutes: 0,
        time_display: '',
        type: 'active',
        tip: null,
        temperature: null,
        timer_default: null,
      }],
      notes: '',
    });
  });

  it('caps oversized text and lists', async () => {
    const decoded = await decodeSharedRecipe(rawPayload({
      name: 'N'.repeat(1000),
      ingredients: Array.from({ length: 500 }, (_, i) => ({ item: `item ${i}` })),
      steps: Array.from({ length: 500 }, (_, i) => ({ instruction: `step ${i}` })),
      tags: Array.from({ length: 500 }, (_, i) => `tag ${i}`),
      difficulty: { overall: 99, technique: -4, timing: 2.6 },
    }));
    expect(decoded?.name).toHaveLength(200);
    expect(decoded?.ingredients).toHaveLength(200);
    expect(decoded?.steps).toHaveLength(200);
    expect(decoded?.tags).toHaveLength(50);
    expect(decoded?.difficulty).toEqual({ overall: 5, technique: 1, timing: 3, ingredients: 3, equipment: 3 });
  });

  it('does not split an emoji when truncating', async () => {
    const decoded = await decodeSharedRecipe(rawPayload({ name: 'a' + '🍰'.repeat(150), ingredients: [], steps: [] }));
    expect(decoded?.name).toBe('a' + '🍰'.repeat(99));
  });

  it('refuses payloads that decompress to something huge (zip bomb)', async () => {
    const hugeJson = JSON.stringify({ name: 'Bomb', ingredients: [], steps: [], notes: ' '.repeat(2_000_000) });
    const payload = '1z' + bytesToBase64Url(await deflate(new TextEncoder().encode(hugeJson)));
    expect(payload.length).toBeLessThan(10_000);  // tiny link...
    await expect(decodeSharedRecipe(payload)).resolves.toBeNull();  // ...refused anyway
  });

  it('refuses absurdly long payloads before decoding', async () => {
    await expect(decodeSharedRecipe('1j' + 'A'.repeat(400_000))).resolves.toBeNull();
  });

  it('strips HTML but keeps literal angle brackets and ampersands', async () => {
    const decoded = await decodeSharedRecipe(rawPayload({
      name: 'Toast<script>alert(1)</script> & Jam',
      description: '<img src=x onerror=alert(1)>Crunchy',
      ingredients: [{ item: 'bread <b>thick</b>' }],
      steps: [{ title: 'Go', instruction: 'whisk <eggs> until x<y' }],
      notes: 'Tom &amp; Jerry',
    }));
    expect(decoded?.name).toBe('Toast & Jam');
    expect(decoded?.description).toBe('Crunchy');
    expect(decoded?.ingredients[0].item).toBe('bread thick');
    expect(decoded?.steps[0].instruction).toBe('whisk <eggs> until x<y');
    expect(decoded?.notes).toBe('Tom &amp; Jerry');
  });

  it('drops unsafe source URLs and control characters', async () => {
    const decoded = await decodeSharedRecipe(rawPayload({
      name: 'Toast\u0000\u0007',
      ingredients: [],
      steps: [],
      source: { type: 'url', url: 'javascript:alert(1)' },
    }));
    expect(decoded?.name).toBe('Toast');
    expect(decoded?.source).toEqual({ type: 'url' });
  });

  it('maps unknown enum values to safe defaults', async () => {
    const decoded = await decodeSharedRecipe(rawPayload({
      name: 'Toast',
      course_type: 'second_breakfast',
      source: { type: 'carrier-pigeon' },
      safe_temp: { value: 70, unit: 'K', location: 'center' },
      ingredients: [],
      steps: [{ instruction: 'Toast it', type: 'frantic', temperature: { value: 200, unit: 'Rankine' } }],
    }));
    expect(decoded?.course_type).toBeNull();
    expect(decoded?.source).toEqual({ type: 'original' });
    expect(decoded?.safe_temp).toBeNull();
    expect(decoded?.steps[0].type).toBe('active');
    expect(decoded?.steps[0].temperature).toBeNull();
  });

  it('accepts a leading "#"', async () => {
    const payload = await encodeSharedRecipe(expectedShareData(makeRecipe()));
    expect(await decodeSharedRecipe('#' + payload)).toEqual(expectedShareData(makeRecipe()));
  });
});

describe('createRecipeFromShared', () => {
  it('creates a fresh recipe owned by the recipient', async () => {
    const original = makeRecipe();
    const shared = await decodeSharedRecipe(payloadOf(await createShareLink(original)));
    expect(shared).not.toBeNull();

    const recipe = createRecipeFromShared(shared!, 'my-cookbook');
    expect(recipe.id).not.toBe(original.id);
    expect(recipe.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(recipe.cookbook_id).toBe('my-cookbook');
    expect(recipe.cook_history).toEqual([]);
    expect(recipe.favorite).toBeUndefined();
    expect(recipe.created_at).toBe(recipe.modified_at);
    expect(recipe.steps.map((s) => s.index)).toEqual([0, 1]);
    expect(recipe.steps.every((s) => s.visual_prompt === '')).toBe(true);
    expect(recipe.name).toBe(original.name);
    expect(recipe.ingredients).toEqual(original.ingredients);
    expect(recipe.safe_temp).toEqual(original.safe_temp);
  });

  it('does not share object references with the decoded data', () => {
    const data = expectedShareData(makeRecipe());
    const recipe = createRecipeFromShared(data, 'cb');
    recipe.ingredients[1].substitutes.push('honey');
    recipe.tags.push('new');
    expect(data.ingredients[1].substitutes).toEqual(['caster sugar']);
    expect(data.tags).toEqual(['dessert', 'français']);
  });
});

describe('getSharePayloadFromLocation', () => {
  it('reads the payload from /shared links only', () => {
    expect(getSharePayloadFromLocation({ pathname: '/shared', hash: '#1zAbc' })).toBe('1zAbc');
    expect(getSharePayloadFromLocation({ pathname: '/shared/', hash: '#1zAbc' })).toBe('1zAbc');
    expect(getSharePayloadFromLocation({ pathname: '/shared', hash: '' })).toBe('');
    expect(getSharePayloadFromLocation({ pathname: '/', hash: '#1zAbc' })).toBeNull();
    expect(getSharePayloadFromLocation({ pathname: '/cookbook/abc', hash: '' })).toBeNull();
  });
});

describe('QR code limits', () => {
  it('only offers QR codes for URLs the QR format can hold', async () => {
    const QRCode = await import('qrcode');
    const prefix = `${window.location.origin}${SHARE_LINK_PATH}#1z`;
    // Lowercase forces byte mode, the least compact QR encoding (worst case)
    const longest = prefix + 'a'.repeat(QR_CODE_MAX_URL_LENGTH - prefix.length);

    expect(canEncodeAsQRCode(longest)).toBe(true);
    expect(canEncodeAsQRCode(longest + 'a')).toBe(false);
    // The longest URL we accept really does fit (with the settings we render with)
    expect(() => QRCode.create(longest, { errorCorrectionLevel: 'L' })).not.toThrow();
    // ...and the limit guards a real ceiling in the format
    expect(() => QRCode.create(prefix + 'a'.repeat(3000), { errorCorrectionLevel: 'L' })).toThrow();
  });
});
