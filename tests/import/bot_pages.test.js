import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { checkBot, detectTemplateCategory } from '../../src/import/bot_pages.js';

describe('bot_pages.js - detectTemplateCategory and checkBot functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectTemplateCategory', () => {
    describe('Input validation', () => {
      test('should return false for null or undefined input', () => {
        expect(detectTemplateCategory(null)).toBe(false);
        expect(detectTemplateCategory(undefined)).toBe(false);
      });

      test('should return false for non-string input', () => {
        expect(detectTemplateCategory(123)).toBe(false);
        expect(detectTemplateCategory({})).toBe(false);
        expect(detectTemplateCategory([])).toBe(false);
        expect(detectTemplateCategory(true)).toBe(false);
      });

      test('should return false for empty string', () => {
        expect(detectTemplateCategory('')).toBe(false);
      });

      test('should return false for whitespace-only string', () => {
        expect(detectTemplateCategory('   ')).toBe(false);
        expect(detectTemplateCategory('\n\t\r')).toBe(false);
      });
    });

    describe('Template matching', () => {
      test('should return false when no sport templates are found', () => {
        const text = 'זה טקסט ללא תבניות ספורט';
        expect(detectTemplateCategory(text)).toBe(false);
      });

      test('should return template array when sport template is found', () => {
        const text = 'זה עמוד על {{אישיות כדורגל}} מישהו';
        const result = detectTemplateCategory(text);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });

      test('should return single template array when multiple sport templates from same category', () => {
        const text = 'עמוד על {{אישיות כדורגל}} ו{{ספורטאי}} גדול';
        const result = detectTemplateCategory(text);
        expect(Array.isArray(result)).toBe(true);
      });

      test('should handle partial template matches', () => {
        const text = 'זה עמוד עם {{אישיות כדורגל|שם הכדורגלן}}';
        const result = detectTemplateCategory(text);
        expect(Array.isArray(result)).toBe(true);
      });

      test('should handle categories', () => {
        const text = 'עמוד עם קטגוריה:אליפו נות ספורט';
        const result = detectTemplateCategory(text);
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe('Special cases', () => {
      test('should handle mixed Hebrew and English text', () => {
        const text = 'This is a page about {{אישיות כדורגל}} someone';
        const result = detectTemplateCategory(text);
        expect(Array.isArray(result)).toBe(true);
      });

      test('should handle special characters in templates', () => {
        const text = 'עמוד עם {{אישיות כדורגל|שם=כדורגלן}} ותבניות נוספות';
        const result = detectTemplateCategory(text);
        expect(Array.isArray(result)).toBe(true);
      });

      test('should handle large text efficiently', () => {
        const largeText = 'מילה '.repeat(1000) + '{{ספורטאי}}';
        const startTime = Date.now();
        const result = detectTemplateCategory(largeText);
        const endTime = Date.now();
        expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('checkBot (deprecated function)', () => {
    test('should work but show deprecation warning', () => {
      const text = 'עמוד עם {{אישיות כדורגל}} כלשהו';
      const result = checkBot(text);
      expect(Array.isArray(result)).toBe(true);
    });

    test('should return same result as detectTemplateCategory', () => {
      const text = 'עמוד עם {{ספורטאי}} כלשהו';
      const newResult = detectTemplateCategory(text);
      const oldResult = checkBot(text);
      expect(oldResult).toEqual(newResult);
    });

    test('should handle empty and invalid inputs same as new function', () => {
      expect(checkBot(null)).toBe(false);
      expect(checkBot('')).toBe(false);
      expect(checkBot(123)).toBe(false);
      
      expect(checkBot(null)).toEqual(detectTemplateCategory(null));
      expect(checkBot('')).toEqual(detectTemplateCategory(''));
      expect(checkBot(123)).toEqual(detectTemplateCategory(123));
    });
  });
});
