import { vi, beforeEach } from 'vitest';
import '@testing-library/dom';
import '@testing-library/jest-dom/vitest';

// Mock IndexedDB for Dexie
import 'fake-indexeddb/auto';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
});
