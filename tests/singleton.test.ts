import { getInstance, unloadInstance } from '../src/singleton';
import * as fs from 'fs';
import * as path from 'path';

describe('Singleton', () => {
  const modelPath = path.join(__dirname, '..', 'models', 'lid.176.bin');

  beforeAll(() => {
    if (!fs.existsSync(modelPath)) {
      console.warn('Model file not found. Skipping tests. Run "npm run download-model" first.');
      return;
    }
  });

  afterEach(async () => {
    await unloadInstance();
  });

  it('should return the same instance on multiple calls', async () => {
    if (!fs.existsSync(modelPath)) return;

    const instance1 = await getInstance();
    const instance2 = await getInstance();

    expect(instance1).toBe(instance2);
  });

  it('should handle concurrent initialization requests', async () => {
    if (!fs.existsSync(modelPath)) return;

    const promises = [getInstance(), getInstance(), getInstance()];

    const instances = await Promise.all(promises);

    expect(instances[0]).toBe(instances[1]);
    expect(instances[1]).toBe(instances[2]);
  });

  it('should work after unloading', async () => {
    if (!fs.existsSync(modelPath)) return;

    const instance1 = await getInstance();
    const result1 = await instance1.detectLanguage('Hello world');
    expect(result1.primary?.language).toBe('en');

    await unloadInstance();

    const instance2 = await getInstance();
    const result2 = await instance2.detectLanguage('Bonjour monde');
    expect(result2.primary?.language).toBe('fr');

    expect(instance1).not.toBe(instance2);
  });

  it('should handle errors during initialization', async () => {
    const invalidOptions = {
      modelPath: '/invalid/path/model.bin',
    };

    await expect(getInstance(invalidOptions)).rejects.toThrow('Model file not found');

    // Should be able to try again with valid options
    if (fs.existsSync(modelPath)) {
      const instance = await getInstance();
      expect(instance).toBeDefined();
    }
  });
});
