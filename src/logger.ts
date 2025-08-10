import type { Logger } from './types';
import { LogLevel } from './types';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
} as const;

export class ConsoleLogger implements Logger {
  private readonly prefix: string;
  private readonly enableColors: boolean;

  constructor(prefix = 'FastText', enableColors = true) {
    this.prefix = prefix;
    this.enableColors = enableColors;
  }

  private colorize(text: string, color: string): string {
    if (!this.enableColors) return text;
    return `${color}${text}${colors.reset}`;
  }

  private formatMessage(message: string, level: LogLevel): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.prefix}]`;

    const icons: Record<LogLevel, string> = {
      debug: '🐛',
      info: 'ℹ',
      warning: '⚠',
      error: '✗',
      success: '✓',
    };

    const levelColors: Record<LogLevel, string> = {
      debug: colors.dim,
      info: colors.cyan,
      warning: colors.yellow,
      error: colors.red,
      success: colors.green,
    };

    const icon = icons[level];
    const color = levelColors[level];

    return this.colorize(`${prefix} ${icon} ${message}`, color);
  }

  log(message: string, level: LogLevel = LogLevel.INFO, data?: unknown): void {
    const formattedMessage = this.formatMessage(message, level);

    if (level === LogLevel.ERROR) {
      console.error(formattedMessage);
    } else {
      // eslint-disable-next-line no-console
      console.log(formattedMessage);
    }

    if (data !== undefined) {
      // eslint-disable-next-line no-console
      console.log(this.colorize('  Data:', colors.dim), data);
    }
  }

  debug(message: string, data?: unknown): void {
    this.log(message, LogLevel.DEBUG, data);
  }

  info(message: string, data?: unknown): void {
    this.log(message, LogLevel.INFO, data);
  }

  warning(message: string, data?: unknown): void {
    this.log(message, LogLevel.WARNING, data);
  }

  error(message: string, data?: unknown): void {
    this.log(message, LogLevel.ERROR, data);
  }

  success(message: string, data?: unknown): void {
    this.log(message, LogLevel.SUCCESS, data);
  }
}

export class SilentLogger implements Logger {
  log(_message: string, _level?: LogLevel, _data?: unknown): void {
    // Silent logger does nothing
  }

  debug(_message: string, _data?: unknown): void {
    // Silent logger does nothing
  }

  info(_message: string, _data?: unknown): void {
    // Silent logger does nothing
  }

  warning(_message: string, _data?: unknown): void {
    // Silent logger does nothing
  }

  error(_message: string, _data?: unknown): void {
    // Silent logger does nothing
  }

  success(_message: string, _data?: unknown): void {
    // Silent logger does nothing
  }
}
