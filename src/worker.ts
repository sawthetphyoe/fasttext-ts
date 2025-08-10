import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import type { DetectionResult, LanguagePrediction, WorkerStatus } from './types';

export interface WorkerEvents {
  ready: () => void;
  error: (error: Error) => void;
  exit: (code: number | null, signal: NodeJS.Signals | null) => void;
}

export class FastTextWorker extends EventEmitter {
  private readonly id: number;
  private readonly modelPath: string;
  private process: ChildProcess | null = null;
  private isReady = false;
  private isBusy = false;
  private processedRequests = 0;
  private readonly timeout: number;

  constructor(id: number, modelPath: string, timeout = 5000) {
    super();
    this.id = id;
    this.modelPath = modelPath;
    this.timeout = timeout;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn('fasttext', ['predict-prob', this.modelPath, '-', '2']);

      this.process.on('error', (err) => {
        this.isReady = false;
        this.emit('error', err);
        reject(err);
      });

      this.process.on('exit', (code, signal) => {
        this.isReady = false;
        this.emit('exit', code, signal);
      });

      // Give process time to start
      const startTimer = setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.isReady = true;
          this.emit('ready');
          resolve();
        } else {
          reject(new Error(`Worker ${this.id} failed to start`));
        }
      }, 100);
      startTimer.unref();
    });
  }

  async detect(text: string): Promise<DetectionResult> {
    if (!this.isReady) {
      throw new Error(`Worker ${this.id} is not ready`);
    }

    if (this.isBusy) {
      throw new Error(`Worker ${this.id} is busy`);
    }

    if (!this.process?.stdin || !this.process?.stdout) {
      throw new Error(`Worker ${this.id} process streams are not available`);
    }

    this.isBusy = true;

    return new Promise((resolve, reject) => {
      let result = '';
      const timeoutHandle = setTimeout(() => {
        if (this.process?.stdout) {
          this.process.stdout.removeListener('data', onData);
        }
        this.isBusy = false;
        reject(new Error(`Worker ${this.id} timeout`));
      }, this.timeout);

      const onData = (data: Buffer): void => {
        clearTimeout(timeoutHandle);
        result = data.toString().trim();
        if (this.process?.stdout) {
          this.process.stdout.removeListener('data', onData);
        }
        this.isBusy = false;
        this.processedRequests++;

        // Parse result
        const predictions = this.parseResult(result);
        const primary = predictions.length > 0 ? predictions[0]! : null;

        resolve({ predictions, primary });
      };

      if (this.process?.stdout) {
        this.process.stdout.once('data', onData);
      }

      // Clean and send text
      const cleanedText = text.replace(/\n/g, ' ').replace(/\r/g, ' ').trim();
      const truncatedText = cleanedText.substring(0, 5000);

      // Write text to process
      this.process?.stdin?.write(truncatedText + '\n', 'utf8', (err) => {
        if (err) {
          clearTimeout(timeoutHandle);
          if (this.process?.stdout) {
            this.process.stdout.removeListener('data', onData);
          }
          this.isBusy = false;
          reject(err);
        }
      });
    });
  }

  private parseResult(result: string): LanguagePrediction[] {
    const parts = result.split(/\s+/);
    const predictions: LanguagePrediction[] = [];

    for (let i = 0; i < parts.length; i += 2) {
      const label = parts[i];
      const confidence = parts[i + 1];

      if (label && confidence) {
        const languageCode = label.replace('__label__', '').toLowerCase();
        predictions.push({
          // Convert Chinese to Simplified Chinese for compatibility
          language: languageCode === 'zh' ? 'chs' : languageCode,
          confidence: parseFloat(confidence),
        });
      }
    }

    return predictions;
  }

  stop(): void {
    if (this.process) {
      this.process.stdout?.removeAllListeners();
      this.process.stderr?.removeAllListeners();
      this.process.stdin?.removeAllListeners();
      this.process.removeAllListeners();
      this.process.stdin?.end();

      // Kill immediately for tests, with a fallback
      if (this.process.killed) {
        this.process = null;
        this.isReady = false;
        return;
      }

      this.process.kill('SIGTERM');

      // Use unref() to prevent keeping the process alive
      const killTimer = setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
        this.process = null;
      }, 1000);

      // Allow the timer to be garbage collected if process exits
      killTimer.unref();

      this.process = null;
      this.isReady = false;
    }
  }

  getStatus(): WorkerStatus {
    return {
      id: this.id,
      isReady: this.isReady,
      isBusy: this.isBusy,
      processedRequests: this.processedRequests,
    };
  }

  getId(): number {
    return this.id;
  }

  getIsReady(): boolean {
    return this.isReady;
  }

  getIsBusy(): boolean {
    return this.isBusy;
  }
}
