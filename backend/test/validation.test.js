'use strict';

const { validateTitle } = require('../src/tasks/validation');

describe('validateTitle', () => {
  test('trims a valid title', () => {
    expect(validateTitle('  Plan tests  ')).toBe('Plan tests');
  });

  test('rejects a blank title', () => {
    expect(() => validateTitle('   ')).toThrow('Enter a valid title.');
  });

  test('rejects an empty string', () => {
    expect(() => validateTitle('')).toThrow('Enter a valid title.');
  });

  test('rejects non-string types', () => {
    expect(() => validateTitle(42)).toThrow('Enter a valid title.');
    expect(() => validateTitle(null)).toThrow('Enter a valid title.');
    expect(() => validateTitle(undefined)).toThrow('Enter a valid title.');
  });

  // Practice exercise: Test for a valid title at the maximum allowed length (120 characters)
  test('accepts a valid title at the maximum allowed length (120 characters)', () => {
    const maxTitle = 'a'.repeat(120);
    expect(validateTitle(maxTitle)).toBe(maxTitle);
  });

  // Boundary value test: 121 characters
  test('rejects a title longer than the limit (121 characters)', () => {
    expect(() => validateTitle('a'.repeat(121))).toThrow('Enter a valid title.');
  });
});
