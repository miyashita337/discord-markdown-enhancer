// Extract and test pure functions from content.js
// content.js is an IIFE, so we test the logic patterns directly

describe('containsTable', () => {
  // Reimplementation of containsTable for testing
  function containsTable(text) {
    const lines = text.trim().split("\n");
    if (lines.length < 3) return false;
    const pipeRowPattern = /^\s*\|(.+\|)+\s*$/;
    const separatorPattern = /^\s*\|(\s*:?-+:?\s*\|)+\s*$/;
    if (!pipeRowPattern.test(lines[0])) return false;
    for (let i = 1; i < lines.length; i++) {
      if (separatorPattern.test(lines[i])) return true;
    }
    return false;
  }

  test('detects valid markdown table', () => {
    const table = '| Header | Header2 |\n| --- | --- |\n| Cell | Cell2 |';
    expect(containsTable(table)).toBe(true);
  });

  test('rejects text without table', () => {
    expect(containsTable('just plain text')).toBe(false);
  });

  test('rejects text with fewer than 3 lines', () => {
    expect(containsTable('| Header |\n| --- |')).toBe(false);
  });

  test('rejects text without pipe in first line', () => {
    expect(containsTable('no pipes\n| --- |\n| cell |')).toBe(false);
  });
});
