import { FastTextLanguageDetector } from '../src/detector';
import * as fs from 'fs';
import * as path from 'path';

describe('FastTextLanguageDetector', () => {
  let detector: FastTextLanguageDetector;
  const modelPath = path.join(__dirname, '..', 'models', 'lid.176.bin');

  beforeAll(() => {
    // Check if model exists, skip tests if not
    if (!fs.existsSync(modelPath)) {
      console.warn('Model file not found. Skipping tests. Run "npm run download-model" first.');
      return;
    }
  });

  beforeEach(() => {
    detector = new FastTextLanguageDetector();
  });

  afterEach(async () => {
    if (detector) {
      await detector.unload();
    }
  });

  describe('Initialization', () => {
    it('should create an instance with default options', () => {
      expect(detector).toBeDefined();
      expect(detector).toBeInstanceOf(FastTextLanguageDetector);
    });

    it('should create an instance with custom options', () => {
      const customDetector = new FastTextLanguageDetector({
        poolSize: 5,
        maxQueueSize: 1000,
        timeout: 10000,
      });
      expect(customDetector).toBeDefined();
    });

    it('should throw error if model file does not exist', async () => {
      const invalidDetector = new FastTextLanguageDetector({
        modelPath: '/invalid/path/model.bin',
      });
      await expect(invalidDetector.load()).rejects.toThrow('Model file not found');
    });
  });

  describe('Language Detection', () => {
    beforeEach(async () => {
      if (fs.existsSync(modelPath)) {
        await detector.load();
      }
    });

    it('should detect English text', async () => {
      if (!fs.existsSync(modelPath)) return;

      const result = await detector.detectLanguage('Hello, how are you today?');
      expect(result.primary).toBeDefined();
      expect(result.primary?.language).toBe('en');
      expect(result.primary?.confidence).toBeGreaterThan(0.9);
    });

    it('should detect French text', async () => {
      if (!fs.existsSync(modelPath)) return;

      const result = await detector.detectLanguage('Bonjour, comment allez-vous?');
      expect(result.primary).toBeDefined();
      expect(result.primary?.language).toBe('fr');
      expect(result.primary?.confidence).toBeGreaterThan(0.9);
    });

    it('should detect Spanish text', async () => {
      if (!fs.existsSync(modelPath)) return;

      const result = await detector.detectLanguage('Hola, ¿cómo estás?');
      expect(result.primary).toBeDefined();
      expect(result.primary?.language).toBe('es');
      expect(result.primary?.confidence).toBeGreaterThan(0.9);
    });

    it('should detect German text', async () => {
      if (!fs.existsSync(modelPath)) return;

      const result = await detector.detectLanguage('Guten Tag, wie geht es Ihnen?');
      expect(result.primary).toBeDefined();
      expect(result.primary?.language).toBe('de');
      expect(result.primary?.confidence).toBeGreaterThan(0.9);
    });

    it('should detect Chinese text', async () => {
      if (!fs.existsSync(modelPath)) return;

      const result = await detector.detectLanguage('你好，你今天好吗？');
      expect(result.primary).toBeDefined();
      // FastText returns 'zh', but we convert it to 'chs' for compatibility
      expect(result.primary?.language).toBe('chs');
      expect(result.primary?.confidence).toBeGreaterThan(0.8);
    });

    it('should detect Japanese text', async () => {
      if (!fs.existsSync(modelPath)) return;

      const result = await detector.detectLanguage('こんにちは、お元気ですか？');
      expect(result.primary).toBeDefined();
      expect(result.primary?.language).toBe('ja');
      expect(result.primary?.confidence).toBeGreaterThan(0.8);
    });

    it('should detect Arabic text', async () => {
      if (!fs.existsSync(modelPath)) return;

      const result = await detector.detectLanguage('مرحبا، كيف حالك؟');
      expect(result.primary).toBeDefined();
      expect(result.primary?.language).toBe('ar');
      expect(result.primary?.confidence).toBeGreaterThan(0.8);
    });

    it('should detect Russian text', async () => {
      if (!fs.existsSync(modelPath)) return;

      const result = await detector.detectLanguage('Привет, как дела?');
      expect(result.primary).toBeDefined();
      expect(result.primary?.language).toBe('ru');
      expect(result.primary?.confidence).toBeGreaterThan(0.8);
    });

    it('should return multiple predictions', async () => {
      if (!fs.existsSync(modelPath)) return;

      const result = await detector.detectLanguage('Hello world');
      expect(result.predictions).toBeDefined();
      expect(result.predictions.length).toBeGreaterThan(0);
      expect(result.predictions[0]).toEqual(result.primary);
    });

    it('should handle empty string', async () => {
      if (!fs.existsSync(modelPath)) return;

      const result = await detector.detectLanguage('');
      expect(result.primary).toBeNull();
      expect(result.predictions).toEqual([]);
    });

    it('should handle whitespace-only string', async () => {
      if (!fs.existsSync(modelPath)) return;

      const result = await detector.detectLanguage('   \n\t  ');
      expect(result.primary).toBeNull();
      expect(result.predictions).toEqual([]);
    });

    it('should throw error for non-string input', async () => {
      if (!fs.existsSync(modelPath)) return;

      await expect(detector.detectLanguage(123 as any)).rejects.toThrow('Input must be a string');
    });

    it('should throw error if model not loaded', async () => {
      const newDetector = new FastTextLanguageDetector();
      await expect(newDetector.detectLanguage('test')).rejects.toThrow('Model not loaded');
    });
  });

  describe('Concurrent Processing', () => {
    beforeEach(async () => {
      if (fs.existsSync(modelPath)) {
        await detector.load();
      }
    });

    it('should handle multiple concurrent requests', async () => {
      if (!fs.existsSync(modelPath)) return;

      const texts = ['Hello world', 'Bonjour le monde', 'Hola mundo', 'Hallo Welt', '你好世界'];

      const promises = texts.map((text) => detector.detectLanguage(text));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(results[0]?.primary?.language).toBe('en');
      expect(results[1]?.primary?.language).toBe('fr');
      expect(results[2]?.primary?.language).toBe('es');
      expect(results[3]?.primary?.language).toBe('de');
      expect(results[4]?.primary?.language).toBe('chs');
    });

    it('should queue requests when workers are busy', async () => {
      if (!fs.existsSync(modelPath)) return;

      // Create detector with small pool size
      const smallPoolDetector = new FastTextLanguageDetector({ poolSize: 1 });
      await smallPoolDetector.load();

      const texts = Array(10).fill('Hello world');
      const promises = texts.map((text) => smallPoolDetector.detectLanguage(text));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.primary?.language).toBe('en');
      });

      await smallPoolDetector.unload();
    });

    it('should throw error when queue is full', async () => {
      if (!fs.existsSync(modelPath)) return;

      // Create detector with tiny queue
      const tinyQueueDetector = new FastTextLanguageDetector({
        poolSize: 1,
        maxQueueSize: 2,
      });
      await tinyQueueDetector.load();

      // Fill up the worker and queue
      const promises: Promise<any>[] = [];

      // Start 4 requests (1 processing, 2 queued, 1 should fail)
      for (let i = 0; i < 4; i++) {
        promises.push(tinyQueueDetector.detectLanguage(`Test ${i}`).catch((err) => err));
      }

      const results = await Promise.all(promises);

      // Check that at least one failed with queue full error
      const errors = results.filter((r) => r instanceof Error);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.message.includes('queue is full'))).toBe(true);

      await tinyQueueDetector.unload();
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      if (fs.existsSync(modelPath)) {
        await detector.load();
      }
    });

    it('should track statistics correctly', async () => {
      if (!fs.existsSync(modelPath)) return;

      // Make some requests
      await detector.detectLanguage('Hello world');
      await detector.detectLanguage('Bonjour le monde');

      const stats = detector.getStats();

      expect(stats.totalRequests).toBe(2);
      expect(stats.completedRequests).toBe(2);
      expect(stats.failedRequests).toBe(0);
      expect(stats.poolSize).toBe(3);
      expect(stats.activeWorkers).toBeGreaterThan(0);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle loading twice gracefully', async () => {
      if (!fs.existsSync(modelPath)) return;

      await detector.load();
      await detector.load(); // Should not throw

      const stats = detector.getStats();
      expect(stats.poolSize).toBe(3);
    });

    it('should handle unloading when not loaded', async () => {
      await expect(detector.unload()).resolves.not.toThrow();
    });

    it('should clean up on unload', async () => {
      if (!fs.existsSync(modelPath)) return;

      await detector.load();
      await detector.unload();

      await expect(detector.detectLanguage('test')).rejects.toThrow('Model not loaded');
    });
  });

  describe('Long Text Handling', () => {
    beforeEach(async () => {
      if (fs.existsSync(modelPath)) {
        await detector.load();
      }
    });

    it('should handle long text', async () => {
      if (!fs.existsSync(modelPath)) return;

      const longText = 'Hello world. '.repeat(1000);
      const result = await detector.detectLanguage(longText);

      expect(result.primary).toBeDefined();
      expect(result.primary?.language).toBe('en');
    });

    it('should handle text with special characters', async () => {
      if (!fs.existsSync(modelPath)) return;

      const specialText = 'Hello @#$%^&*() world! 123456789';
      const result = await detector.detectLanguage(specialText);

      expect(result.primary).toBeDefined();
      expect(result.primary?.language).toBe('en');
    });

    it('should handle text with newlines', async () => {
      if (!fs.existsSync(modelPath)) return;

      const multilineText = 'Hello\\nworld\\nthis\\nis\\na\\ntest';
      const result = await detector.detectLanguage(multilineText);

      expect(result.primary).toBeDefined();
      expect(result.primary?.language).toBe('en');
    });
  });
});
