# FastText Language Detector for TypeScript

A fully-typed, production-ready FastText language detection wrapper for Node.js with TypeScript support. This package provides efficient language identification for 176 languages using Facebook's FastText model.

## Features

- 🚀 **Full TypeScript Support** - Complete type definitions for all APIs
- ⚡ **High Performance** - Worker pool architecture with built-in caching
- 🔄 **Auto-recovery** - Automatic worker restart on failures
- 📊 **Statistics Tracking** - Built-in performance monitoring
- 🎯 **176 Languages** - Comprehensive language coverage with name mapping
- 📦 **Zero Configuration** - Model auto-downloads during installation
- 🧪 **Well Tested** - Comprehensive test coverage
- 🔧 **Highly Configurable** - Flexible options for pool size, caching, and more
- 🎨 **Multiple APIs** - Simple, batch, and advanced detection methods
- 💾 **Smart Caching** - Built-in LRU cache for repeated detections

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

// Create detector with caching enabled
const detector = new FastTextLanguageDetector({
  cache: true,
  autoCleanup: true
});

// Load the model
await detector.load();

// Simple detection - returns just the language code
const language = await detector.detectSimple('Hello, how are you?');
console.log(language); // 'en'

// Standard detection with full results
const result = await detector.detect('Bonjour le monde');
console.log(result.primary);
// Output: { language: 'fr', confidence: 0.99 }

// Detection with options
const filtered = await detector.detect('Hola mundo', {
  threshold: 0.8,      // Only high confidence
  topK: 3,            // Top 3 languages
  includeLanguageName: true
});
// Output: { language: 'es', languageName: 'Spanish', confidence: 0.99 }

// Batch detection for multiple texts
const results = await detector.detectBatch([
  'Hello world',
  'Bonjour le monde',
  'Hola mundo'
]);
// Returns array of results for each text

// Clean up (automatic if autoCleanup: true)
await detector.unload();
```

## Using Singleton Pattern

For applications that need a single shared instance:

```typescript
import { getInstance, unloadInstance } from 'fasttext-ts';

// Get or create singleton instance
const detector = await getInstance();

// Use the detector
const result = await detector.detect('Bonjour le monde');
console.log(result.primary?.language); // 'fr'

// Cleanup (called automatically on process exit)
await unloadInstance();
```

## Configuration Options

```typescript
const detector = new FastTextLanguageDetector({
  // Model configuration
  modelPath: '/custom/path/to/model.bin',  // Custom model path
  
  // Worker pool configuration
  poolSize: 5,                             // Number of worker processes (default: 3)
  maxQueueSize: 1000,                      // Maximum queue size (default: 500)
  timeout: 10000,                          // Detection timeout in ms (default: 5000)
  
  // Caching configuration
  cache: true,                             // Enable caching (default: false)
  cacheSize: 2000,                         // Max cached entries (default: 1000)
  cacheTTL: 7200000,                       // Cache TTL in ms (default: 3600000 - 1 hour)
  
  // Auto-cleanup
  autoCleanup: true                        // Auto-unload on process exit (default: false)
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

##### detect(text: string, options?: DetectionOptions)
Main detection method with full control over options.
```typescript
const result = await detector.detect('Hello world');
// Returns: DetectionResult

// With options
const filtered = await detector.detect('Hello', {
  threshold: 0.8,
  topK: 3,
  includeLanguageName: true
});
```

##### detectSimple(text: string, threshold?: number)
Simple detection - returns just the language code or null.
```typescript
const lang = await detector.detectSimple('Hello world');
// Returns: 'en' | null
```

##### detectBatch(texts: string[], options?: DetectionOptions)
Batch detection for multiple texts.
```typescript
const results = await detector.detectBatch(['Hello', 'Bonjour']);
// Returns: DetectionResult[]
```

##### getStats()
Get current pool and cache statistics.
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
  cache?: boolean;
  cacheSize?: number;
  cacheTTL?: number;
  autoCleanup?: boolean;
}

interface DetectionOptions {
  threshold?: number;           // Min confidence threshold
  topK?: number;               // Return top K predictions
  includeLanguageName?: boolean;  // Include human-readable names
  returnAll?: boolean;         // Return all predictions or just primary
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

## New in v0.2.0

### 🎯 Simple API
```typescript
// Just need the language? One line!
const lang = await detector.detectSimple('Hello'); // 'en'
```

### 📦 Batch Processing
```typescript
// Process multiple texts efficiently
const results = await detector.detectBatch([
  'Hello world',
  'Bonjour le monde',
  'Hola mundo'
]);
```

### 🔧 Detection Options
```typescript
// Fine-tune your detection
const result = await detector.detect(text, {
  threshold: 0.9,          // Only high confidence
  topK: 3,                // Top 3 languages
  includeLanguageName: true  // Get "English" not just "en"
});
```

### 💾 Built-in Caching
```typescript
// Enable caching for repeated detections
const detector = new FastTextLanguageDetector({ 
  cache: true,
  cacheSize: 2000,
  cacheTTL: 7200000  // 2 hours
});
// Same text detection is 100-500x faster!
```

### 🌍 Language Names
```typescript
import { getLanguageName, LANGUAGE_NAMES } from 'fasttext-ts';

// Get human-readable names
console.log(getLanguageName('en'));  // 'English'
console.log(getLanguageName('fr'));  // 'French'
console.log(getLanguageName('ja'));  // 'Japanese'

// Access full mapping
console.log(LANGUAGE_NAMES);  // { en: 'English', fr: 'French', ... }
```

### 🧹 Auto-Cleanup
```typescript
// Automatic resource management
const detector = new FastTextLanguageDetector({
  autoCleanup: true  // Handles cleanup on process exit
});
// No need to manually call unload()
```

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
  const result = await detector.detect(text);
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

## Changelog

### v0.2.0-beta.1
- ✨ New simplified API: `detect()`, `detectSimple()`, `detectBatch()`
- ✨ Removed legacy methods for cleaner API surface
- ✨ Added built-in LRU cache for repeated detections
- ✨ Added language name mapping (90+ languages)
- ✨ Added `autoCleanup` option for automatic resource management
- ✨ Added `DetectionOptions` interface for fine-tuning
- 🔧 Improved TypeScript types and exports
- 📚 Enhanced documentation with examples

### v0.1.0-beta.1
- 🎉 Initial beta release
- Core language detection functionality
- Worker pool architecture
- TypeScript support
- Auto-download model on install

## Support

For issues and questions, please use the [GitHub issues page](https://github.com/sawthetphyoe/fasttext-ts/issues).
