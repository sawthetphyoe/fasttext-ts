export { FastTextLanguageDetector } from './detector';
export { getInstance, unloadInstance } from './singleton';
export { ConsoleLogger, SilentLogger } from './logger';
export { FastTextWorker } from './worker';
export { LogLevel } from './types';

export type {
  LanguagePrediction,
  DetectionResult,
  DetectorOptions,
  WorkerStatus,
  PoolStatistics,
  Logger,
} from './types';
