// Mock browser APIs that content.js depends on
global.chrome = { runtime: {}, storage: { sync: { get: jest.fn() } } };
global.mermaid = {
  initialize: jest.fn(),
  render: jest.fn(),
};
global.marked = {
  setOptions: jest.fn(),
  parse: jest.fn(),
};
global.MutationObserver = class {
  constructor(cb) { this.cb = cb; }
  observe() {}
  disconnect() {}
};

// Mock DOM APIs used by content.js
Object.defineProperty(document, 'readyState', {
  get: () => 'loading',
  configurable: true,
});

describe('discord-markdown-enhancer', () => {
  test('content script loads without errors', () => {
    expect(() => require('../content.js')).not.toThrow();
  });
});
