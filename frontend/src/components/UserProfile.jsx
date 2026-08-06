import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Mail, Save, User, Lock, KeyRound, Send, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const UserProfile = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [nama, setNama] = useState(user?.nama || '');
  const [email, setEmail] = useState(user?.email || '');
  
  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  if (!isOpen) return null;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!nama || !email) return toast.error('Nama dan Email wajib diisi');

    setLoadingProfile(true);
    const loadingToast = toast.loading('Memperbarui profil...');

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/user/profile`, { nama, email }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Profil berhasil diperbarui!', { id: loadingToast });
      
      // Update local storage so data persists after reload
      const storedUser = JSON.parse(localStorage.getItem('user_profile') || '{}');
      localStorage.setItem('user_profile', JSON.stringify({ ...storedUser, nama, email }));
      
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal memperbarui profil', { id: loadingToast });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!email) return toast.error('Harap isi dan simpan email Anda terlebih dahulu.');
    setLoadingOtp(true);
    const loadingToast = toast.loading('Meminta OTP...');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/user/request-otp`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('OTP berhasil dikirim ke email Anda!', { id: loadingToast });
      setIsOtpSent(true);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal mengirim OTP', { id: loadingToast });
    } finally {
      setLoadingOtp(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword) return toast.error('OTP dan Password Baru wajib diisi');
    
    setLoadingPassword(true);
    const loadingToast = toast.loading('Mengganti password...');
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/user/change-password`, { otp, new_password: newPassword }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Password berhasil diubah!', { id: loadingToast });
      setOtp('');
      setNewPassword('');
      setIsOtpSent(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal mengubah password', { id: loadingToast });
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-slate-50 dark:bg-slate-900 rounded-[2rem] w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 relative">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Profil & Keamanan</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pengaturan akun Anda</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors active:scale-95"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Update Profile Section */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Informasi Pribadi</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ubah nama & alamat email pemulihan</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input 
                    type="text" 
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Nama Lengkap"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium transition-all"
                  />
                </div>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email (Wajib untuk OTP & Reset Password)"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium transition-all"
                  />
                </div>
                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={loadingProfile}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-colors shadow-lg shadow-blue-500/30 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    {loadingProfile ? 'Menyimpan...' : 'Simpan Profil'}
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password Section */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl">
                  <Lock size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Ganti Password</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Set password baru dengan verifikasi OTP</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-between space-y-4">
                {!isOtpSent ? (
                  <div className="flex flex-col h-full justify-center text-center px-2">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                      <Lock size={32} />
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
                      Anda akan menerima kode verifikasi OTP yang dikirim ke email terdaftar Anda (<strong>{email || 'Belum diatur'}</strong>).
                    </p>
                    <button 
                      onClick={handleRequestOtp} 
                      disabled={loadingOtp || !email}
                      className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-500 border border-amber-200 dark:border-amber-800/50 font-bold py-3.5 px-6 rounded-2xl transition-colors active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                      <Send size={20} />
                      {loadingOtp ? 'Memproses...' : 'Kirim Kode OTP'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="relative group">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={20} />
                      <input 
                        type="text" 
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="Masukkan 6 Digit OTP"
                        maxLength={6}
                        required
                        className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-bold tracking-widest text-center transition-all"
                      />
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={20} />
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Password Baru"
                        required
                        className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-medium transition-all"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button 
                        type="button" 
                        onClick={() => setIsOtpSent(false)}
                        className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-2xl transition-colors active:scale-95"
                      >
                        Batal
                      </button>
                      <button 
                        type="submit" 
                        disabled={loadingPassword}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 px-6 rounded-2xl transition-colors shadow-lg shadow-amber-500/30 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={20} />
                        {loadingPassword ? 'Memproses...' : 'Ubah Password'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
