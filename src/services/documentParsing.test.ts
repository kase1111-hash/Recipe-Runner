import { describe, it, expect, vi, beforeEach } from 'vitest';

type Logger = (info: { status: string; progress: number }) => void;

const recognizeMock = vi.fn();

vi.mock('tesseract.js', () => ({
  recognize: (...args: unknown[]) => recognizeMock(...args),
}));

import { extractTextFromImage, OCR_UNAVAILABLE_MESSAGE } from './documentParsing';

const image = () => new File(['not really a png'], 'recipe.png', { type: 'image/png' });

describe('extractTextFromImage', () => {
  beforeEach(() => {
    recognizeMock.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('explains that OCR data could not be downloaded when the engine fails to load', async () => {
    // Tesseract rejects with a bare string when its CDN worker is blocked
    recognizeMock.mockImplementation((_img: string, _lang: string, options: { logger: Logger }) => {
      options.logger({ status: 'loading tesseract core', progress: 0 });
      return Promise.reject("NetworkError: Failed to execute 'importScripts' on 'WorkerGlobalScope'");
    });

    await expect(extractTextFromImage(image())).rejects.toThrow(OCR_UNAVAILABLE_MESSAGE);
  });

  it('handles a rejection with no reason at all', async () => {
    recognizeMock.mockRejectedValue(undefined);

    await expect(extractTextFromImage(image())).rejects.toThrow(/Paste the recipe text instead/);
  });

  it('keeps string reasons for failures during recognition', async () => {
    recognizeMock.mockImplementation((_img: string, _lang: string, options: { logger: Logger }) => {
      options.logger({ status: 'recognizing text', progress: 0.2 });
      return Promise.reject('Error: image is too small to scale');
    });

    await expect(extractTextFromImage(image())).rejects.toThrow(
      'OCR processing failed: Error: image is too small to scale'
    );
  });

  it('returns cleaned text on success', async () => {
    recognizeMock.mockResolvedValue({ data: { text: '  2 tablespcon  butter \n', confidence: 91 } });

    await expect(extractTextFromImage(image())).resolves.toMatchObject({
      text: '2 tablespoon butter',
      source: 'image',
      confidence: 0.91,
    });
  });
});
