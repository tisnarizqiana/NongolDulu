import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CalendarDays, Map, Edit2, Check, X, Search, Download, Users, UserCheck, Clock, AlertTriangle, FileText, Loader } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AttendanceReport = () => {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('all');
  const [filterDate, setFilterDate] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ status: '', notes: '' });
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  useEffect(() => {
    const fetchAttendances = async () => {
      try {
        const response = await axios.get(`${API_URL}/attendances`);
        setAttendances(response.data);
      } catch (error) {
        console.error('Error fetching data', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAttendances();
  }, [API_URL]);

  const saveEdit = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/attendances/${id}`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update local state
      setAttendances(prev => prev.map(a => a.id === id ? { ...a, status: editData.status, notes: editData.notes } : a));
      setEditingId(null);
    } catch (error) {
      alert('Gagal menyimpan perubahan');
    }
  };

  const filteredAttendances = attendances.filter(item => {
    if (filterRole !== 'all' && item.role !== filterRole) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchName = item.nama?.toLowerCase().includes(query);
      const matchNIM = item.nomor_induk?.toLowerCase().includes(query);
      if (!matchName && !matchNIM) return false;
    }

    if (filterDate !== 'all') {
      const itemDate = new Date(item.created_at);
      const now = new Date();
      
      if (filterDate === 'today') {
        if (itemDate.toDateString() !== now.toDateString()) return false;
      } else if (filterDate === 'week') {
        const diff = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1); 
        const firstDay = new Date(now.setDate(diff));
        firstDay.setHours(0,0,0,0);
        if (itemDate < firstDay) return false;
      } else if (filterDate === 'month') {
        if (itemDate.getMonth() !== now.getMonth() || itemDate.getFullYear() !== now.getFullYear()) return false;
      }
    }
    return true;
  });

  const stats = {
    total: filteredAttendances.length,
    hadir: filteredAttendances.filter(a => a.status === 'Hadir').length,
    terlambat: filteredAttendances.filter(a => a.status === 'Terlambat').length,
    absen: filteredAttendances.filter(a => ['Alfa', 'Izin', 'Sakit'].includes(a.status)).length,
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Laporan Absensi Nongol Dulu', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 30);
    
    doc.text(`Total Data: ${stats.total} | Hadir: ${stats.hadir} | Terlambat: ${stats.terlambat} | Absen: ${stats.absen}`, 14, 38);
    
    const tableColumn = ["No", "Nama Lengkap", "Nomor Induk", "Peran", "Waktu Absen", "Status", "Keterangan"];
    const tableRows = [];
    
    filteredAttendances.forEach((item, index) => {
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
      startY: 46,
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
    
    const finalY = doc.lastAutoTable.finalY || 46;
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
    
    doc.save(`Laporan_Absensi_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Laporan Absensi</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Log absensi semua pengguna secara komprehensif</p>
        </div>
        <button 
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
        >
          <Download size={20} />
          Unduh Laporan (PDF)
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl"><FileText size={24}/></div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">Total Data</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.total}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl"><UserCheck size={24}/></div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">Tepat Waktu</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.hadir}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl"><Clock size={24}/></div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">Terlambat</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.terlambat}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-xl"><AlertTriangle size={24}/></div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">Absen/Alfa</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.absen}</h3>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[1.5rem] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Cari nama atau nomor induk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-200 transition-colors"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <select 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="flex-1 md:flex-none px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200"
          >
            <option value="today">Hari Ini</option>
            <option value="week">Minggu Ini</option>
            <option value="month">Bulan Ini</option>
            <option value="all">Semua Waktu</option>
          </select>
          <select 
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="flex-1 md:flex-none px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200"
          >
            <option value="all">Semua Peran</option>
            <option value="mahasiswa">Mahasiswa</option>
            <option value="dosen">Dosen</option>
            <option value="staff">Staff Admin</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300">Nama Lengkap</th>
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300">Nomor Induk</th>
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300">Peran</th>
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300">Waktu Absen</th>
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300">Status</th>
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300">Keterangan</th>
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex justify-center mb-3"><Loader className="animate-spin text-blue-500" size={32} /></div>
                    <span className="font-medium">Memuat data absensi...</span>
                  </td>
                </tr>
              ) : filteredAttendances.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-16 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex justify-center mb-3 opacity-20"><Search size={48} /></div>
                    <span className="font-bold text-lg">Tidak ada data</span>
                    <p className="mt-1">Belum ada data absensi untuk kriteria pencarian ini.</p>
                  </td>
                </tr>
              ) : (
                filteredAttendances.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-5 font-bold text-slate-800 dark:text-slate-100">{item.nama}</td>
                    <td className="p-5 text-slate-600 dark:text-slate-400 font-mono text-sm font-medium">{item.nomor_induk}</td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                        item.role === 'dosen' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                        item.role === 'staff' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {item.role}
                      </span>
                    </td>
                    <td className="p-5 text-slate-600 dark:text-slate-400 text-sm font-bold">
                      {new Date(item.created_at.includes('T') ? item.created_at : item.created_at.replace(' ', 'T') + 'Z').toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')}
                    </td>
                    <td className="p-5">
                      {editingId === item.id ? (
                        <select 
                          value={editData.status} 
                          onChange={e => setEditData({...editData, status: e.target.value})}
                          className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        >
                          <option value="Hadir">Hadir</option>
                          <option value="Terlambat">Terlambat</option>
                          <option value="Sakit">Sakit</option>
                          <option value="Izin">Izin</option>
                          <option value="Alfa">Alfa</option>
                        </select>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1 ${
                          item.status === 'Hadir' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:border-transparent dark:bg-emerald-900/30 dark:text-emerald-400' :
                          item.status === 'Terlambat' ? 'bg-amber-100 text-amber-700 border border-amber-200 dark:border-transparent dark:bg-amber-900/30 dark:text-amber-400' :
                          item.status === 'Sakit' || item.status === 'Izin' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200 dark:border-transparent dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-700 border border-red-200 dark:border-transparent dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {item.status || 'Hadir'}
                        </span>
                      )}
                    </td>
                    <td className="p-5">
                      {editingId === item.id ? (
                        <input 
                          type="text" 
                          value={editData.notes || ''} 
                          onChange={e => setEditData({...editData, notes: e.target.value})}
                          placeholder="Catatan..."
                          className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-1.5 text-sm w-full outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        />
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium italic truncate max-w-[150px] inline-block" title={item.notes}>
                          {item.notes || '-'}
                        </span>
                      )}
                    </td>
                    <td className="p-5 flex gap-2">
                      {editingId === item.id ? (
                        <>
                          <button onClick={() => saveEdit(item.id)} className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:opacity-80 p-2 rounded-xl transition-opacity shadow-sm"><Check size={16} strokeWidth={3}/></button>
                          <button onClick={() => setEditingId(null)} className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:opacity-80 p-2 rounded-xl transition-opacity shadow-sm"><X size={16} strokeWidth={3}/></button>
                        </>
                      ) : (
                        <button 
                          onClick={() => { setEditingId(item.id); setEditData({ status: item.status || 'Hadir', notes: item.notes || '' }); }} 
                          className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 p-2 rounded-xl transition-colors shadow-sm"
                          title="Edit (Override)"
                        >
                          <Edit2 size={16}/>
                        </button>
                      )}
                      {item.latitude && item.longitude && (
                        <a 
                          href={`https://maps.google.com/?q=${item.latitude},${item.longitude}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 p-2 rounded-xl transition-colors shadow-sm"
                          title="Lihat Lokasi GPS"
                        >
                          <Map size={16} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceReport;
