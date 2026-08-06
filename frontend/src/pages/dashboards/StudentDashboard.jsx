import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { CalendarDays, BellRing, LogOut, CheckCircle, Clock, Download, Sparkles, Lock, FileText, FolderX, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../../components/ThemeToggle';
import UserProfile from '../../components/UserProfile';
import { useSettings } from '../../context/SettingsContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <>{time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':')}</>;
};

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const [pinCode, setPinCode] = useState('');
  const [pinStatus, setPinStatus] = useState('');
  const currentTime = new Date();
  
  const notifiedClasses = useRef(new Set()); // Mencegah notif berulang
  const API_URL = import.meta.env.VITE_API_URL;

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setPinStatus('Memproses...');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/attend-pin`, { pin_code: pinCode }, { headers: { Authorization: `Bearer ${token}` } });
      setPinStatus(res.data.message);
      setPinCode('');
      // Refresh attendances
      const attRes = await axios.get(`${API_URL}/my-attendances`, { headers: { Authorization: `Bearer ${token}` } });
      setAttendances(attRes.data);
    } catch (error) {
      setPinStatus(error.response?.data?.error || 'Gagal menggunakan PIN');
    }
  };

  useEffect(() => {
    // Minta Izin Notifikasi Browser
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [schedRes, attRes] = await Promise.all([
          axios.get(`${API_URL}/my-schedules`, { headers }),
          axios.get(`${API_URL}/my-attendances`, { headers })
        ]);
        setSchedules(schedRes.data);
        setAttendances(attRes.data);
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [API_URL]);

  // Logika Push Notification (Cek setiap menit)
  useEffect(() => {
    const checkSchedules = () => {
      if (schedules.length === 0) return;
      
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const now = new Date();
      const currentDay = days[now.getDay()];
      
      schedules.forEach(sched => {
        if (sched.hari === currentDay) {
          const [startHour, startMin] = sched.jam_mulai.split(':').map(Number);
          const classTime = new Date();
          classTime.setHours(startHour, startMin, 0, 0);
          
          // Hitung selisih dalam menit
          const diffMinutes = (classTime - now) / (1000 * 60);
          
          // Jika kelas mulai dalam 5-6 menit, dan belum pernah dinotif
          if (diffMinutes > 0 && diffMinutes <= 6 && !notifiedClasses.current.has(sched.id)) {
            notifiedClasses.current.add(sched.id);
            
            // Tampilkan Browser Notification
            if (Notification.permission === "granted") {
              new Notification("Pengingat Kelas!", {
                body: `Mata Kuliah ${sched.nama_mata_kuliah} akan dimulai pukul ${sched.jam_mulai}. Segera lakukan absensi wajah di Kiosk!`,
                icon: '/vite.svg'
              });
            }
          }
        }
      });
    };

    const interval = setInterval(checkSchedules, 60000); // Tiap 1 menit
    checkSchedules(); // Panggil sekali di awal

    return () => clearInterval(interval);
  }, [schedules]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const exportPDF = () => {
    if (attendances.length === 0) return;
    const doc = new jsPDF();
    doc.text(`Rekap Absensi Pribadi - ${user?.nama}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`NIM: ${user?.nomor_induk}`, 14, 22);
    
    const tableColumn = ["Waktu", "Mata Kuliah", "Status", "Keterangan", "Materi/BAP"];
    const tableRows = [];

    attendances.forEach(att => {
      const rowData = [
        new Date(att.created_at + 'Z').toLocaleString('en-GB'),
        att.nama_mata_kuliah || 'Umum',
        att.status,
        att.notes || '-',
        att.materi_bap || '-'
      ];
      tableRows.push(rowData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save(`Rekap_Absen_${user?.nama}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3 text-blue-600 dark:text-blue-500 font-extrabold text-xl tracking-tight">
          <span>{settings.student_header}</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsProfileOpen(true)}
            className="text-right border-r border-slate-200 dark:border-slate-700 pr-4 mr-1 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl transition-colors group cursor-pointer"
            title="Buka Profil & Keamanan"
          >
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{user?.nama}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{user?.nomor_induk}</p>
          </button>
          <ThemeToggle />
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-900/30 rounded-xl">
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
        
        {/* Hero Welcome Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-blue-900 dark:via-indigo-900 dark:to-sky-800 rounded-[2.5rem] p-10 shadow-xl text-white border border-blue-500/20">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-20 w-40 h-40 bg-blue-300 opacity-20 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-xs font-bold mb-4 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Terkoneksi ke Sistem
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-3 tracking-tight flex items-center gap-3 text-white drop-shadow-sm">
                {getGreeting()}, {user?.nama ? user.nama.split(' ')[0] : settings.student_label}! <Sparkles className="text-blue-200" size={36} />
              </h1>
              <p className="text-blue-100 text-lg max-w-xl leading-relaxed font-medium">
                {settings.student_subtitle}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5 flex items-center gap-5 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]">
              <div className="bg-white/20 p-4 rounded-2xl shadow-inner">
                <Clock className="text-white" size={28} />
              </div>
              <div>
                <p className="text-blue-100 text-sm font-medium">Waktu Server</p>
                <p className="text-3xl font-black font-mono drop-shadow-md">
                  <LiveClock />
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kolom Jadwal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-700/50">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400">
                  <CalendarDays size={20} />
                </div>
                {settings.schedule_label} Saya
              </h2>
              <button onClick={() => { if(Notification.permission !== "granted") Notification.requestPermission() }} className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors">
                <BellRing size={16} className="text-blue-500 dark:text-blue-400" /> Aktifkan Notif
              </button>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <Clock className="animate-spin mb-2" size={32} />
                <p>Memuat jadwal...</p>
              </div>
            ) : 
             schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                <FolderX size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Tidak Ada Jadwal</h3>
                <p className="text-slate-500 dark:text-slate-500 text-sm max-w-sm">Anda belum terdaftar di kelas mana pun atau tidak ada jadwal hari ini.</p>
              </div>
             ) : (
              <div className="grid gap-4">
                {schedules.map(sched => (
                  <div key={sched.id} className="group border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-500/50 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-bold text-lg border border-blue-100 dark:border-blue-800/50 group-hover:scale-110 transition-transform">
                        {sched.nama_mata_kuliah.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg">{sched.nama_mata_kuliah}</h3>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Clock size={14} /> {sched.hari}, <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 rounded">{sched.jam_mulai}</span> - <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 rounded">{sched.jam_selesai}</span>
                        </p>
                      </div>
                    </div>
                    <div className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-500/30 whitespace-nowrap self-start sm:self-auto">
                      Jadwal Aktif
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Form PIN */}
            <div className="mt-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                <Lock size={18} className="text-slate-400" /> Gagal Scan Wajah di Kiosk?
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Jika kamera kiosk rusak atau wajah tidak dikenali, mintalah <strong>PIN Kehadiran</strong> kepada dosen Anda dan masukkan di bawah ini.</p>
              
              <form onSubmit={handlePinSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={16} className="text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    value={pinCode} 
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))} 
                    placeholder="Masukkan 6 Digit PIN" 
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl pl-11 pr-4 py-3 text-base text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 outline-none font-mono tracking-widest font-bold transition-all shadow-sm"
                    maxLength={6}
                  />
                </div>
                <button type="submit" disabled={!pinCode || pinCode.length < 6} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 disabled:hover:scale-100 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2">
                  <CheckCircle size={18} /> Kirim PIN
                </button>
              </form>
              {pinStatus && (
                <div className={`mt-4 p-3 rounded-xl text-sm font-bold flex items-center gap-2 border ${pinStatus.includes('Gagal') || pinStatus.includes('tidak valid') ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'}`}>
                  {pinStatus.includes('Gagal') ? <FolderX size={16} /> : <CheckCircle size={16} />}
                  {pinStatus}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kolom Log Absen */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-700/50 h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <CheckCircle size={20} />
                </div>
                Riwayat Absen
              </h2>
              <button onClick={exportPDF} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors" title="Ekspor ke PDF">
                <Download size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-4 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <Clock className="animate-spin mb-2" size={24} />
                  <p className="text-sm">Memuat riwayat...</p>
                </div>
              ) : 
               attendances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                  <FolderX size={40} className="text-slate-400 mb-3" />
                  <p className="text-slate-500 font-medium text-sm">Belum ada riwayat kehadiran.</p>
                </div>
               ) : (
                attendances.map((att, i) => (
                  <div key={i} className="group p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{att.nama_mata_kuliah || 'Shift / General'}</p>
                      <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-1 rounded-lg border ${
                        att.status === 'Hadir' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' :
                        att.status === 'Sakit' || att.status === 'Izin' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' :
                        'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30'
                      }`}>
                        {att.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono bg-white dark:bg-slate-900 w-fit px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 mb-3 shadow-sm">
                      <Clock size={12} />
                      {new Date(att.created_at + 'Z').toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', '')}
                    </div>
                    
                    {(att.notes || att.materi_bap) && (
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-2 shadow-sm">
                        {att.notes && (
                          <div className="flex items-start gap-2">
                            <FileText size={14} className="text-blue-500 mt-0.5 shrink-0" />
                            <p><span className="font-bold text-slate-700 dark:text-slate-200">Catatan:</span> {att.notes}</p>
                          </div>
                        )}
                        {att.materi_bap && (
                          <div className="flex items-start gap-2">
                            <BookOpen size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                            <p><span className="font-bold text-slate-700 dark:text-slate-200">Materi (P-{att.pertemuan_ke}):</span> {att.materi_bap}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        </div>
      </main>

      <UserProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
};

export default StudentDashboard;
