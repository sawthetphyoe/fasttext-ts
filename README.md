# FastText Language Detector for TypeScript

A fully-typed, production-ready FastText language detection wrapper for Node.js with TypeScript support. This package provides efficient language identification for 176 languages using Facebook's FastText model.

## Features

- 🚀 **Full TypeScript Support** - Complete type definitions for all APIs
- ⚡ **High Performance** - Worker pool architecture for concurrent processing
- 🔄 **Auto-recovery** - Automatic worker restart on failures
- 📊 **Statistics Tracking** - Built-in performance monitoring
- 🎯 **176 Languages** - Comprehensive language coverage
- 📦 **Zero Configuration** - Model auto-downloads during installation
- 🧪 **Well Tested** - Comprehensive test coverage
- 🔧 **Configurable** - Flexible options for pool size, timeouts, and queues

## Requirements

- Node.js >= 16.0.0
- FastText binary installed on your system

## Installation

```bash
npm install fasttext-ts
```

The FastText model (lid.176.bin) will be automatically downloaded during installation.

### Installing FastText Binary

#### macOS
```bash
brew install fasttext
```

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install fasttext
```

#### Windows
Use WSL (Windows Subsystem for Linux) and follow the Ubuntu instructions.

#### Docker
```dockerfile
RUN apt-get update && apt-get install -y fasttext
```

## Quick Start

```typescript
import { FastTextLanguageDetector } from 'fasttext-ts';

// Create detector instance
const detector = new FastTextLanguageDetector();

// Load the model
await detector.load();

// Detect language
const result = await detector.detectLanguage('Hello, how are you?');
console.log(result.primary);
// Output: { language: 'en', confidence: 0.99 }

// Get all predictions
console.log(result.predictions);
// Output: [
//   { language: 'en', confidence: 0.99 },
//   { language: 'de', confidence: 0.01 },
//   ...
// ]

// Clean up when done
await detector.unload();
```

## Using Singleton Pattern

For applications that need a single shared instance:

```typescript
import { getInstance, unloadInstance } from 'fasttext-ts';

// Get or create singleton instance
const detector = await getInstance();

// Use the detector
const result = await detector.detectLanguage('Bonjour le monde');
console.log(result.primary?.language); // 'fr'

// Cleanup (called automatically on process exit)
await unloadInstance();
```

## Configuration Options

```typescript
const detector = new FastTextLanguageDetector({
  modelPath: '/custom/path/to/model.bin',  // Custom model path
  poolSize: 5,                             // Number of worker processes (default: 3)
  maxQueueSize: 1000,                      // Maximum queue size (default: 500)
  timeout: 10000,                          // Detection timeout in ms (default: 5000)
});
```

## API Reference

### FastTextLanguageDetector

#### Constructor
```typescript
new FastTextLanguageDetector(options?: DetectorOptions)
```

#### Methods

##### load()
Load the model and initialize the worker pool.
```typescript
await detector.load();
```

##### detectLanguage(text: string)
Detect the language of the given text.
```typescript
const result = await detector.detectLanguage('Hello world');
// Returns: DetectionResult
```

##### getStats()
Get current pool statistics.
```typescript
const stats = detector.getStats();
// Returns: PoolStatistics
```

##### unload()
Unload the model and stop all workers.
```typescript
await detector.unload();
```

##### enableLogging()
Enable verbose logging for debugging.
```typescript
detector.enableLogging();
```

### Types

```typescript
interface LanguagePrediction {
  language: string;    // ISO 639-1 language code
  confidence: number;  // Confidence score (0-1)
}

interface DetectionResult {
  predictions: LanguagePrediction[];  // All predictions
  primary: LanguagePrediction | null; // Top prediction
}

interface DetectorOptions {
  modelPath?: string;
  poolSize?: number;
  maxQueueSize?: number;
  timeout?: number;
  confidenceThreshold?: number;
}

interface PoolStatistics {
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
```

## Supported Languages

The detector supports 176 languages. Common ones include:

- `en` - English
- `fr` - French
- `de` - German
- `es` - Spanish
- `it` - Italian
- `pt` - Portuguese
- `nl` - Dutch
- `ru` - Russian
- `chs` - Chinese (Simplified)
- `ja` - Japanese
- `ko` - Korean
- `ar` - Arabic
- `hi` - Hindi
- `tr` - Turkish
- `pl` - Polish
- `sv` - Swedish
- `no` - Norwegian
- `da` - Danish
- `fi` - Finnish
- And 156 more...

## Performance

The detector uses a worker pool architecture for optimal performance:

- **Concurrent Processing**: Multiple detection requests processed in parallel
- **Request Queuing**: Automatic queuing when all workers are busy
- **Auto-recovery**: Failed workers automatically restart
- **Efficient Memory Usage**: Shared model across worker processes

### Benchmarks

On a typical machine with 3 workers:
- Throughput: ~100-200 detections/second
- Average latency: 5-20ms per detection
- Memory usage: ~150MB (shared model)

## Advanced Usage

### Custom Logging

```typescript
import { FastTextLanguageDetector, ConsoleLogger } from 'fasttext-ts';

const detector = new FastTextLanguageDetector();
detector.enableLogging(); // Enable built-in logging

// Or use custom logger
const logger = new ConsoleLogger('MyApp');
logger.info('Starting detection...');
```

### Handling Errors

```typescript
try {
  const result = await detector.detectLanguage(text);
  if (result.primary && result.primary.confidence > 0.8) {
    console.log(`Detected: ${result.primary.language}`);
  } else {
    console.log('Low confidence detection');
  }
} catch (error) {
  if (error.message.includes('queue is full')) {
    // Handle queue overflow
  } else if (error.message.includes('timeout')) {
    // Handle timeout
  } else {
    // Handle other errors
  }
}
```

### Monitoring Performance

```typescript
const stats = detector.getStats();
console.log(`
  Total Requests: ${stats.totalRequests}
  Success Rate: ${(stats.completedRequests / stats.totalRequests * 100).toFixed(2)}%
  Average Response: ${stats.averageResponseTime.toFixed(2)}ms
  Active Workers: ${stats.activeWorkers}/${stats.poolSize}
  Queue Length: ${stats.queueLength}
`);
```

## Docker Integration

```dockerfile
FROM node:18-slim

# Install FastText
RUN apt-get update && \\
    apt-get install -y fasttext && \\
    apt-get clean && \\
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (will download model)
RUN npm ci

# Copy application
COPY . .

# Build TypeScript
RUN npm run build

CMD ["node", "dist/index.js"]
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Development

```bash
# Install dependencies
npm install

# Download model manually
npm run download-model

# Build TypeScript
npm run build

# Watch mode
npm run build:watch

# Lint
npm run lint

# Format code
npm run format
```

## Troubleshooting

### Model Download Issues

If the model fails to download during installation:

```bash
# Manual download
npm run download-model

# Or skip download during install
SKIP_MODEL_DOWNLOAD=1 npm install
```

### FastText Binary Not Found

Ensure FastText is installed and in your PATH:

```bash
which fasttext
fasttext --help
```

### Memory Issues

For large-scale applications, adjust the pool size:

```typescript
const detector = new FastTextLanguageDetector({
  poolSize: 1,  // Reduce workers for lower memory usage
});
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Credits

- Built on top of [FastText](https://fasttext.cc/) by Facebook Research
- TypeScript implementation by Saw Thet Phyoe

## Support

For issues and questions, please use the [GitHub issues page](https://github.com/sawthetphyoe/fasttext-ts/issues).
