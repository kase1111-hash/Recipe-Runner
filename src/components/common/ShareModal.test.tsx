import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareModal } from './ShareModal';
import { copyToClipboard } from '../../services/export';
import { decodeSharedRecipe, QR_CODE_MAX_URL_LENGTH } from '../../services/sharing';
import type { Recipe } from '../../types';

vi.mock('../../services/export', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/export')>()),
  copyToClipboard: vi.fn(),
}));

const recipe: Recipe = {
  id: 'r1',
  cookbook_id: 'cb1',
  name: 'Toast',
  description: '',
  total_time: '5 min',
  active_time: '5 min',
  yield: '1 slice',
  difficulty: { overall: 1, technique: 1, timing: 1, ingredients: 1, equipment: 1 },
  safe_temp: null,
  equipment: [],
  tags: [],
  source: { type: 'original' },
  ingredients: [{ item: 'bread', amount: '1', unit: 'slice', prep: null, optional: false, substitutes: [] }],
  steps: [{ index: 0, title: 'Toast', instruction: 'Toast it.', time_minutes: 5, time_display: '5 min', type: 'active', visual_prompt: '' }],
  notes: 'Butter while hot.',
  created_at: '2024-01-01T00:00:00.000Z',
  modified_at: '2024-01-01T00:00:00.000Z',
  cook_history: [],
};

// Deterministic but varied text, so compression can't shrink the link under the QR limit
let seed = 42;
function noise(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    out += 'abcdefghijklmnopqrstuvwxyz0123456789 '[seed % 37];
  }
  return out;
}

const longRecipe: Recipe = {
  ...recipe,
  steps: Array.from({ length: 60 }, (_, i) => ({
    ...recipe.steps[0],
    index: i,
    title: `Step ${i} ${noise(20)}`,
    instruction: noise(60),
  })),
};

async function renderWithLink(r: Recipe = recipe) {
  render(<ShareModal recipe={r} onClose={() => {}} />);
  return await screen.findByText(/\/shared#/);
}

describe('ShareModal', () => {
  beforeEach(() => {
    vi.mocked(copyToClipboard).mockResolvedValue(undefined);
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'share');
  });

  it('shows a loading state, then a self-contained link that decodes back to the recipe', async () => {
    render(<ShareModal recipe={recipe} onClose={() => {}} />);
    expect(screen.getByText('Creating link...')).toBeInTheDocument();

    const linkBox = await screen.findByText(/\/shared#/);
    const url = linkBox.textContent ?? '';
    expect(url.startsWith(`${window.location.origin}/shared#`)).toBe(true);
    const decoded = await decodeSharedRecipe(url.slice(url.indexOf('#') + 1));
    expect(decoded?.name).toBe('Toast');
  });

  it('copies the link and confirms', async () => {
    const linkBox = await renderWithLink();
    fireEvent.click(screen.getByText('Copy Link'));

    expect(await screen.findByText('Copied!')).toBeInTheDocument();
    expect(copyToClipboard).toHaveBeenCalledWith(linkBox.textContent);
  });

  it('tells the user when copying fails', async () => {
    vi.mocked(copyToClipboard).mockRejectedValue(new Error('denied'));
    await renderWithLink();
    fireEvent.click(screen.getByText('Copy Link'));

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't copy automatically");
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
  });

  it('offers a QR code for short links', async () => {
    await renderWithLink();
    expect(screen.getByText('Show QR Code')).toBeInTheDocument();
  });

  it('replaces the QR code with a note when the link is too long', async () => {
    const linkBox = await renderWithLink(longRecipe);
    expect((linkBox.textContent ?? '').length).toBeGreaterThan(QR_CODE_MAX_URL_LENGTH);
    expect(screen.queryByText('Show QR Code')).not.toBeInTheDocument();
    expect(screen.getByText(/too long to fit in a scannable QR code/)).toBeInTheDocument();
  });

  it('enables Facebook once the link is ready', async () => {
    render(<ShareModal recipe={recipe} onClose={() => {}} />);
    fireEvent.click(screen.getByText('Social'));
    expect(screen.getByText('Share on Facebook').closest('button')).toBeDisabled();
    await waitFor(() => expect(screen.getByText('Share on Facebook').closest('button')).not.toBeDisabled());
  });

  it('uses theme tokens for the Email and More Options buttons', async () => {
    Object.defineProperty(navigator, 'share', { value: vi.fn(), configurable: true });
    render(<ShareModal recipe={recipe} onClose={() => {}} />);
    fireEvent.click(screen.getByText('Social'));

    for (const label of ['Send via Email', 'More Options']) {
      const style = screen.getByText(label).closest('button')?.getAttribute('style') ?? '';
      expect(style).toContain('var(--btn-secondary-bg)');
      expect(style).toContain('var(--btn-secondary-text)');
      expect(style).not.toMatch(/color:\s*white/);
    }
  });

  it('includes recipe notes in copied exports', async () => {
    render(<ShareModal recipe={recipe} onClose={() => {}} />);
    fireEvent.click(screen.getByText('Export'));

    const copyButtons = screen.getAllByText('Copy');
    // Markdown, then plain text
    for (const button of copyButtons.slice(1)) {
      fireEvent.click(button);
      await waitFor(() => expect(copyToClipboard).toHaveBeenLastCalledWith(expect.stringContaining('Butter while hot.')));
    }
    expect(await screen.findByText('Copied to clipboard!')).toBeInTheDocument();
  });

  it('reports export copy failures', async () => {
    vi.mocked(copyToClipboard).mockRejectedValue(new Error('denied'));
    render(<ShareModal recipe={recipe} onClose={() => {}} />);
    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getAllByText('Copy')[0]);

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't copy to clipboard");
  });
});
