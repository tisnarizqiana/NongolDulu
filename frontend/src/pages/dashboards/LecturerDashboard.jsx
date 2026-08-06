import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, LogOut, Users, Download, UserCheck, UserMinus, UserX, Clock, Lock, Unlock, KeyRound, FileText, Plus, Search, Sparkles, Loader, FolderX, Inbox, CalendarDays, ChevronDown, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../../components/ThemeToggle';
import UserProfile from '../../components/UserProfile';
import { useSettings } from '../../context/SettingsContext';
import { useConfirm } from '../../context/ConfirmContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <>{time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':')}</>;
};

const LecturerDashboard = () => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // V5 States
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [autoLockMinutes, setAutoLockMinutes] = useState('0'); // 0 = no lock
  
  // BAP & Status
  const [bapText, setBapText] = useState('');
  const [bapSaving, setBapSaving] = useState(false);
  const [isBapEditing, setIsBapEditing] = useState(false);
  
  const [successModalData, setSuccessModalData] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const currentTime = new Date();

  const API_URL = import.meta.env.VITE_API_URL;

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        await axios.post(`${API_URL}/cron/mark-alfa`).catch(() => {});

        const schedRes = await axios.get(`${API_URL}/my-schedules`, { headers });
        setSchedules(schedRes.data);
        
        if (schedRes.data.length > 0) {
          setSelectedScheduleId(schedRes.data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch schedules', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, [API_URL]);

  useEffect(() => {
    if (!selectedScheduleId) return;

    const fetchSessions = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/schedules/${selectedScheduleId}/sessions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSessions(res.data);
        if (res.data.length > 0) {
          // Select the latest session
          const latest = res.data[res.data.length - 1];
          setSelectedSessionId(latest.id);
        } else {
          setSelectedSessionId('');
          setRoster([]);
        }
      } catch (error) {
        console.error('Failed to fetch sessions', error);
      }
    };
    fetchSessions();
  }, [selectedScheduleId, API_URL]);

  useEffect(() => {
    if (!selectedScheduleId || !selectedSessionId) return;

    const fetchRoster = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/schedules/${selectedScheduleId}/roster?session_id=${selectedSessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRoster(res.data);
        
        // Sync BAP
        const session = sessions.find(s => s.id === selectedSessionId);
        if (session) setBapText(session.materi_bap || '');
        
      } catch (error) {
        console.error('Failed to fetch roster', error);
      }
    };
    fetchRoster();
  }, [selectedScheduleId, selectedSessionId, API_URL, sessions]);

  const handleStatusChange = async (userId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const student = roster.find(s => s.user_id === userId);
      await axios.post(`${API_URL}/attendances/manual`, {
        user_id: userId,
        schedule_id: selectedScheduleId,
        session_id: selectedSessionId,
        status: newStatus,
        notes: student.notes // preserve notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setRoster(prev => prev.map(student => 
        student.user_id === userId ? { ...student, status: newStatus, created_at: student.created_at || new Date().toISOString() } : student
      ));
    } catch (error) {
      alert('Gagal mengubah status');
    }
  };

  const handleNotesChange = async (userId, newNotes) => {
    try {
      const token = localStorage.getItem('token');
      const student = roster.find(s => s.user_id === userId);
      
      const currentNotes = student.notes || '';
      if (currentNotes === newNotes) return; // skip if no change

      await axios.post(`${API_URL}/attendances/manual`, {
        user_id: userId,
        schedule_id: selectedScheduleId,
        session_id: selectedSessionId,
        status: student.status || 'Belum Absen',
        notes: newNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setRoster(prev => prev.map(student => 
        student.user_id === userId ? { ...student, notes: newNotes } : student
      ));
    } catch (error) {
      alert('Gagal menyimpan keterangan');
    }
  };

  const submitCreateSession = async () => {
    try {
      const token = localStorage.getItem('token');
      const nextPertemuan = sessions.length + 1;
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const payload = {
        pertemuan_ke: nextPertemuan,
        tanggal: today
      };
      
      if (autoLockMinutes !== '0') {
        payload.auto_lock_minutes = parseInt(autoLockMinutes);
      }
      
      const res = await axios.post(`${API_URL}/schedules/${selectedScheduleId}/sessions`, payload, { headers: { Authorization: `Bearer ${token}` } });
      
      setIsModalOpen(false);
      setSuccessModalData({ pertemuan: nextPertemuan, pin: res.data.pin_code });
      
      // Refresh sessions
      const sRes = await axios.get(`${API_URL}/schedules/${selectedScheduleId}/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(sRes.data);
      if (sRes.data.length > 0) setSelectedSessionId(sRes.data[sRes.data.length - 1].id);
      
    } catch (error) {
      alert(error.response?.data?.error || 'Gagal membuat sesi pertemuan');
    }
  };

  const handleUpdateSession = async (updates) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/sessions/${selectedSessionId}`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh sessions
      const sRes = await axios.get(`${API_URL}/schedules/${selectedScheduleId}/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(sRes.data);
    } catch (error) {
      alert('Gagal memperbarui sesi');
    }
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation(); // Prevent selecting the session when clicking delete
    
    const isConfirmed = await confirm('Yakin ingin menghapus sesi pertemuan ini? Data riwayat absen pada pertemuan ini juga akan terhapus.');
    if (!isConfirmed) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } });
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (selectedSessionId === sessionId) {
        setSelectedSessionId('');
        setRoster([]);
      }
    } catch (error) {
      alert('Gagal menghapus sesi');
    }
  };


  const saveBap = async () => {
    setBapSaving(true);
    await handleUpdateSession({ materi_bap: bapText });
    setBapSaving(false);
    setIsBapEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const stats = roster.reduce((acc, curr) => {
    const status = curr.status || 'Belum Absen';
    acc[status] = (acc[status] || 0) + 1;
    acc.Total = (acc.Total || 0) + 1;
    return acc;
  }, { Hadir: 0, Sakit: 0, Izin: 0, Alfa: 0, 'Belum Absen': 0, Total: 0 });

  const exportPDF = () => {
    if (roster.length === 0) return;
    const activeSession = sessions.find(s => s.id === selectedSessionId);
    const className = schedules.find(s => s.id === selectedScheduleId)?.nama_mata_kuliah || 'Kelas';
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text('UNIVERSITAS SIAKAD', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text('BERITA ACARA PERKULIAHAN (BAP)', 105, 28, { align: 'center' });
    
    // Line separator
    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);
    
    // Info
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    // Use fixed X coordinates for perfect alignment
    const labelX = 14;
    const colonX = 45;
    const valueX = 48;
    
    doc.text('Mata Kuliah', labelX, 42);
    doc.text(':', colonX, 42);
    doc.text(className, valueX, 42);
    
    doc.text('Pertemuan Ke', labelX, 48);
    doc.text(':', colonX, 48);
    doc.text(String(activeSession?.pertemuan_ke || '-'), valueX, 48);
    
    doc.text('Tanggal', labelX, 54);
    doc.text(':', colonX, 54);
    doc.text(activeSession?.tanggal || '-', valueX, 54);
    
    // BAP Text
    doc.setFont("helvetica", "bold");
    doc.text(`Materi Ajar:`, 14, 64);
    doc.setFont("helvetica", "normal");
    const splitText = doc.splitTextToSize(activeSession?.materi_bap || '-', 180);
    doc.text(splitText, 14, 70);
    
    let startY = 70 + (splitText.length * 6) + 5;
    
    // Summary Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(14, startY, 182, 16, 2, 2, 'FD');
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Rekapitulasi Kehadiran:", 18, startY + 10);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Hadir: ${stats.Hadir}`, 65, startY + 10);
    doc.text(`Sakit: ${stats.Sakit || 0}`, 95, startY + 10);
    doc.text(`Izin: ${stats.Izin || 0}`, 115, startY + 10);
    doc.text(`Alfa: ${stats.Alfa}`, 135, startY + 10);
    doc.text(`Total Mhs: ${stats.Total}`, 160, startY + 10);
    
    startY += 26;
    
    // Table
    const tableColumn = ["No", "Nomor Induk", "Nama Mahasiswa", "1 Semester", "Kehadiran Sesi", "Waktu Scan"];
    const tableRows = [];
    
    roster.forEach((s, i) => {
      const waktu = s.created_at ? new Date(s.created_at + 'Z').toLocaleString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
      const rowData = [
        i + 1,
        s.nomor_induk,
        s.nama,
        `${s.percentage}%`,
        s.status || 'Belum Absen',
        waktu
      ];
      tableRows.push(rowData);
    });
    
    autoTable(doc, {
      startY: startY,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { 
        fillColor: [15, 118, 110], // Teal 700
        halign: 'center',
        valign: 'middle',
        fontStyle: 'bold',
        textColor: [255, 255, 255]
      },
      styles: { 
        fontSize: 9, 
        cellPadding: 3,
        lineColor: [226, 232, 240], // slate-200
        lineWidth: 0.1,
        textColor: [51, 65, 85] // slate-700
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // slate-50
      },
      columnStyles: { 
        0: { halign: 'center', cellWidth: 12 }, 
        1: { halign: 'center', cellWidth: 35 },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 4) {
           data.cell.styles.fontStyle = 'bold';
           if (data.cell.raw === 'Hadir') data.cell.styles.textColor = [16, 185, 129];
           else if (data.cell.raw === 'Sakit') data.cell.styles.textColor = [245, 158, 11];
           else if (data.cell.raw === 'Izin') data.cell.styles.textColor = [14, 165, 233];
           else if (data.cell.raw === 'Alfa') data.cell.styles.textColor = [239, 68, 68];
           else data.cell.styles.textColor = [148, 163, 184];
        }
      }
    });
    
    // Signature Block
    const finalY = doc.lastAutoTable.finalY + 20;
    
    // If signature block overflows, add a new page
    if (finalY + 40 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
    }
    
    doc.setFontSize(11);
    doc.text(`Dosen Pengampu,`, 140, finalY);
    
    // Space for signature
    doc.setFont("helvetica", "bold");
    doc.text(`${user?.nama || 'Dosen'}`, 140, finalY + 25);
    doc.setFont("helvetica", "normal");
    doc.text(`NIDN. ${user?.nomor_induk || '-'}`, 140, finalY + 31);
    
    doc.save(`BAP_Absen_${className}_Pertemuan${activeSession?.pertemuan_ke}.pdf`);
  };

  const exportMasterSheet = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/schedules/${selectedScheduleId}/recap`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { className, sessions: recapSessions, students, attendances } = res.data;
      
      const doc = new jsPDF({ orientation: 'landscape' });
      
      // Header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text('REKAPITULASI KEHADIRAN 1 SEMESTER', 148, 18, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(`Mata Kuliah: ${className}`, 148, 26, { align: 'center' });
      
      const head = ["No", "NIM", "Nama Mahasiswa"];
      recapSessions.forEach(s => head.push(`P${s.pertemuan_ke}`));
      head.push("Hadir", "%");
      
      const body = students.map((stu, i) => {
        const row = [i+1, stu.nomor_induk, stu.nama];
        let hadirCount = 0;
        recapSessions.forEach(sess => {
          const att = attendances.find(a => a.user_id === stu.user_id && a.session_id === sess.id);
          let statusLabel = '-';
          if (att) {
            if (att.status === 'Hadir') { statusLabel = 'H'; hadirCount++; }
            else if (att.status === 'Sakit') statusLabel = 'S';
            else if (att.status === 'Izin') statusLabel = 'I';
            else if (att.status === 'Alfa') statusLabel = 'A';
          }
          row.push(statusLabel);
        });
        row.push(hadirCount);
        const pct = recapSessions.length > 0 ? Math.round((hadirCount / recapSessions.length) * 100) : 0;
        row.push(`${pct}%`);
        return row;
      });
      
      autoTable(doc, {
        startY: 35,
        head: [head],
        body: body,
        theme: 'grid',
        headStyles: { 
          fillColor: [15, 118, 110], // Teal 700
          halign: 'center',
          valign: 'middle',
          fontStyle: 'bold',
          textColor: [255, 255, 255]
        },
        styles: { 
          fontSize: 9, 
          cellPadding: 3,
          lineColor: [226, 232, 240], // slate-200
          lineWidth: 0.1,
          textColor: [51, 65, 85] // slate-700
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // slate-50
        },
        columnStyles: { 
          0: { halign: 'center', cellWidth: 12 }, 
          1: { halign: 'center', cellWidth: 35 } 
        },
        didParseCell: function (data) {
          if (data.section === 'body') {
            // Meeting columns styling
            if (data.column.index > 2 && data.column.index < head.length - 2) {
               data.cell.styles.halign = 'center';
               data.cell.styles.fontStyle = 'bold';
               if (data.cell.raw === 'H') data.cell.styles.textColor = [16, 185, 129]; // blue-500
               else if (data.cell.raw === 'S') data.cell.styles.textColor = [245, 158, 11]; // amber-500
               else if (data.cell.raw === 'I') data.cell.styles.textColor = [14, 165, 233]; // sky-500
               else if (data.cell.raw === 'A') data.cell.styles.textColor = [239, 68, 68]; // red-500
               else data.cell.styles.textColor = [148, 163, 184]; // slate-400
            }
            // Totals columns styling
            if (data.column.index >= head.length - 2) {
               data.cell.styles.halign = 'center';
               data.cell.styles.fontStyle = 'bold';
               // Tint the % column
               if (data.column.index === head.length - 1) {
                  const pctVal = parseInt(data.cell.raw);
                  if (pctVal >= 75) {
                    data.cell.styles.fillColor = [236, 253, 245]; // blue-50
                    data.cell.styles.textColor = [4, 120, 87]; // blue-700
                  } else {
                    data.cell.styles.fillColor = [254, 242, 242]; // red-50
                    data.cell.styles.textColor = [185, 28, 28]; // red-700
                  }
               }
            }
          }
        }
      });
      
      // Legend
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("Keterangan: H = Hadir, S = Sakit, I = Izin, A = Alfa, - = Belum Absen", 14, finalY);
      
      doc.save(`Master_Sheet_${className}.pdf`);
    } catch (error) {
      alert('Gagal mengambil data rekap 1 semester.');
    }
  };

  const filteredRoster = roster.filter(s => 
    s.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.nomor_induk.includes(searchQuery)
  );

  const activeSessionData = sessions.find(s => s.id === selectedSessionId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center sticky top-0 z-50 transition-colors duration-300">
        <div className="flex items-center gap-2 md:gap-3 text-blue-600 dark:text-blue-500 font-extrabold text-lg md:text-xl tracking-tight truncate mr-2">
          <span className="truncate">{settings.lecturer_header}</span>
        </div>
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button 
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center justify-center text-right md:border-r border-slate-200 dark:border-slate-700 md:pr-4 md:mr-1 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 md:p-2 rounded-xl transition-colors group cursor-pointer"
            title="Buka Profil & Keamanan"
          >
            <div className="hidden md:block">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{user?.nama}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{user?.nomor_induk}</p>
            </div>
            <div className="md:hidden w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
              {user?.nama?.charAt(0)?.toUpperCase()}
            </div>
          </button>
          <div className="scale-90 md:scale-100">
            <ThemeToggle />
          </div>
          <button onClick={handleLogout} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-xl transition-colors">
            <LogOut size={18} className="md:w-5 md:h-5" />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
        
        {/* Hero Welcome Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 rounded-[2rem] p-6 md:p-10 shadow-lg text-white">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-20 w-40 h-40 bg-blue-300 opacity-20 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                {getGreeting()}, {user?.nama || 'Dosen'}! <Sparkles className="inline-block text-emerald-300 animate-pulse md:w-10 md:h-10" size={32} />
              </h1>
              <p className="text-emerald-50 text-base md:text-lg font-medium max-w-2xl leading-relaxed opacity-90 mt-2">
                {settings.lecturer_subtitle}
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl md:rounded-3xl p-4 md:p-5 flex items-center gap-3 md:gap-5 shadow-inner w-full md:w-auto">
              <div className="bg-white/20 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-inner shrink-0">
                <Clock className="text-white md:w-7 md:h-7" size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-emerald-100 text-xs md:text-sm font-medium truncate">Waktu Server</p>
                <p className="text-2xl md:text-3xl font-black font-mono drop-shadow-md truncate">
                  <LiveClock />
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Jadwal Mengajar */}
        <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Pilih {settings.subject_label}
            </h2>
            <div className="text-right">
              <button onClick={exportMasterSheet} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                <Download size={16} /> Export Master Sheet
              </button>
            </div>
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <Loader className="animate-spin mb-4 text-emerald-500" size={32} />
              <p className="font-semibold text-slate-600 dark:text-slate-300">Memuat jadwal mata kuliah...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <FolderX className="mb-4 text-slate-400 opacity-50" size={48} />
              <p className="font-bold text-lg text-slate-600 dark:text-slate-400">Belum Ada Jadwal</p>
              <p className="text-sm text-slate-500 mt-1">Anda belum ditugaskan untuk mengajar mata kuliah apapun.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {schedules.map(sched => (
                <div key={sched.id} onClick={() => setSelectedScheduleId(sched.id)} className={`cursor-pointer border rounded-2xl p-4 transition-all ${selectedScheduleId === sched.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/20 shadow-md ring-2 ring-blue-200 dark:ring-blue-500/50' : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                  <h3 className={`font-bold ${selectedScheduleId === sched.id ? 'text-blue-800 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>{sched.nama_mata_kuliah}</h3>
                  <p className={`text-sm font-medium ${selectedScheduleId === sched.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>{sched.hari}, {sched.jam_mulai} - {sched.jam_selesai}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SIAKAD Layout */}
        {selectedScheduleId && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Sidebar Sesi */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Sesi Pertemuan</h3>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    disabled={sessions.length >= 16}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-1.5 rounded-lg transition-colors disabled:opacity-50"
                    title="Buka Pertemuan Baru"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                
                {sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                    <Inbox className="mb-3 text-slate-400 opacity-50" size={36} />
                    <p className="font-bold text-slate-600 dark:text-slate-400">Belum Ada Sesi</p>
                    <p className="text-xs mt-1 text-slate-500">Klik tombol + untuk membuka pertemuan baru.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                    {sessions.map(sess => (
                      <div 
                        key={sess.id} 
                        onClick={() => setSelectedSessionId(sess.id)}
                        className={`cursor-pointer p-3 rounded-xl border transition-all ${selectedSessionId === sess.id ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 text-slate-700 dark:text-slate-200'}`}
                      >
                        <div className="flex justify-between items-center">
                          <p className="font-bold text-sm">Pertemuan {sess.pertemuan_ke}</p>
                          <div className="flex items-center gap-2">
                            {sess.is_locked ? <Lock size={14} className={selectedSessionId === sess.id ? 'text-blue-200' : 'text-slate-400'} /> : <Unlock size={14} className={selectedSessionId === sess.id ? 'text-white' : 'text-emerald-500'} />}
                            <button 
                              onClick={(e) => handleDeleteSession(sess.id, e)}
                              className={`p-1 rounded-md transition-colors ${selectedSessionId === sess.id ? 'hover:bg-blue-700 text-blue-200 hover:text-red-300' : 'hover:bg-red-100 text-slate-400 hover:text-red-500'}`}
                              title="Hapus Pertemuan"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <p className={`text-xs mt-1 ${selectedSessionId === sess.id ? 'text-blue-100' : 'text-slate-500'}`}>{sess.tanggal}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Main Area */}
            <div className="lg:col-span-3 space-y-6">
              {!selectedSessionId ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center h-full min-h-[400px]">
                  <CalendarDays className="mb-4 text-slate-300 dark:text-slate-600" size={64} />
                  <p className="font-bold text-xl text-slate-600 dark:text-slate-300">Pilih Sesi Pertemuan</p>
                  <p className="text-sm mt-2 max-w-sm mx-auto text-slate-500 dark:text-slate-400">Silakan pilih salah satu sesi di panel sebelah kiri untuk melihat jurnal BAP, PIN absen, dan daftar kehadiran mahasiswa.</p>
                </div>
              ) : (
                <>
                {/* Control Panel */}
                <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/50 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* BAP */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><FileText size={18} className="text-emerald-500" /> Jurnal BAP / Materi Ajar</h3>
                      {activeSessionData.materi_bap && !isBapEditing && (
                        <button onClick={() => setIsBapEditing(true)} className="text-xs font-bold text-blue-600 hover:text-blue-700">Edit BAP</button>
                      )}
                    </div>
                    
                    {(!activeSessionData.materi_bap || isBapEditing) ? (
                      <>
                        <textarea 
                          className="w-full border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                          placeholder="Contoh: Membahas bab 4 mengenai turunan dan integral..."
                          value={bapText}
                          onChange={e => setBapText(e.target.value)}
                        ></textarea>
                        <div className="flex gap-2 mt-2">
                          <button onClick={saveBap} disabled={bapSaving} className="bg-slate-800 dark:bg-blue-600 hover:bg-slate-900 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50">
                            {bapSaving ? 'Menyimpan...' : 'Simpan BAP'}
                          </button>
                          {isBapEditing && (
                            <button onClick={() => {setIsBapEditing(false); setBapText(activeSessionData.materi_bap)}} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-bold transition-all">
                              Batal
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="w-full border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300 min-h-[6rem]">
                        {activeSessionData.materi_bap}
                      </div>
                    )}
                  </div>
                  
                  {/* PIN & Lock */}
                  <div className="space-y-4">
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-1">PIN Kehadiran Kiosk-Bypass</h4>
                        <p className="text-3xl font-black text-emerald-900 dark:text-emerald-300 tracking-widest font-mono">{activeSessionData.pin_code}</p>
                      </div>
                      <KeyRound className="text-blue-300 dark:text-emerald-500/50 opacity-50" size={48} />
                    </div>
                    
                    <div className="flex gap-3">
                      {activeSessionData.is_locked ? (
                        <button onClick={() => handleUpdateSession({ is_locked: false })} className="flex-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-400 p-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                          <Unlock size={18} /> Buka Kembali Absen
                        </button>
                      ) : (
                        <button onClick={() => handleUpdateSession({ is_locked: true })} className="flex-1 bg-red-100 hover:bg-red-200 dark:bg-red-500/20 dark:hover:bg-red-500/30 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                          <Lock size={18} /> Kunci Absen (Tutup)
                        </button>
                      )}
                      <button onClick={exportPDF} className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 hover:dark:bg-slate-600 text-slate-700 dark:text-slate-300 p-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                        <Download size={18} /> Export PDF
                      </button>
                    </div>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.Total}</span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">TOTAL {settings.student_label}</span>
                    </div>
                  <div className="bg-emerald-50/50 dark:bg-emerald-900/20 p-4 rounded-2xl shadow-sm border border-emerald-200 dark:border-emerald-800/50 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.Hadir}</span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Hadir</span>
                  </div>
                  <div className="bg-amber-50/50 dark:bg-amber-900/20 p-4 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-800/50 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-amber-500 dark:text-amber-400">{stats.Sakit || 0}</span>
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">Sakit</span>
                  </div>
                  <div className="bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-2xl shadow-sm border border-blue-200 dark:border-blue-800/50 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-blue-500 dark:text-blue-400">{stats.Izin || 0}</span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Izin</span>
                  </div>
                  <div className="bg-red-50/50 dark:bg-red-900/20 p-4 rounded-2xl shadow-sm border border-red-200 dark:border-red-800/50 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.Alfa}</span>
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase">Alfa</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-slate-500 dark:text-slate-400">{stats['Belum Absen']}</span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Belum Absen</span>
                  </div>
                </div>

                {/* Tabel Roster */}
                <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/50">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Daftar Kehadiran {settings.student_label}</h3>
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
                      <input 
                        type="text"
                        placeholder="Cari nama / NIM..."
                        className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-blue-500 dark:focus:border-blue-400 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                          <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">Nama {settings.student_label}</th>
                          <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-center">Total 1 Semester</th>
                          <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-center">Waktu Scan</th>
                          <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-center">Status Sesi Ini</th>
                          <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">Keterangan / Catatan</th>
                          <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRoster.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="p-12 text-center text-slate-500 dark:text-slate-400">
                              <div className="flex justify-center mb-3 opacity-30"><Search size={48} /></div>
                              <span className="font-bold text-lg text-slate-600 dark:text-slate-300">Tidak ada data</span>
                              <p className="mt-1 text-sm">Mahasiswa tidak ditemukan atau belum ada dalam daftar.</p>
                            </td>
                          </tr>
                        ) : (
                          filteredRoster.map((student) => (
                            <tr key={student.user_id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                              <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                                {student.nama} <br/><span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{student.nomor_induk}</span>
                              </td>
                              <td className="p-4 text-center">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${student.percentage >= 75 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                                  {student.percentage}%
                                </span>
                              </td>
                              <td className="p-4 text-sm text-slate-600 dark:text-slate-400 font-mono text-center">
                                {student.created_at ? new Date(student.created_at + 'Z').toLocaleString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                              </td>
                              <td className="p-4 text-center">
                                <span className={`inline-block whitespace-nowrap text-xs font-bold px-3 py-1 rounded-full ${
                                  student.status === 'Hadir' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                                  student.status === 'Sakit' || student.status === 'Izin' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' :
                                  student.status === 'Alfa' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' :
                                  'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                  {student.status || 'Belum Absen'}
                                </span>
                              </td>
                              <td className="p-4">
                                <input
                                  type="text"
                                  className="w-full text-sm border border-slate-200 dark:border-slate-600 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 dark:focus:border-blue-400 placeholder-slate-400 dark:placeholder-slate-500"
                                  placeholder="Tambah catatan..."
                                  defaultValue={student.notes || ''}
                                  onBlur={(e) => handleNotesChange(student.user_id, e.target.value)}
                                />
                              </td>
                              <td className="p-4 text-right">
                                <select 
                                  value={student.status || ''}
                                  onChange={(e) => handleStatusChange(student.user_id, e.target.value)}
                                  className="text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-medium"
                                >
                                  <option value="" disabled className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">Status</option>
                                  <option value="Hadir" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Hadir</option>
                                  <option value="Sakit" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Sakit</option>
                                  <option value="Izin" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Izin</option>
                                  <option value="Alfa" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">Alfa</option>
                                </select>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
      
      {/* Modal Buka Sesi */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Buka Pertemuan Baru</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Pertemuan ke-{sessions.length + 1} akan dibuat. Silakan tentukan batas toleransi keterlambatan mahasiswa.</p>
            
            <div className="space-y-4 mb-8">
              <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <input type="radio" name="auto_lock" value="0" checked={autoLockMinutes === '0'} onChange={(e) => setAutoLockMinutes(e.target.value)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Jangan Kunci Otomatis</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Kelas akan terus terbuka sampai Anda menutupnya secara manual.</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <input type="radio" name="auto_lock" value="15" checked={autoLockMinutes === '15'} onChange={(e) => setAutoLockMinutes(e.target.value)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Toleransi 15 Menit</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Kiosk tidak akan menerima absensi 15 menit setelah kelas dibuka.</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <input type="radio" name="auto_lock" value="30" checked={autoLockMinutes === '30'} onChange={(e) => setAutoLockMinutes(e.target.value)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Toleransi 30 Menit</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Kiosk tidak akan menerima absensi 30 menit setelah kelas dibuka.</p>
                </div>
              </label>
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-3 rounded-xl text-sm font-bold transition-colors">
                Batal
              </button>
              <button onClick={submitCreateSession} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition-colors">
                Buka Kelas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sukses Buka Sesi */}
      {successModalData && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-700 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-6">
              <Sparkles className="text-emerald-600 dark:text-emerald-400" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Kelas Berhasil Dibuka!</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Pertemuan {successModalData.pertemuan} siap dimulai.</p>
            
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 mb-8">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">PIN Kehadiran</p>
              <p className="text-5xl font-black text-emerald-600 dark:text-emerald-400 tracking-widest">{successModalData.pin}</p>
            </div>
            
            <button 
              onClick={() => setSuccessModalData(null)} 
              className="w-full bg-slate-800 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              Tutup & Mulai Kelas
            </button>
          </div>
        </div>
      )}

      <UserProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
};

export default LecturerDashboard;
