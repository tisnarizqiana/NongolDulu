import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeToggle from '../components/ThemeToggle';
import { useSettings } from '../context/SettingsContext';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { getLogoUrl } = useSettings();
  const API_URL = import.meta.env.VITE_API_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    const loadingToast = toast.loading('Mengirim kode OTP...');

    try {
      await axios.post(`${API_URL}/forgot-password`, { email });
      toast.success('Kode OTP telah dikirim ke email Anda!', { id: loadingToast });
      
      // Navigate to reset password with email in state
      setTimeout(() => {
        navigate('/reset-password', { state: { email } });
      }, 1500);
    } catch (err) {
      toast.dismiss(loadingToast);
      setError(err.response?.data?.error || 'Koneksi ke server gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300 relative overflow-hidden">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl p-8 relative border border-slate-100 dark:border-slate-800">
        
        <div className="text-center mb-8">
          <img src={getLogoUrl()} alt="Logo" className="w-12 h-12 mx-auto mb-4 object-contain" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Lupa Password?</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            Masukkan alamat email yang terdaftar pada akun Anda. Kami akan mengirimkan tautan untuk mereset password.
          </p>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl text-sm border border-green-100 dark:border-green-800 text-center">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-800 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative group">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium transition-all"
                placeholder="nama@email.com"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#0336ff] hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-2xl transition-colors shadow-lg shadow-blue-500/30 active:scale-[0.98] disabled:opacity-70 flex justify-center"
          >
            {loading ? 'Mengirim...' : 'Kirim Tautan Reset'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
            <ArrowLeft size={16} />
            Kembali ke Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
