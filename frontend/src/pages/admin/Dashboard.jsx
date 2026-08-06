import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { Users, UserCheck, UserCog, CalendarCheck, Clock, ArrowRight, Settings, FileText, Activity, Sparkles, XCircle, AlertTriangle, AlertCircle, Download, BookOpen } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <>{time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':')}</>;
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ mahasiswa: 0, dosen: 0, staff: 0, today: 0, late: 0, alpha: 0, monthly: [], topAbsentees: [], schedules: [] });
  const [liveFeed, setLiveFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  
  // Use static date for greeting/day calculations so the whole page doesn't re-render every second
  const currentTime = new Date();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  useEffect(() => {
    const fetchStatsAndFeed = async () => {
      try {
        const [statsRes, feedRes] = await Promise.all([
          axios.get(`${API_URL}/stats`),
          axios.get(`${API_URL}/attendances/live`)
        ]);
        setStats(statsRes.data);
        setLiveFeed(feedRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStatsAndFeed();
  }, [API_URL]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const chartData = [
    { name: settings.student_label, value: stats.mahasiswa || 0, color: '#3b82f6' }, // Blue
    { name: settings.lecturer_label, value: stats.dosen || 0, color: '#10b981' }, // Emerald
    { name: settings.staff_label, value: stats.staff || 0, color: '#8b5cf6' } // Purple
  ];

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let areaChartData = monthNames.map(m => ({ name: m, value: 0 }));
  
  if (stats.monthly && stats.monthly.length > 0) {
    stats.monthly.forEach(item => {
      const monthIndex = parseInt(item.month, 10) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        areaChartData[monthIndex].value = item.count;
      }
    });
  }

  const StatCard = ({ title, value, icon: Icon }) => (
    <div className="relative group bg-white dark:bg-slate-900 rounded-2xl md:rounded-[2rem] p-4 md:p-6 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-300 hover:shadow-md flex items-center justify-between">
      <div className="flex items-center gap-3 md:gap-4">
        <div className={`p-3 md:p-4 rounded-xl md:rounded-full border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50`}>
          <Icon className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] md:text-xs mb-0.5 md:mb-1 uppercase tracking-wider">{title}</p>
          <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100">{value}</h3>
        </div>
      </div>
    </div>
  );

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayName = days[currentTime.getDay()];
  const todaySchedules = stats.schedules ? stats.schedules.filter(s => s.hari === todayName) : [];

  const downloadReportPDF = async () => {
    try {
      setDownloadingPDF(true);
      const res = await axios.get(`${API_URL}/attendances`);
      const data = res.data;
      
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Laporan Absensi Global - Nongol Dulu', 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 30);
      doc.text(`Total Data: ${data.length} entri absensi.`, 14, 36);
      
      const tableColumn = ["No", "Nama", "NIM/NIP", "Peran", "Waktu Absen", "Status", "Keterangan"];
      const tableRows = [];
      
      data.forEach((item, index) => {
        const safeDate = item.created_at.includes('T') ? item.created_at : item.created_at.replace(' ', 'T') + 'Z';
        const dateStr = new Date(safeDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
        const rowData = [
          index + 1,
          item.nama,
          item.nomor_induk,
          item.role,
          dateStr,
          item.status || 'Hadir',
          item.notes || '-'
        ];
        tableRows.push(rowData);
      });
      
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 42,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 4, halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 'auto', halign: 'left' },
          6: { halign: 'left' }
        }
      });
      
      const finalY = doc.lastAutoTable.finalY || 42;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      let signatureY = finalY + 20;
      if (signatureY + 40 > pageHeight) {
        doc.addPage();
        signatureY = 20;
      }
      
      const dateStrSignature = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const signatureX = pageWidth - 40;
      
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text(`Bandung, ${dateStrSignature}`, signatureX, signatureY, { align: 'center' });
      doc.text('Admin Sistem', signatureX, signatureY + 6, { align: 'center' });
      
      doc.text('(_________________________)', signatureX, signatureY + 30, { align: 'center' });
      doc.text(user?.nama || 'Admin', signatureX, signatureY + 36, { align: 'center' });
      
      doc.save(`Laporan_Absensi_Admin_${new Date().toISOString().slice(0,10)}.pdf`);
      toast.success('Laporan PDF berhasil diunduh!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Gagal mengunduh laporan PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header / Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-2">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            {getGreeting()}, {user?.nama || 'Admin'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-0.5">
            Pantau statistik dan kelola aktivitas akademik hari ini.
          </p>
        </div>
        <div className="inline-flex w-max items-center gap-2 md:gap-3 bg-white dark:bg-slate-900 px-3 md:px-4 py-2 rounded-xl md:rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
          <Clock className="text-blue-600 w-4 h-4 md:w-[18px] md:h-[18px]" />
          <span className="font-mono text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300 tracking-wider">
            <LiveClock />
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* KPI Cards Grid (Top Row - 3 Cards like mockup) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
            <StatCard 
              title={`Total ${settings.student_label}`} 
              value={stats.mahasiswa} 
              icon={Users} 
            />
            <StatCard 
              title={`Total ${settings.lecturer_label}`} 
              value={stats.dosen} 
              icon={UserCheck} 
            />
            <StatCard 
              title={`Total ${settings.staff_label}`} 
              value={stats.staff} 
              icon={UserCog} 
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Area Chart (The up-and-down graph) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl md:rounded-[2rem] p-5 md:p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100">Grafik Kehadiran ({new Date().getFullYear()})</h2>
              </div>
              <div className="flex-1 w-full h-[250px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0336ff" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0336ff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-[0_4px_25px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-700">
                              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1 tracking-wide">Bulan {label}</p>
                              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                {payload[0].value} <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Hadir</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                      cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '5 5' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#0336ff" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut Chart (Distribusi Pengguna) */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Distribusi Pengguna</h2>
              <div className="flex-1 min-h-[250px] w-full relative flex flex-col items-center justify-center">
                <div className="relative w-full h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius="75%"
                        outerRadius="95%"
                        paddingAngle={chartData.filter(d => d.value > 0).length > 1 ? 2 : 0}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        itemStyle={{ fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center text for Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">Total User</span>
                    <span className="text-3xl font-black text-slate-800 dark:text-slate-100 leading-none">
                      {stats.mahasiswa + stats.dosen + stats.staff || 0}
                    </span>
                  </div>
                </div>

                {/* Custom Legend */}
                <div className="w-full mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 px-2">
                  {chartData.map((entry, index) => (
                    <div key={`legend-${index}`} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></span>
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Live Feed and Today's Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            
            {/* Live Activity Feed */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                <Activity className="text-blue-600" size={20} />
                Log Aktivitas Terkini
              </h2>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {liveFeed && liveFeed.length > 0 ? (
                  <div className="space-y-4">
                    {liveFeed.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold text-sm">
                            {log.nama.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{log.nama}</p>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 capitalize">{log.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${
                            log.status === 'Hadir' ? 'text-emerald-600 dark:text-emerald-400' :
                            log.status === 'Terlambat' ? 'text-amber-600 dark:text-amber-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {log.status}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {new Date(log.created_at.includes('T') ? log.created_at : log.created_at.replace(' ', 'T') + 'Z').toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                    <Activity size={40} className="mb-3 opacity-20" />
                    <p className="font-medium">Belum ada aktivitas hari ini</p>
                  </div>
                )}
              </div>
            </div>

            {/* Today's Attendance Stats */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Kehadiran Hari Ini</h2>
              <div className="flex flex-col gap-4 flex-1 justify-center">
                
                {/* Tepat Waktu / Hadir */}
                <div className="flex items-center justify-between p-5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600">
                      <UserCheck size={20} />
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">Tepat Waktu</span>
                  </div>
                  <span className="text-2xl font-black text-emerald-600">{stats.today || 0}</span>
                </div>

                {/* Terlambat */}
                <div className="flex items-center justify-between p-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600">
                      <Clock size={20} />
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">Terlambat</span>
                  </div>
                  <span className="text-2xl font-black text-amber-600">{stats.late || 0}</span>
                </div>

                {/* Alpha / Tidak Hadir */}
                <div className="flex items-center justify-between p-5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600">
                      <XCircle size={20} />
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">Alpha / Bolos</span>
                  </div>
                  <span className="text-2xl font-black text-red-600">{stats.alpha || 0}</span>
                </div>

              </div>
            </div>

          </div>

          {/* Phase 2: Schedules and Top Absentees */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            
            {/* Today's Schedules */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl md:rounded-[2rem] p-4 md:p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <BookOpen className="text-blue-600" size={20} />
                  Jadwal Kelas Hari Ini ({todayName})
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {todaySchedules.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {todaySchedules.map((sched) => (
                      <div key={sched.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-100 mb-1">{sched.nama_mata_kuliah}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{sched.dosen}</p>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400">
                          <Clock size={16} />
                          {sched.jam_mulai} - {sched.jam_selesai}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 py-8">
                    <BookOpen size={40} className="mb-3 opacity-20" />
                    <p className="font-medium">Tidak ada jadwal kelas hari ini</p>
                  </div>
                )}
              </div>
            </div>

            {/* Top Absentees */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                <AlertCircle className="text-red-500" size={20} />
                Sering Alpha (Bulan Ini)
              </h2>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {stats.topAbsentees && stats.topAbsentees.length > 0 ? (
                  <div className="space-y-4">
                    {stats.topAbsentees.map((user, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate max-w-[120px]">{user.nama}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role}</p>
                        </div>
                        <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg text-sm font-black">
                          {user.count}x
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 py-8">
                    <UserCheck size={40} className="mb-3 opacity-20" />
                    <p className="font-medium text-center text-sm">Luar biasa! Tidak ada yang bolos bulan ini.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Quick Actions (Bottom Row) */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Aksi Cepat</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <button disabled={downloadingPDF} onClick={downloadReportPDF} className="flex flex-col items-start p-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl hover:opacity-90 transition-opacity border border-transparent text-white shadow-md disabled:opacity-50">
                <Download className={`mb-3 text-white ${downloadingPDF ? 'animate-bounce' : ''}`} size={24} />
                <h4 className="font-bold">{downloadingPDF ? 'Mengunduh...' : 'Unduh Laporan'}</h4>
              </button>
              <button onClick={() => navigate('/admin/schedules')} className="flex flex-col items-start p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-slate-100 dark:border-slate-800">
                <CalendarCheck className="text-blue-600 mb-3" size={24} />
                <h4 className="font-bold text-slate-800 dark:text-slate-100">Kelola Jadwal</h4>
              </button>
              <button onClick={() => navigate('/admin/report')} className="flex flex-col items-start p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors border border-slate-100 dark:border-slate-800">
                <FileText className="text-emerald-600 mb-3" size={24} />
                <h4 className="font-bold text-slate-800 dark:text-slate-100">Log Absensi</h4>
              </button>
              <button onClick={() => navigate('/admin/students')} className="flex flex-col items-start p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors border border-slate-100 dark:border-slate-800">
                <Users className="text-amber-600 mb-3" size={24} />
                <h4 className="font-bold text-slate-800 dark:text-slate-100">Data Mahasiswa</h4>
              </button>
              <button onClick={() => navigate('/admin/settings')} className="flex flex-col items-start p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors border border-slate-100 dark:border-slate-800">
                <Settings className="text-purple-600 mb-3" size={24} />
                <h4 className="font-bold text-slate-800 dark:text-slate-100">Pengaturan Sistem</h4>
              </button>
            </div>
          </div>
          
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
