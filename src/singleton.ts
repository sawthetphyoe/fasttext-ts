import { FastTextLanguageDetector } from './detector';
import type { DetectorOptions } from './types';

let instance: FastTextLanguageDetector | null = null;
let initializationPromise: Promise<FastTextLanguageDetector> | null = null;

/**
 * Get or create a singleton instance of FastTextLanguageDetector
 */
export async function getInstance(options?: DetectorOptions): Promise<FastTextLanguageDetector> {
  // If already initialized, return the instance
  if (instance && instance.isModelLoaded()) {
    return instance;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = (async (): Promise<FastTextLanguageDetector> => {
    try {
      instance = new FastTextLanguageDetector(options);
      await instance.load();
      return instance;
    } catch (error) {
      instance = null;
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

/**
 * Unload the singleton instance
 */
export async function unloadInstance(): Promise<void> {
  if (instance) {
    await instance.unload();
    instance = null;
    initializationPromise = null;
  }
}

// Handle process termination
process.once('SIGINT', async () => {
  await unloadInstance();
});

process.once('SIGTERM', async () => {
  await unloadInstance();
});
