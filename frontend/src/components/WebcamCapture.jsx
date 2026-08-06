import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { Camera } from 'lucide-react';

const WebcamCapture = ({ onCapture, autoCapture = false, captureInterval = 3000, className = '' }) => {
  const webcamRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const onCaptureRef = useRef(onCapture);

  // Selalu update referensi fungsi onCapture terbaru tanpa memicu ulang interval
  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

  useEffect(() => {
    let intervalId;
    if (autoCapture && isReady) {
      intervalId = setInterval(() => {
        capture();
      }, captureInterval);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoCapture, isReady, captureInterval]);

  const capture = () => {
    if (webcamRef.current && webcamRef.current.video) {
      // Gunakan onCaptureRef.current untuk mendapatkan closure state React yang terbaru
      onCaptureRef.current(webcamRef.current.video);
    }
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-gray-900 shadow-xl border-4 border-white/10 mx-auto ${className || 'max-w-md'}`}>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={{ width: 640, height: 480, facingMode: "user" }}
        onUserMedia={() => setIsReady(true)}
        className="w-full h-auto object-cover transform scale-x-[-1]" 
      />
      
      {/* Overlay Scan Area */}
      <div className="absolute inset-0 border-[6px] border-dashed border-white/30 pointer-events-none z-10 m-8 rounded-full flex items-center justify-center">
        <div className="w-48 h-48 border-2 border-emerald-400 rounded-full animate-pulse opacity-50" />
      </div>

      {!autoCapture && (
        <button 
          onClick={(e) => { e.preventDefault(); capture(); }}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-md p-4 rounded-full transition-all text-white shadow-lg z-20"
        >
          <Camera size={28} />
        </button>
      )}
    </div>
  );
};

export default WebcamCapture;
