import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Shield, Lock, User, AlertCircle, LogIn, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const Login = () => {
  const [nomorInduk, setNomorInduk] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { settings, getLogoUrl } = useSettings();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/login`, {
        nomor_induk: nomorInduk,
        password: password
      });
      
      const userData = response.data.user;
      login(userData);
      
      // Redirect based on role
      const { role } = userData;
      if (role === 'admin') navigate('/admin');
      else if (role === 'dosen') navigate('/lecturer');
      else if (role === 'staff') navigate('/staff');
      else navigate('/student');
      
    } catch (err) {
      setError(err.response?.data?.error || 'Koneksi ke server gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-8 transition-colors duration-300 relative overflow-hidden">
      
      {/* Optional page-level decorative elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-100 dark:bg-slate-900 rounded-full blur-3xl opacity-50 -z-10"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-100 dark:bg-slate-900 rounded-full blur-3xl opacity-50 -z-10"></div>

      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      
      <div className="max-w-[1050px] w-full bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl flex flex-col md:flex-row min-h-[600px] border border-slate-100 dark:border-slate-800 relative">
        
        {/* Left Side - Brand & Graphics */}
        <div className="md:w-[45%] bg-[#0336ff] dark:bg-slate-900 relative overflow-hidden flex flex-col p-10 lg:p-14 text-white z-10 md:rounded-l-[2rem] md:rounded-r-none rounded-[2rem] shadow-[20px_0_40px_-15px_rgba(0,0,0,0.3)]">
          
          {/* Diagonal Lines Background */}
          <div 
            className="absolute inset-0 mix-blend-overlay opacity-60 pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 15px, rgba(255,255,255,0.04) 15px, rgba(255,255,255,0.04) 16px, transparent 16px, transparent 32px, rgba(255,255,255,0.08) 32px, rgba(255,255,255,0.08) 34px)'
            }}
          ></div>

          {/* Floating Light Flare Bottom Left */}
          <div className="absolute bottom-[-15%] left-[-15%] w-64 h-64 bg-[#00f2fe]/60 rounded-full blur-[80px] mix-blend-screen pointer-events-none"></div>
          
          {/* Subtle Particles/Stars */}
          <div className="absolute top-[30%] left-[10%] w-1 h-1 bg-white rounded-full shadow-[0_0_8px_2px_rgba(255,255,255,0.8)]"></div>
          <div className="absolute top-[60%] right-[20%] w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.8)] opacity-70"></div>
          <div className="absolute bottom-[20%] right-[30%] w-1 h-1 bg-white rounded-full shadow-[0_0_8px_2px_rgba(255,255,255,0.6)]"></div>

          {/* Logo Section */}
          <div className="relative z-10 flex items-center gap-3 mb-auto">
            <img src={getLogoUrl()} alt="Logo NONGOL" className="w-10 h-10 object-contain drop-shadow-sm" />
            <div className="leading-[1.1] font-bold tracking-wide text-xl whitespace-nowrap">
              {settings.app_name}
            </div>
          </div>
          
          {/* Main Text Section */}
          <div className="relative z-10 mt-auto">
            <h1 className="text-5xl lg:text-[3.5rem] font-bold mb-6 tracking-tight leading-[1.1]">
              Hello, <br /> welcome!
            </h1>
            <p className="text-blue-50 dark:text-slate-300 text-sm leading-relaxed max-w-[280px] font-light mb-8">
              Sistem presensi wajah otomatis dan portal akademik modern. Silakan masuk untuk melanjutkan.
            </p>
            <button type="button" className="bg-white text-[#0336ff] font-bold px-8 py-3 rounded-full text-sm hover:bg-slate-100 transition-colors shadow-lg hover:shadow-xl active:scale-95 transform">
              View more
            </button>
          </div>
        </div>
        
        {/* Right Side - Login Form */}
        <div className="md:w-[55%] p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-white dark:bg-slate-900 relative">
          
          <div className="w-full max-w-sm mx-auto pl-0 md:pl-6">
            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">Sign in</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Silakan masukkan kredensial Anda untuk melanjutkan</p>
            
            {error && (
              <div className="p-4 rounded-xl mb-6 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/50 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="font-medium text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">User Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <User className="text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" size={20} />
                  </div>
                  <input 
                    type="text" 
                    value={nomorInduk}
                    onChange={(e) => setNomorInduk(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/60 pl-12 pr-4 py-4 rounded-2xl border-2 border-transparent focus:border-blue-500/30 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-white font-medium outline-none transition-all shadow-sm"
                    placeholder="Masukkan Username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Lock className="text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" size={20} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/60 pl-12 pr-12 py-4 rounded-2xl border-2 border-transparent focus:border-blue-500/30 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-white font-medium outline-none transition-all shadow-sm"
                    placeholder="Masukkan Password"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none p-1 rounded-md"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-600 w-4 h-4" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">Forgot Password?</Link>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-6 py-4 rounded-2xl font-bold tracking-wide transition-all shadow-[0_8px_30px_rgb(37,99,235,0.2)] hover:shadow-[0_8px_30px_rgb(37,99,235,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  {loading ? 'Processing...' : 'Sign In'}
                </button>
              </div>
              
              <div className="flex items-center my-6">
                <div className="flex-1 border-t border-slate-200 dark:border-slate-700"></div>
                <span className="px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Atau</span>
                <div className="flex-1 border-t border-slate-200 dark:border-slate-700"></div>
              </div>

              <button 
                type="button"
                onClick={() => navigate('/')}
                className="w-full bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-6 py-4 rounded-2xl font-bold tracking-wide transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
              >
                <LogIn size={20} className="text-slate-400" />
                Sign in with Kiosk
              </button>
            </form>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Login;
