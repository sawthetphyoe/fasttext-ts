#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MODEL_URL = 'https://dl.fbaipublicfiles.com/fasttext/supervised-models/lid.176.bin';
const MODEL_CHECKSUM = '01810bc59c6a3d2b79c79e6336612f65';
const MODEL_SIZE = 131266198; // bytes
const MODELS_DIR = path.join(__dirname, '..', 'models');
const MODEL_PATH = path.join(MODELS_DIR, 'lid.176.bin');

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function info(msg) {
  console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`);
}

function success(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function warning(msg) {
  console.log(`${colors.yellow}⚠${colors.reset} ${msg}`);
}

function error(msg) {
  console.error(`${colors.red}✗${colors.reset} ${msg}`);
}

function calculateChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function checkExistingModel() {
  if (fs.existsSync(MODEL_PATH)) {
    info('Found existing model, verifying checksum...');
    try {
      const checksum = await calculateChecksum(MODEL_PATH);
      if (checksum === MODEL_CHECKSUM) {
        success('Existing model is valid, skipping download');
        return true;
      } else {
        warning('Existing model is corrupted, re-downloading...');
        fs.unlinkSync(MODEL_PATH);
      }
    } catch (err) {
      warning(`Failed to verify existing model: ${err.message}`);
      fs.unlinkSync(MODEL_PATH);
    }
  }
  return false;
}

function downloadModel() {
  return new Promise((resolve, reject) => {
    const tempPath = `${MODEL_PATH}.downloading`;

    // Clean up any existing temp file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    const file = fs.createWriteStream(tempPath);
    let downloadedBytes = 0;
    let lastProgress = -1;

    info(`Downloading FastText language detection model (${(MODEL_SIZE / 1024 / 1024).toFixed(1)} MB)...`);

    const request = https.get(MODEL_URL, (response) => {
      if (response.statusCode !== 200) {
        fs.unlinkSync(tempPath);
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const progress = Math.floor((downloadedBytes / MODEL_SIZE) * 100);
        
        if (progress !== lastProgress && progress % 5 === 0) {
          process.stdout.write(
            `\rDownloading: ${progress}% [${
              '='.repeat(progress / 2) + ' '.repeat(50 - progress / 2)
            }] ${(downloadedBytes / 1024 / 1024).toFixed(1)} MB`
          );
          lastProgress = progress;
        }
      });

      response.pipe(file);

      file.on('finish', async () => {
        file.close();
        process.stdout.write('\n');
        
        info('Verifying model integrity...');
        try {
          const checksum = await calculateChecksum(tempPath);
          if (checksum !== MODEL_CHECKSUM) {
            fs.unlinkSync(tempPath);
            reject(new Error(`Checksum mismatch. Expected: ${MODEL_CHECKSUM}, Got: ${checksum}`));
            return;
          }
          
          fs.renameSync(tempPath, MODEL_PATH);
          success('Model downloaded and verified successfully');
          resolve();
        } catch (err) {
          fs.unlinkSync(tempPath);
          reject(err);
        }
      });

      file.on('error', (err) => {
        fs.unlinkSync(tempPath);
        reject(err);
      });
    });

    request.on('error', (err) => {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      reject(err);
    });
  });
}

async function main() {
  try {
    // Check if running in CI or with --skip-download flag
    if (process.env.CI || process.env.SKIP_MODEL_DOWNLOAD || process.argv.includes('--skip-download')) {
      warning('Skipping model download (CI environment or --skip-download flag detected)');
      return;
    }

    // Ensure models directory exists
    if (!fs.existsSync(MODELS_DIR)) {
      fs.mkdirSync(MODELS_DIR, { recursive: true });
    }

    // Check if model already exists and is valid
    const modelExists = await checkExistingModel();
    if (modelExists) {
      return;
    }

    // Download the model
    await downloadModel();
    
    info('FastText language detection model is ready for use');
  } catch (err) {
    error(`Failed to set up FastText model: ${err.message}`);
    warning('You can manually download the model later by running: npm run download-model');
    // Don't exit with error code to prevent npm install failure
  }
}

// Run if called directly
if (require.main === module) {
  main();
}