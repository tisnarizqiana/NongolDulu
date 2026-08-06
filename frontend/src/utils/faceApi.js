import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;

export const loadModels = async () => {
  if (modelsLoaded) return;
  const MODEL_URL = '/models'; // Assumes models are in public/models
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    modelsLoaded = true;
    console.log('Face models loaded successfully');
  } catch (error) {
    console.error('Error loading face models:', error);
    throw error;
  }
};

export const extractFaceDescriptor = async (videoElement) => {
  if (!modelsLoaded) {
    await loadModels();
  }

  // Detect a single face with highest score
  const detection = await faceapi.detectSingleFace(
    videoElement, 
    new faceapi.TinyFaceDetectorOptions()
  ).withFaceLandmarks().withFaceDescriptor();

  return detection ? Array.from(detection.descriptor) : null;
};
