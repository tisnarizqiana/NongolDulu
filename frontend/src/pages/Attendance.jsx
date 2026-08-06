import React, { useState, useRef } from 'react';
import axios from 'axios';
import { ScanFace, MapPin, CheckCircle, XCircle, Loader, Sparkles } from 'lucide-react';
import WebcamCapture from '../components/WebcamCapture';
import { extractFaceDescriptor } from '../utils/faceApi';
import { useSettings } from '../context/SettingsContext';

const Attendance = ({ isAdminMode = false }) => {
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastMatch, setLastMatch] = useState(null);
  
  // State jeda sukses. Jika true, layar redup 3 detik, lalu balik false otomatis
  const [isCooldown, setIsCooldown] = useState(false); 
  
  const { getLogoUrl } = useSettings();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const triggerCooldown = () => {
    setIsCooldown(true);
    setTimeout(() => {
      setIsCooldown(false);
      setLastMatch(null);
      setStatus({ type: '', message: '' });
    }, 3000); // 3 seconds seamless resume
  };

  const handleCapture = async (videoElement) => {
    if (isProcessing || isCooldown) return;
    
    setIsProcessing(true);
    setLastMatch(null);
    setStatus({ type: 'info', message: 'Mendeteksi wajah...' });

    try {
      const descriptor = await extractFaceDescriptor(videoElement);
      
      if (!descriptor) {
        setStatus({ type: 'error', message: 'Wajah tidak terdeteksi.' });
        setIsProcessing(false);
        return;
      }

      setStatus({ type: 'info', message: 'Memverifikasi presensi...' });

      const response = await axios.post(`${API_URL}/attend`, {
        descriptor,
        latitude: null, // Kita nonaktifkan geolokasi paksa demi kecepatan kiosk, atau bisa di-enable lagi
        longitude: null
      });

      setLastMatch(response.data.user);
      setStatus({ type: 'success', message: response.data.message });
      triggerCooldown();
      
    } catch (error) {
      console.error(error);
      const errResponse = error.response?.data;
      
      setStatus({ 
        type: 'error', 
        message: errResponse?.error || errResponse?.message || 'Wajah tidak dikenali / Kesalahan server.' 
      });

      if (error.response?.status === 400 && errResponse?.user) {
        // Kasus "Sudah Absen" atau "Tidak ada jadwal"
        setLastMatch(errResponse.user);
        triggerCooldown();
      } else {
        // Kesalahan lain, misal wajah tak dikenali.
        setTimeout(() => {
          setStatus({ type: '', message: '' });
        }, 3000);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`w-full px-4 py-8 animate-in fade-in zoom-in-95 duration-500 relative ${isAdminMode ? 'max-w-6xl h-full flex items-center mx-auto' : 'max-w-4xl mx-auto'}`}>
      
      {/* Decorative background elements specific to Kiosk */}
      <div className="absolute top-[10%] left-[-5%] w-[40%] h-[60%] bg-blue-200/50 dark:bg-blue-900/20 rounded-full blur-[100px] opacity-60 pointer-events-none -z-10"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[60%] bg-indigo-200/50 dark:bg-indigo-900/20 rounded-full blur-[100px] opacity-60 pointer-events-none -z-10"></div>
      
      <div className={`w-full bg-white dark:bg-slate-900 shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10 ${isAdminMode ? 'rounded-[2rem] lg:flex lg:flex-row min-h-[550px]' : 'rounded-[2.5rem]'}`}>
        
        {/* Kiosk Header */}
        <div className={`relative bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-500 dark:from-blue-800 dark:via-indigo-900 dark:to-blue-900 text-white overflow-hidden flex flex-col justify-center ${isAdminMode ? 'p-8 lg:p-12 lg:w-[35%] text-center lg:text-left' : 'py-8 px-6 lg:py-10 lg:px-12 text-center'}`}>
          {/* Decorative patterns */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-10 w-40 h-40 bg-indigo-300 opacity-20 rounded-full blur-2xl"></div>
          <div className="absolute inset-0 mix-blend-overlay opacity-30 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 15px, rgba(255,255,255,0.05) 15px, rgba(255,255,255,0.05) 16px, transparent 16px, transparent 32px, rgba(255,255,255,0.1) 32px, rgba(255,255,255,0.1) 34px)' }}></div>
          
          <div className="relative z-10">
            <div className={`inline-flex items-center justify-center rounded-[2rem] bg-white/20 backdrop-blur-md border border-white/30 shadow-xl relative p-3 ${isAdminMode ? 'w-20 h-20 mb-4' : 'w-24 h-24 mb-6'}`}>
              <img src={getLogoUrl()} alt="Nongol Dulu Logo" className="w-full h-full object-contain drop-shadow-md" />
              <div className="absolute -top-2 -right-2 bg-blue-400 rounded-full p-1.5 shadow-lg animate-pulse">
                <Sparkles size={14} className="text-white" />
              </div>
            </div>
            <h1 className={`${isAdminMode ? 'text-3xl lg:text-4xl' : 'text-3xl md:text-5xl'} font-black tracking-tight drop-shadow-sm mb-3`}>Nongol Dulu</h1>
            <p className={`text-blue-100 font-medium leading-relaxed ${isAdminMode ? 'text-base lg:text-lg' : 'text-lg max-w-lg mx-auto'}`}>
              Silakan menghadap kamera secara bergantian <br className={isAdminMode ? "hidden lg:block" : "hidden sm:block"} />
              <span className={`opacity-80 font-normal block mt-1 ${isAdminMode ? 'text-sm' : 'text-base'}`}>(Tanpa perlu menyentuh layar)</span>
            </p>
          </div>
        </div>
        
        <div className={`text-center bg-white dark:bg-slate-900 relative flex flex-col justify-center items-center ${isAdminMode ? 'p-8 lg:p-12 flex-1 w-full' : 'p-4 sm:p-6 md:p-10'}`}>
          
          <div className="mb-4 h-14 flex items-center justify-center">
            {status.message && (
              <div className={`px-5 py-3 rounded-2xl flex items-center justify-center gap-3 shadow-sm border animate-in fade-in slide-in-from-bottom-2 ${
                status.type === 'error' ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30' :
                status.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' :
                'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'
              }`}>
                {status.type === 'error' && <XCircle className="w-6 h-6 flex-shrink-0" />}
                {status.type === 'success' && <CheckCircle className="w-6 h-6 flex-shrink-0" />}
                {status.type === 'info' && <Loader className="w-5 h-5 flex-shrink-0 animate-spin" />}
                <p className="font-bold text-sm md:text-base tracking-wide text-center">{status.message}</p>
              </div>
            )}
          </div>

          <div className="relative inline-block w-full">
            <WebcamCapture 
              onCapture={handleCapture} 
              autoCapture={!isCooldown} 
              captureInterval={2000} 
              className={isAdminMode ? 'w-full max-w-3xl' : 'max-w-md'} 
            />
            {isProcessing && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm rounded-[1.8rem]">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl flex flex-col items-center gap-3 border border-slate-100 dark:border-slate-700">
                  <Loader className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Memproses...</span>
                </div>
              </div>
            )}
            {isCooldown && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md rounded-[1.8rem] text-white transition-all duration-500 p-4 md:p-8 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]">
                <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center mb-4 md:mb-6 shadow-[0_0_30px_rgba(0,0,0,0.3)] ${status.type === 'success' ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                  {status.type === 'success' ? (
                     <CheckCircle className="w-10 h-10 md:w-16 md:h-16 text-emerald-400 animate-bounce" />
                  ) : (
                     <XCircle className="w-10 h-10 md:w-16 md:h-16 text-amber-400 animate-pulse" />
                  )}
                </div>
                <h3 className="text-xl md:text-3xl font-black mb-2 md:mb-3 tracking-wide text-center px-2 leading-tight">{lastMatch?.nama || 'Selesai'}</h3>
                <p className={`text-sm md:text-lg font-medium mb-4 md:mb-8 text-center px-2 leading-snug ${status.type === 'success' ? 'text-emerald-300' : 'text-amber-300'}`}>{status.message}</p>
                <div className="flex items-center justify-center gap-2 text-xs md:text-sm text-slate-300 bg-black/30 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/10 w-max max-w-full text-center">
                  <Loader className="w-3 h-3 md:w-4 md:h-4 animate-spin flex-shrink-0" />
                  <span className="truncate">Menyiapkan antrian berikutnya...</span>
                </div>
              </div>
            )}
          </div>
          
          <div className={`${isAdminMode ? 'mt-6 pt-4' : 'mt-10 pt-6'} border-t border-slate-100 dark:border-slate-800 w-full`}>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2 uppercase tracking-widest">
              <MapPin size={16} /> Terminal Kiosk Aktif
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
