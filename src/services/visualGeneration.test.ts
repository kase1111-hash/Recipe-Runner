import { describe, it, expect } from 'vitest';
import { enhanceVisualPrompt } from './visualGeneration';

describe('visualGeneration service', () => {
  describe('enhanceVisualPrompt', () => {
    it('enhances prompt with realistic style modifiers by default', () => {
      const prompt = 'A bowl of soup';
      const result = enhanceVisualPrompt(prompt);

      expect(result).toContain('A bowl of soup');
      expect(result).toContain('realistic photograph');
      expect(result).toContain('natural lighting');
      expect(result).toContain('professional food photography');
    });

    it('enhances prompt with illustrated style modifiers when specified', () => {
      const prompt = 'Chopping vegetables';
      const result = enhanceVisualPrompt(prompt, 'illustrated');

      expect(result).toContain('Chopping vegetables');
      expect(result).toContain('clean illustration');
      expect(result).toContain('instructional diagram');
      expect(result).not.toContain('realistic photograph');
    });

    it('preserves original prompt content', () => {
      const prompt = 'Searing a steak in a cast iron pan until golden brown';
      const result = enhanceVisualPrompt(prompt, 'realistic');

      expect(result).toContain(prompt);
    });
  });
});
