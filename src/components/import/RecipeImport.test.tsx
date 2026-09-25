import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { Cookbook } from '../../types';
import type { ParsedRecipe } from '../../services/recipeParser';

const parseRecipeFromTextMock = vi.fn();

vi.mock('../../services/recipeParser', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/recipeParser')>();
  return {
    ...actual,
    parseRecipeFromText: (...args: unknown[]) => parseRecipeFromTextMock(...args),
  };
});

import { RecipeImport } from './RecipeImport';
import { createBlankRecipe } from '../../services/recipeParser';

const cookbook: Cookbook = {
  id: 'cb-1',
  title: 'Family Recipes',
  author: 'Test',
  description: '',
  category: 'cooking',
  created_at: new Date().toISOString(),
  modified_at: new Date().toISOString(),
};

const RECIPE_TEXT = 'Tomato Soup\nIngredients: 6 tomatoes, 1 onion\nSteps: Simmer everything for 30 minutes.';

/** A parse that stays pending until the test settles it */
function deferredParse() {
  let resolve!: (recipe: ParsedRecipe) => void;
  let signal: AbortSignal | undefined;
  parseRecipeFromTextMock.mockImplementation(
    (_text: string, _onProgress: unknown, s?: AbortSignal) => {
      signal = s;
      return new Promise<ParsedRecipe>((r) => {
        resolve = r;
      });
    }
  );
  return {
    resolve: (recipe: ParsedRecipe) => resolve(recipe),
    signal: () => signal,
  };
}

function renderImport() {
  const onImportComplete = vi.fn();
  const onCancel = vi.fn();
  const view = render(
    <RecipeImport cookbook={cookbook} onImportComplete={onImportComplete} onCancel={onCancel} />
  );
  return { ...view, onImportComplete, onCancel };
}

function startTextParse() {
  fireEvent.change(screen.getByPlaceholderText(/Paste your recipe here/), { target: { value: RECIPE_TEXT } });
  fireEvent.click(screen.getByRole('button', { name: 'Parse Recipe' }));
}

describe('RecipeImport', () => {
  beforeEach(() => {
    parseRecipeFromTextMock.mockReset();
  });

  it('opens on the Paste Text tab', () => {
    renderImport();
    expect(screen.getByPlaceholderText(/Paste your recipe here/)).toBeInTheDocument();
  });

  it('opens the editor with a blank recipe for manual entry', () => {
    const { onImportComplete } = renderImport();

    fireEvent.click(screen.getByRole('button', { name: /Enter Manually/ }));

    expect(onImportComplete).toHaveBeenCalledTimes(1);
    const recipe = onImportComplete.mock.calls[0][0] as ParsedRecipe;
    expect(recipe.manual).toBe(true);
    expect(recipe.ingredients).toHaveLength(1);
    expect(recipe.steps).toHaveLength(1);
    expect(parseRecipeFromTextMock).not.toHaveBeenCalled();
  });

  it('never delivers a result after the screen has closed', async () => {
    const parse = deferredParse();
    const { onImportComplete, unmount } = renderImport();

    startTextParse();
    expect(parseRecipeFromTextMock).toHaveBeenCalled();
    unmount();

    expect(parse.signal()?.aborted).toBe(true);
    await act(async () => {
      parse.resolve(createBlankRecipe());
    });
    expect(onImportComplete).not.toHaveBeenCalled();
  });

  it('Stop abandons the parse and ignores its result', async () => {
    const parse = deferredParse();
    const { onImportComplete } = renderImport();

    startTextParse();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

    expect(parse.signal()?.aborted).toBe(true);
    expect(screen.getByRole('button', { name: 'Parse Recipe' })).toBeEnabled();
    await act(async () => {
      parse.resolve(createBlankRecipe());
    });
    expect(onImportComplete).not.toHaveBeenCalled();
  });

  it('delivers a finished parse', async () => {
    const parse = deferredParse();
    const { onImportComplete } = renderImport();

    startTextParse();
    const recipe = { ...createBlankRecipe(), name: 'Tomato Soup', manual: false };
    await act(async () => {
      parse.resolve(recipe);
    });
    expect(onImportComplete).toHaveBeenCalledWith(recipe);
  });

  it('shows the parser error with a way to enter the recipe manually', async () => {
    parseRecipeFromTextMock.mockRejectedValue(
      new Error("Couldn't reach Ollama at http://localhost:11434 — is it running? You can also enter the recipe manually.")
    );
    const { onImportComplete } = renderImport();

    startTextParse();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't reach Ollama at http://localhost:11434");
    fireEvent.click(screen.getAllByRole('button', { name: /Enter Manually/ })[1]);
    expect(onImportComplete).toHaveBeenCalledWith(expect.objectContaining({ manual: true }));
  });

  it('accepts a dropped file instead of letting the browser open it', async () => {
    renderImport();
    fireEvent.click(screen.getByRole('button', { name: /Upload File/ }));

    const zone = screen.getByText('Click to upload or drag and drop').closest('label')!.parentElement!;
    const file = new File(['Tomato soup recipe'], 'soup.pdf', { type: 'application/pdf' });

    // fireEvent returns false when the handler called preventDefault
    expect(fireEvent.dragOver(zone, { dataTransfer: { types: ['Files'], dropEffect: 'none' } })).toBe(false);
    expect(fireEvent.drop(zone, { dataTransfer: { files: [file], types: ['Files'] } })).toBe(false);

    await waitFor(() => expect(screen.getByText('soup.pdf')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Import from PDF Document' })).toBeInTheDocument();
  });

  it('rejects unsupported dropped files with a message', () => {
    renderImport();
    fireEvent.click(screen.getByRole('button', { name: /Upload File/ }));

    const zone = screen.getByText('Click to upload or drag and drop').closest('label')!.parentElement!;
    const file = new File(['PK'], 'recipes.zip', { type: 'application/zip' });
    fireEvent.drop(zone, { dataTransfer: { files: [file], types: ['Files'] } });

    expect(screen.getByRole('alert')).toHaveTextContent('Unsupported file type: application/zip');
  });
});
