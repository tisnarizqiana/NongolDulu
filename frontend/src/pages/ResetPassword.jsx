import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, ArrowLeft, KeyRound, Mail, CheckCircle2 } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!email) {
      toast.error('Sesi tidak valid. Silakan ulangi proses lupa password.');
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      return setError('Konfirmasi password tidak cocok.');
    }
    if (otp.length !== 6) {
      return setError('OTP harus 6 digit angka.');
    }

    setLoading(true);
    const loadingToast = toast.loading('Memproses password baru...');

    try {
      await axios.post(`${API_URL}/reset-password`, { 
        email,
        otp, 
        new_password: newPassword 
      });
      toast.success('Password berhasil diubah!', { id: loadingToast });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.dismiss(loadingToast);
      setError(err.response?.data?.error || 'Gagal mengubah password.');
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-8 transition-colors duration-300">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md animate-in slide-in-from-bottom-8 duration-700 fade-in">
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 sm:p-10 shadow-2xl shadow-blue-500/10 border border-slate-100 dark:border-slate-700 relative overflow-hidden">
          
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
          
          <div className="text-center mb-8 relative z-10">
            <div className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <KeyRound size={32} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Set Password Baru</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Masukkan 6 digit kode OTP yang kami kirim ke <span className="font-bold text-slate-700 dark:text-slate-300">{email}</span>
            </p>
          </div>

          {success ? (
            <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Berhasil!</h3>
              <p className="text-slate-500 dark:text-slate-400">Password Anda telah berhasil diperbarui.</p>
              <p className="text-sm text-slate-400">Mengalihkan ke halaman login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-bold border border-red-100 dark:border-red-900/50 flex items-center gap-2 animate-in fade-in">
                  <span>⚠️</span> {error}
                </div>
              )}

              <div className="relative group">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="6 Digit OTP"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold tracking-widest text-center transition-all"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password Baru"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium transition-all"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Konfirmasi Password Baru"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium transition-all"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-2xl mt-4 transition-all transform active:scale-[0.98] shadow-lg shadow-blue-500/30 flex items-center justify-center disabled:opacity-70 disabled:hover:scale-100"
              >
                {loading ? 'Memproses...' : 'Ubah Password'}
              </button>
            </form>
          )}
        </div>

        {!success && (
          <div className="mt-8 text-center">
            <Link to="/login" className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 font-bold transition-colors flex items-center justify-center gap-2">
              <ArrowLeft size={18} />
              Kembali ke Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
