export { FastTextLanguageDetector } from './detector';
export { getInstance, unloadInstance } from './singleton';
export { ConsoleLogger, SilentLogger } from './logger';
export { FastTextWorker } from './worker';
export { LogLevel } from './types';
export { getLanguageName, LANGUAGE_NAMES } from './language-names';
export { DetectionCache } from './cache';

export type {
  LanguagePrediction,
  DetectionResult,
  DetectorOptions,
  DetectionOptions,
  WorkerStatus,
  PoolStatistics,
  Logger,
} from './types';
