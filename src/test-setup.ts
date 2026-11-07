import { afterEach, vi } from 'vitest';
// Node/jsdom support only; the test builder never launches a browser.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  }),
});
afterEach(() => vi.restoreAllMocks());

const base = document.createElement('base');
base.href = 'http://localhost:8100/';
document.head.append(base);
