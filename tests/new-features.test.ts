import { FastTextLanguageDetector } from '../src/detector';
import { getLanguageName } from '../src/language-names';
import * as fs from 'fs';
import * as path from 'path';

describe('New Features', () => {
  let detector: FastTextLanguageDetector;
  const modelPath = path.join(__dirname, '..', 'models', 'lid.176.bin');

  beforeAll(() => {
    if (!fs.existsSync(modelPath)) {
      console.warn('Model file not found. Skipping tests.');
      return;
    }
  });

  beforeEach(async () => {
    detector = new FastTextLanguageDetector({ 
      cache: true,
      cacheSize: 100,
      autoCleanup: true 
    });
    if (fs.existsSync(modelPath)) {
      await detector.load();
    }
  });

  afterEach(async () => {
    if (detector) {
      await detector.unload();
    }
  });

  describe('detectSimple', () => {
    it.skip('should return just the language code', async () => {
      if (!fs.existsSync(modelPath)) return;

      const language = await detector.detectSimple('Hello world', 0.5);
      expect(language).toBe('en');
    });

    it('should return null for low confidence', async () => {
      if (!fs.existsSync(modelPath)) return;

      const language = await detector.detectSimple('xyz', 0.9);
      expect(language).toBeNull();
    });
  });

  describe('detectBatch', () => {
    it('should detect multiple languages in batch', async () => {
      if (!fs.existsSync(modelPath)) return;

      const texts = ['Hello world', 'Bonjour le monde', 'Hola mundo'];
      const results = await detector.detectBatch(texts);
      
      expect(results).toHaveLength(3);
      expect(results[0]?.primary?.language).toBe('en');
      expect(results[1]?.primary?.language).toBe('fr');
      expect(results[2]?.primary?.language).toBe('es');
    });
  });

  describe('detect with options', () => {
    it('should apply threshold filter', async () => {
      if (!fs.existsSync(modelPath)) return;

      const result = await detector.detect('Hello world', {
        threshold: 0.9
      });
      
      expect(result.predictions.every(p => p.confidence >= 0.9)).toBe(true);
    });

    it('should limit to topK results', async () => {
      if (!fs.existsSync(modelPath)) return;

      const result = await detector.detect('Hello world', {
        topK: 2
      });
      
      expect(result.predictions.length).toBeLessThanOrEqual(2);
    });

    it('should include language names when requested', async () => {
      if (!fs.existsSync(modelPath)) return;

      const result = await detector.detect('Hello world', {
        includeLanguageName: true
      });
      
      expect(result.predictions[0]).toHaveProperty('languageName');
    });
  });

  describe('Language Names', () => {
    it('should return correct language names', () => {
      expect(getLanguageName('en')).toBe('English');
      expect(getLanguageName('fr')).toBe('French');
      expect(getLanguageName('es')).toBe('Spanish');
      expect(getLanguageName('unknown')).toBe('UNKNOWN');
    });
  });

  describe('Caching', () => {
    it('should cache repeated detections', async () => {
      if (!fs.existsSync(modelPath)) return;

      const text = 'Hello world';
      
      // First call
      const start1 = Date.now();
      const result1 = await detector.detect(text);
      const time1 = Date.now() - start1;
      
      // Second call (should be cached)
      const start2 = Date.now();
      const result2 = await detector.detect(text);
      const time2 = Date.now() - start2;
      
      expect(result1).toEqual(result2);
      // Cached result should be much faster (at least 2x)
      expect(time2).toBeLessThan(time1 / 2);
    });
  });
});