import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { UserPreferences } from '../../types';

const storedPreferences: UserPreferences = {
  ollama_config: {
    endpoint: 'http://localhost:11434',
    model: 'llama3.1:8b',
    temperature: 0.7,
    max_tokens: 500,
    timeout_ms: 30000,
  },
  timer_alert_type: 'both',
  skill_level: 'intermediate',
  dark_mode: true,
  theme_mode: 'dark',
  auto_generate_visuals: true,
};

const savePreferencesMock = vi.fn();

vi.mock('../../db', () => ({
  getPreferences: () => storedPreferences,
  savePreferences: (prefs: Partial<UserPreferences>) => savePreferencesMock(prefs),
}));

vi.mock('../../contexts', () => ({
  useTheme: () => ({ mode: 'dark', setMode: vi.fn() }),
  useEscapeToClose: vi.fn(),
}));

import { GeneralSettings } from './GeneralSettings';

function openAiTab() {
  render(<GeneralSettings onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /AI Settings/ }));
}

describe('GeneralSettings', () => {
  beforeEach(() => {
    savePreferencesMock.mockClear();
  });

  it('saves only the changed field, leaving the theme alone', () => {
    render(<GeneralSettings onClose={vi.fn()} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'advanced' } });

    expect(savePreferencesMock).toHaveBeenCalledWith({ skill_level: 'advanced' });
  });

  it('never saves an empty or zero timeout', () => {
    openAiTab();
    const timeout = screen.getByLabelText('Timeout in seconds') as HTMLInputElement;

    fireEvent.change(timeout, { target: { value: '' } });
    fireEvent.change(timeout, { target: { value: '0' } });
    expect(savePreferencesMock).not.toHaveBeenCalled();

    // Leaving the field clamps to the allowed range
    fireEvent.blur(timeout);
    expect(timeout.value).toBe('10');
    expect(savePreferencesMock).toHaveBeenLastCalledWith({
      ollama_config: expect.objectContaining({ timeout_ms: 10000 }),
    });
  });

  it('restores the saved timeout when the field is left empty', () => {
    openAiTab();
    const timeout = screen.getByLabelText('Timeout in seconds') as HTMLInputElement;

    fireEvent.change(timeout, { target: { value: '' } });
    fireEvent.blur(timeout);

    expect(timeout.value).toBe('30');
    expect(savePreferencesMock).not.toHaveBeenCalled();
  });

  it('saves valid timeouts as they are typed', () => {
    openAiTab();
    fireEvent.change(screen.getByLabelText('Timeout in seconds'), { target: { value: '120' } });

    expect(savePreferencesMock).toHaveBeenCalledWith({
      ollama_config: expect.objectContaining({ timeout_ms: 120000, endpoint: 'http://localhost:11434' }),
    });
  });

  it('lets a new endpoint be typed and saves it once valid', () => {
    openAiTab();
    const endpoint = screen.getByLabelText('Ollama endpoint') as HTMLInputElement;

    fireEvent.change(endpoint, { target: { value: 'http:/' } });
    expect(endpoint.value).toBe('http:/');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a full address such as http://localhost:11434');
    expect(savePreferencesMock).not.toHaveBeenCalled();

    fireEvent.change(endpoint, { target: { value: 'http://127.0.0.1:11500/' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(savePreferencesMock).toHaveBeenLastCalledWith({
      ollama_config: expect.objectContaining({ endpoint: 'http://127.0.0.1:11500' }),
    });
  });
});
