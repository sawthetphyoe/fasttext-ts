import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type {
  DetectionResult,
  DetectorOptions,
  DetectionOptions,
  Logger,
  PoolStatistics,
  LanguagePrediction,
} from './types';
import { ConsoleLogger, SilentLogger } from './logger';
import { FastTextWorker } from './worker';
import { DetectionCache } from './cache';
import { getLanguageName } from './language-names';

interface QueuedRequest {
  text: string;
  resolve: (result: DetectionResult) => void;
  reject: (error: Error) => void;
  startTime: number;
}

export class FastTextLanguageDetector {
  private readonly modelPath: string;
  private readonly poolSize: number;
  private readonly maxQueueSize: number;
  private readonly timeout: number;
  private readonly autoCleanup: boolean;
  private logger: Logger;
  private cache: DetectionCache | null = null;

  private workers: FastTextWorker[] = [];
  private requestQueue: QueuedRequest[] = [];
  private isLoaded = false;
  private isLoading = false;

  private stats: PoolStatistics = {
    totalRequests: 0,
    completedRequests: 0,
    failedRequests: 0,
    queuedRequests: 0,
    averageResponseTime: 0,
    poolSize: 0,
    activeWorkers: 0,
    busyWorkers: 0,
    idleWorkers: 0,
    queueLength: 0,
  };

  constructor(options: DetectorOptions = {}) {
    const defaultModelPath = path.join(__dirname, '..', 'models', 'lid.176.bin');

    this.modelPath = options.modelPath || defaultModelPath;
    this.poolSize = options.poolSize || 3;
    this.maxQueueSize = options.maxQueueSize || 500;
    this.timeout = options.timeout || 5000;
    this.autoCleanup = options.autoCleanup || false;

    // Use silent logger by default for library usage
    this.logger = new SilentLogger();

    // Initialize cache if enabled
    if (options.cache) {
      this.cache = new DetectionCache(options.cacheSize || 1000, options.cacheTTL || 3600000);
    }

    // Setup auto-cleanup if enabled
    if (this.autoCleanup) {
      process.once('exit', () => void this.unload());
      process.once('SIGINT', () => void this.unload());
      process.once('SIGTERM', () => void this.unload());
    }
  }

  /**
   * Check if the detector is loaded
   */
  isModelLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Enable verbose logging (useful for debugging)
   */
  enableLogging(): void {
    this.logger = new ConsoleLogger();
  }

  /**
   * Check if FastText binary is installed
   */
  private checkFastTextBinary(): void {
    try {
      execSync('which fasttext', { stdio: 'ignore' });
    } catch {
      const platform = process.platform;
      let installCommand: string;

      if (platform === 'darwin') {
        installCommand = 'brew install fasttext';
      } else if (platform === 'win32') {
        installCommand = 'Use WSL and run: sudo apt-get update && sudo apt-get install fasttext';
      } else {
        installCommand = 'sudo apt-get update && sudo apt-get install fasttext';
      }

      throw new Error(`FastText binary not found. Please install it first:\n  ${installCommand}`);
    }
  }

  /**
   * Load the FastText model and initialize worker pool
   */
  async load(): Promise<void> {
    if (this.isLoading) {
      throw new Error('Model is already being loaded');
    }

    if (this.isLoaded) {
      this.logger.warning('Model already loaded');
      return;
    }

    this.isLoading = true;

    try {
      // Check if model exists
      if (!fs.existsSync(this.modelPath)) {
        throw new Error(
          `Model file not found at ${this.modelPath}. ` +
            `Please run 'npm run download-model' or ensure the model is downloaded during npm install.`
        );
      }

      // Check FastText binary
      this.checkFastTextBinary();

      // Start worker pool
      this.logger.info(`Starting ${this.poolSize} FastText workers...`);
      const startPromises: Promise<void>[] = [];

      for (let i = 0; i < this.poolSize; i++) {
        const worker = new FastTextWorker(i, this.modelPath, this.timeout);

        worker.on('error', (err: Error) => {
          this.logger.error(`Worker ${i} error: ${err.message}`);
          void this.restartWorker(i);
        });

        worker.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
          this.logger.warning(`Worker ${i} exited (code: ${code}, signal: ${signal})`);
          void this.restartWorker(i);
        });

        this.workers.push(worker);
        startPromises.push(worker.start());
      }

      await Promise.all(startPromises);

      this.isLoading = false;
      this.isLoaded = true;
      this.stats.poolSize = this.poolSize;

      this.logger.success(`FastText pool loaded with ${this.poolSize} workers`);

      // Start processing queued requests
      this.processQueue();
    } catch (error) {
      this.isLoading = false;
      // Clean up any started workers
      this.workers.forEach((worker) => worker.stop());
      this.workers = [];
      throw error;
    }
  }

  /**
   * Restart a failed worker
   */
  private async restartWorker(workerId: number): Promise<void> {
    if (!this.isLoaded) return;

    this.logger.info(`Restarting worker ${workerId}...`);
    const worker = this.workers[workerId];

    if (worker) {
      worker.stop();

      try {
        await worker.start();
        this.logger.success(`Worker ${workerId} restarted successfully`);
        this.processQueue();
      } catch (error) {
        this.logger.error(`Failed to restart worker ${workerId}: ${(error as Error).message}`);
        // Try again after delay
        const retryTimer = setTimeout(() => void this.restartWorker(workerId), 5000);
        retryTimer.unref();
      }
    }
  }

  /**
   * Find an available worker
   */
  private getAvailableWorker(): FastTextWorker | undefined {
    return this.workers.find((worker) => worker.getIsReady() && !worker.getIsBusy());
  }

  /**
   * Process queued requests
   */
  private processQueue(): void {
    while (this.requestQueue.length > 0) {
      const worker = this.getAvailableWorker();
      if (!worker) break;

      const request = this.requestQueue.shift();
      if (request) {
        this.stats.queuedRequests--;
        void this.executeRequest(worker, request);
      }
    }
  }

  /**
   * Execute a detection request on a worker
   */
  private async executeRequest(
    worker: FastTextWorker,
    { text, resolve, reject, startTime }: QueuedRequest
  ): Promise<void> {
    try {
      const result = await worker.detect(text);

      // Update statistics
      const responseTime = Date.now() - startTime;
      this.stats.completedRequests++;
      this.stats.averageResponseTime =
        (this.stats.averageResponseTime * (this.stats.completedRequests - 1) + responseTime) /
        this.stats.completedRequests;

      resolve(result);

      // Process next queued request
      this.processQueue();
    } catch (error) {
      this.stats.failedRequests++;
      reject(error as Error);

      // Process next queued request
      this.processQueue();
    }
  }

  /**
   * Main detection method with options
   */
  async detect(
    text: string,
    options: DetectionOptions = {}
  ): Promise<DetectionResult> {
    // Input validation
    if (typeof text !== 'string') {
      throw new TypeError('Input must be a string');
    }

    if (!text || text.trim().length === 0) {
      return { predictions: [], primary: null };
    }

    if (!this.isLoaded) {
      throw new Error('Model not loaded. Call load() first.');
    }

    // Check cache first
    if (this.cache) {
      const cached = this.cache.get(text);
      if (cached) {
        return this.applyOptions(cached, options);
      }
    }

    // Update statistics
    this.stats.totalRequests++;

    // Find available worker or queue request
    const worker = this.getAvailableWorker();
    
    let result: DetectionResult;

    if (worker) {
      // Execute immediately
      result = await new Promise((resolve, reject) => {
        void this.executeRequest(worker, {
          text,
          resolve,
          reject,
          startTime: Date.now(),
        });
      });
    } else {
      // Queue the request
      if (this.requestQueue.length >= this.maxQueueSize) {
        throw new Error(`Request queue is full (${this.maxQueueSize} requests)`);
      }

      result = await new Promise((resolve, reject) => {
        this.stats.queuedRequests++;
        this.requestQueue.push({
          text,
          resolve,
          reject,
          startTime: Date.now(),
        });
      });
    }

    // Store in cache
    if (this.cache && result.primary) {
      this.cache.set(text, result);
    }

    return this.applyOptions(result, options);
  }

  /**
   * Simple language detection - returns just the language code
   */
  async detectSimple(text: string, threshold = 0.5): Promise<string | null> {
    const result = await this.detect(text);

    if (!result.primary || result.primary.confidence < threshold) {
      return null;
    }

    return result.primary.language;
  }

  /**
   * Batch language detection for multiple texts
   */
  async detectBatch(
    texts: string[],
    options: DetectionOptions = {}
  ): Promise<DetectionResult[]> {
    // Process in parallel but respect the worker pool
    const results = await Promise.all(
      texts.map((text) => this.detect(text, options))
    );

    return results;
  }

  /**
   * Apply detection options to results
   */
  private applyOptions(result: DetectionResult, options: DetectionOptions): DetectionResult {
    let predictions = [...result.predictions];

    // Apply threshold filter
    if (options.threshold !== undefined) {
      const threshold = options.threshold;
      predictions = predictions.filter((p) => p.confidence >= threshold);
    }

    // Limit to topK results
    if (options.topK && options.topK > 0) {
      predictions = predictions.slice(0, options.topK);
    }

    // Add language names if requested
    if (options.includeLanguageName) {
      predictions = predictions.map(
        (p) =>
          ({
            ...p,
            languageName: getLanguageName(p.language),
          }) as LanguagePrediction
      );
    }

    // Return all predictions or just primary
    if (options.returnAll === false && result.primary) {
      predictions = [result.primary];
    }

    return {
      predictions,
      primary: predictions.length > 0 ? predictions[0]! : null,
    };
  }

  /**
   * Get current pool statistics
   */
  getStats(): PoolStatistics {
    const activeWorkers = this.workers.filter((w) => w.getIsReady()).length;
    const busyWorkers = this.workers.filter((w) => w.getIsBusy()).length;

    return {
      ...this.stats,
      poolSize: this.poolSize,
      activeWorkers,
      busyWorkers,
      idleWorkers: activeWorkers - busyWorkers,
      queueLength: this.requestQueue.length,
    };
  }

  /**
   * Unload the model and stop all workers
   */
  async unload(): Promise<void> {
    this.isLoaded = false;

    // Clear request queue
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        request.reject(new Error('Service shutting down'));
      }
    }

    // Stop all workers
    this.workers.forEach((worker) => worker.stop());
    this.workers = [];

    this.logger.info('FastText pool unloaded');
  }
}
