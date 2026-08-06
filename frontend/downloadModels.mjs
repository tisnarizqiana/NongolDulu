import fs from 'fs';
import path from 'path';
import https from 'https';

const BASE_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';
const MODELS_DIR = path.join(process.cwd(), 'public', 'models');

const files = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

const downloadFile = (filename) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(MODELS_DIR, filename);
    if (fs.existsSync(filePath)) {
      console.log(`[SKIP] ${filename} already exists.`);
      return resolve();
    }
    const file = fs.createWriteStream(filePath);
    https.get(BASE_URL + filename, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`[OK] Downloaded ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      console.error(`[ERROR] Failed to download ${filename}:`, err.message);
      reject(err);
    });
  });
};

const run = async () => {
  console.log('Downloading face-api models...');
  for (const file of files) {
    await downloadFile(file);
  }
  console.log('Done!');
};

run();
