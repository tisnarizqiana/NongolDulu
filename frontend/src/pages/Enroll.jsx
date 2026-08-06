import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { UserPlus, Hash, User, Building2, Camera, ShieldCheck, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import WebcamCapture from '../components/WebcamCapture';
import { extractFaceDescriptor } from '../utils/faceApi';

const Enroll = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialRole = searchParams.get('role') || 'mahasiswa';

  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    nomor_induk: '',
    nama: '',
    role: initialRole,
    departemen: '',
    email: ''
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const generateInduk = async () => {
    try {
      const res = await axios.get(`${API_URL}/generate-induk`);
      setFormData(prev => ({ ...prev, nomor_induk: res.data.nomor_induk }));
    } catch (err) {
      console.error('Error generating nomor induk', err);
    }
  };

  useEffect(() => {
    // Fetch departments
    const fetchDepts = async () => {
      try {
        const res = await axios.get(`${API_URL}/departments`);
        setDepartments(res.data);
      } catch (err) {
        console.error('Error fetching departments', err);
        toast.error('Gagal mengambil data departemen');
      }
    };
    fetchDepts();
    generateInduk();
  }, [API_URL]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCapture = async (videoElement) => {
    if (!formData.nomor_induk || !formData.nama || !formData.role || !formData.email) {
      toast.error('Nomor Induk, Nama, Role, dan Email wajib diisi terlebih dahulu!');
      return;
    }
    
    setIsProcessing(true);
    const loadingToast = toast.loading('Memindai wajah...');

    try {
      const descriptor = await extractFaceDescriptor(videoElement);
      
      if (!descriptor) {
        toast.error('Wajah tidak terdeteksi. Pastikan pencahayaan cukup dan wajah terlihat jelas.', { id: loadingToast });
        setIsProcessing(false);
        return;
      }

      toast.loading('Memvalidasi dan menyimpan data...', { id: loadingToast });

      const response = await axios.post(`${API_URL}/enroll`, {
        ...formData,
        descriptor
      });

      toast.success(response.data.message || 'Registrasi berhasil!', { id: loadingToast });
      setFormData(prev => ({ ...prev, nama: '', departemen: '', email: '' }));
      generateInduk(); // Get the next sequence
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Terjadi kesalahan saat menyimpan data.', { id: loadingToast });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-8 transition-colors duration-300 relative overflow-hidden">
      
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-200 dark:bg-blue-900/30 rounded-full blur-3xl opacity-50 -z-10"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-200 dark:bg-indigo-900/30 rounded-full blur-3xl opacity-50 -z-10"></div>
      
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-5xl mx-auto w-full animate-in fade-in zoom-in-95 duration-500">
      
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-blue-900/5 overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header Section */}
        <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 p-10 text-white text-center overflow-hidden">
          {/* Decorative background shapes */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-5 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-blue-400 opacity-20 blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 mb-5 shadow-lg">
              <UserPlus size={40} className="text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Registrasi Wajah Baru</h1>
            <p className="mt-3 text-blue-100 text-lg font-medium max-w-lg mx-auto">Daftarkan profil ke sistem keamanan cerdas FaceAbsen</p>
          </div>
        </div>
        
        {/* Content Section */}
        <div className="p-8 md:p-10">
          <div className="flex flex-col lg:flex-row gap-12">
            
            {/* Form Section */}
            <div className="lg:w-1/2 space-y-5">
              <div className="mb-2">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="text-blue-500" size={24} />
                  Informasi Identitas
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Lengkapi data diri sebelum melakukan pemindaian wajah.</p>
              </div>

              <div className="relative group">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Role / Peran</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <select 
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium appearance-none transition-all"
                  >
                    <option value="mahasiswa">Mahasiswa</option>
                    <option value="dosen">Dosen</option>
                    <option value="staff">Staff Administrasi</option>
                  </select>
                </div>
              </div>

              <div className="relative group">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1 flex justify-between items-center">
                  <span>Nomor Induk (Otomatis)</span>
                  <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-md">Otomatis</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    name="nomor_induk"
                    value={formData.nomor_induk}
                    readOnly
                    className="w-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none font-bold transition-all cursor-not-allowed"
                    placeholder="Memuat..."
                  />
                </div>
              </div>

              <div className="relative group">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input 
                    type="text" 
                    name="nama"
                    value={formData.nama}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium transition-all placeholder:text-slate-400"
                    placeholder="Masukkan Nama Lengkap Anda"
                  />
                </div>
              </div>

              <div className="relative group">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Email Aktif (Wajib untuk Reset Password)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium transition-all placeholder:text-slate-400"
                    placeholder="nama@email.com"
                  />
                </div>
              </div>

              <div className="relative group">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Departemen / Fakultas</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <select 
                    name="departemen"
                    value={formData.departemen}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium appearance-none transition-all"
                  >
                    <option value="">-- Pilih Departemen --</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.nama_departemen}>{dept.nama_departemen}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Camera Section */}
            <div className="lg:w-1/2 relative lg:border-l lg:border-slate-100 lg:dark:border-slate-800 lg:pl-12 flex flex-col items-center">
              <div className="w-full mb-6 text-center lg:text-left">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center lg:justify-start gap-2">
                  <Camera className="text-indigo-500" size={24} />
                  Pemindaian Wajah
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Arahkan wajah ke kamera dan pastikan pencahayaan cukup terang.</p>
              </div>

              <div className="relative w-full max-w-md mx-auto group">
                
                {/* Scanner overlay decorative frame (hugging the camera tightly) */}
                <div className="absolute -inset-1 border-2 border-dashed border-blue-400/30 dark:border-blue-500/30 rounded-3xl pointer-events-none z-10"></div>
                <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-blue-500 rounded-tl-3xl pointer-events-none z-10 transition-all duration-300 group-hover:border-blue-400"></div>
                <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-blue-500 rounded-tr-3xl pointer-events-none z-10 transition-all duration-300 group-hover:border-blue-400"></div>
                <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-blue-500 rounded-bl-3xl pointer-events-none z-10 transition-all duration-300 group-hover:border-blue-400"></div>
                <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-blue-500 rounded-br-3xl pointer-events-none z-10 transition-all duration-300 group-hover:border-blue-400"></div>

                <div className="w-full rounded-2xl overflow-hidden relative">
                  <WebcamCapture onCapture={handleCapture} autoCapture={false} />
                  
                  {isProcessing && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400" size={24} />
                      </div>
                      <p className="text-white font-bold mt-4 tracking-wide">Menganalisis Biometrik...</p>
                      <p className="text-blue-200 text-xs mt-1 font-medium">Mohon tunggu sebentar</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-4 rounded-xl text-sm font-medium border border-blue-100 dark:border-blue-800/50 w-full max-w-md mx-auto text-center">
                Tekan tombol foto pada kamera ketika wajah Anda sudah berada di tengah bingkai pendaftaran.
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Enroll;
