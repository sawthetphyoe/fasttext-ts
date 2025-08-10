import { ConsoleLogger, SilentLogger } from '../src/logger';
import { LogLevel } from '../src/types';

describe('Logger', () => {
  describe('ConsoleLogger', () => {
    let logger: ConsoleLogger;
    let consoleSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
      logger = new ConsoleLogger('Test');
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      errorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('should log info messages', () => {
      logger.info('Test message');
      expect(consoleSpy).toHaveBeenCalled();
      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('Test message');
      expect(call).toContain('ℹ');
    });

    it('should log error messages to console.error', () => {
      logger.error('Error message');
      expect(errorSpy).toHaveBeenCalled();
      const call = errorSpy.mock.calls[0][0];
      expect(call).toContain('Error message');
      expect(call).toContain('✗');
    });

    it('should log warning messages', () => {
      logger.warning('Warning message');
      expect(consoleSpy).toHaveBeenCalled();
      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('Warning message');
      expect(call).toContain('⚠');
    });

    it('should log success messages', () => {
      logger.success('Success message');
      expect(consoleSpy).toHaveBeenCalled();
      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('Success message');
      expect(call).toContain('✓');
    });

    it('should log debug messages', () => {
      logger.debug('Debug message');
      expect(consoleSpy).toHaveBeenCalled();
      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('Debug message');
      expect(call).toContain('🐛');
    });

    it('should log with data', () => {
      const data = { key: 'value' };
      logger.info('Message with data', data);
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      const dataCall = consoleSpy.mock.calls[1];
      expect(dataCall[1]).toEqual(data);
    });

    it('should include timestamp in log messages', () => {
      logger.info('Test message');
      const call = consoleSpy.mock.calls[0][0];
      expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include prefix in log messages', () => {
      logger.info('Test message');
      const call = consoleSpy.mock.calls[0][0];
      expect(call).toContain('[Test]');
    });

    it('should work without colors', () => {
      const noColorLogger = new ConsoleLogger('Test', false);
      noColorLogger.info('Test message');
      const call = consoleSpy.mock.calls[0][0];
      expect(call).not.toContain('\x1b[');
    });
  });

  describe('SilentLogger', () => {
    let logger: SilentLogger;
    let consoleSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
      logger = new SilentLogger();
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      errorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('should not output anything', () => {
      logger.info('Test message');
      logger.error('Error message');
      logger.warning('Warning message');
      logger.success('Success message');
      logger.debug('Debug message');
      logger.log('Generic message', LogLevel.INFO);

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should not output data', () => {
      logger.info('Test message', { data: 'value' });

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });
});
