export interface LanguagePrediction {
  language: string;
  confidence: number;
}

export interface DetectionResult {
  predictions: LanguagePrediction[];
  primary: LanguagePrediction | null;
}

export interface DetectorOptions {
  modelPath?: string;
  poolSize?: number;
  maxQueueSize?: number;
  timeout?: number;
  confidenceThreshold?: number;
  cache?: boolean;
  cacheSize?: number;
  cacheTTL?: number;
  autoCleanup?: boolean;
}

export interface DetectionOptions {
  threshold?: number;
  topK?: number;
  includeLanguageName?: boolean;
  returnAll?: boolean;
}

export interface WorkerStatus {
  id: number;
  isReady: boolean;
  isBusy: boolean;
  processedRequests: number;
}

export interface PoolStatistics {
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  queuedRequests: number;
  averageResponseTime: number;
  poolSize: number;
  activeWorkers: number;
  busyWorkers: number;
  idleWorkers: number;
  queueLength: number;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
}

export interface Logger {
  log(message: string, level?: LogLevel, data?: unknown): void;
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warning(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
  success(message: string, data?: unknown): void;
}
