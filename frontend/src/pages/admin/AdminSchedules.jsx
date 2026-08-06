import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock, Trash2, Plus, Edit2, X, Download, Search, AlertCircle, Loader, Calendar, User, BookOpen, FileSpreadsheet, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useConfirm } from '../../context/ConfirmContext';

const AdminSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [dosens, setDosens] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const confirm = useConfirm();
  
  const [formData, setFormData] = useState({
    class_id: '',
    dosen_id: '',
    hari: 'Senin',
    jam_mulai: '08:00',
    jam_selesai: '10:00'
  });
  
  const [loading, setLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [schedRes, classRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/schedules`, { headers }),
        axios.get(`${API_URL}/classes`),
        axios.get(`${API_URL}/users`)
      ]);
      
      setSchedules(schedRes.data);
      setClasses(classRes.data);
      
      // Ambil dosen dan staff untuk pembuat jadwal
      const dosenAndStaff = usersRes.data.filter(u => u.role === 'dosen' || u.role === 'staff');
      setDosens(dosenAndStaff);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil data jadwal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [API_URL]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (editingSchedule) {
      setEditingSchedule({ ...editingSchedule, [name]: value });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddOrUpdate = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading(editingSchedule ? 'Menyimpan perubahan...' : 'Membuat jadwal...');
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (editingSchedule) {
        await axios.put(`${API_URL}/schedules/${editingSchedule.id}`, editingSchedule, { headers });
        setEditingSchedule(null);
        toast.success('Jadwal berhasil diperbarui!', { id: loadingToast });
      } else {
        await axios.post(`${API_URL}/schedules`, formData, { headers });
        toast.success('Jadwal berhasil ditambahkan!', { id: loadingToast });
        setFormData({ ...formData, class_id: '', dosen_id: '' });
      }
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan jadwal.', { id: loadingToast });
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm('Yakin ingin menghapus jadwal ini?', 'Hapus Jadwal');
    if (!isConfirmed) return;
    const loadingToast = toast.loading('Menghapus jadwal...');
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/schedules/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Jadwal berhasil dihapus!', { id: loadingToast });
      fetchData();
    } catch (err) {
      toast.error('Gagal menghapus jadwal.', { id: loadingToast });
    }
  };

  const formValues = editingSchedule || formData;

  const exportMasterSheet = async (scheduleId, courseName) => {
    const loadingToast = toast.loading('Mengambil data Master Sheet...');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/schedules/${scheduleId}/recap`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { sessions, students, attendances } = res.data;
      if (!students || students.length === 0) {
        toast.error('Belum ada data mahasiswa / absensi di kelas ini.', { id: loadingToast });
        return;
      }

      const doc = new jsPDF('landscape');
      doc.text(`Master Sheet Absensi - ${courseName || 'Kelas'}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Diunduh oleh Super Admin`, 14, 22);

      const tableColumn = ["No", "NIM", "Nama"];
      sessions.forEach(s => tableColumn.push(`P${s.pertemuan_ke}`));
      tableColumn.push("Hadir", "Sakit", "Izin", "Alfa", "%");

      const tableRows = [];
      students.forEach((student, index) => {
        const rowData = [
          index + 1,
          student.nomor_induk,
          student.nama
        ];
        
        let hadir = 0, sakit = 0, izin = 0, alfa = 0;
        
        sessions.forEach(s => {
          const att = attendances.find(a => a.user_id === student.user_id && a.session_id === s.id);
          const status = att ? att.status : null;
          
          if (status === 'Hadir') hadir++;
          else if (status === 'Sakit') sakit++;
          else if (status === 'Izin') izin++;
          else if (status === 'Alfa') alfa++;
          
          rowData.push(status ? status.charAt(0) : '-');
        });
        
        const percentage = sessions.length > 0 ? Math.round((hadir / sessions.length) * 100) : 0;
        rowData.push(hadir, sakit, izin, alfa, `${percentage}%`);
        tableRows.push(rowData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      doc.save(`Master_Sheet_${courseName || 'Kelas'}.pdf`);
      toast.success('Master Sheet berhasil diunduh!', { id: loadingToast });
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Gagal mengekspor data.', { id: loadingToast });
    }
  };

  const getAvatarColor = (str) => {
    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500'];
    let hash = 0;
    if (!str) return colors[0];
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const filteredSchedules = schedules.filter(s => 
    (s.nama_mata_kuliah?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (s.nama_dosen?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (s.hari?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Kelola Jadwal & Shift</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Buat atau perbarui jadwal pengajaran dosen dan shift staff</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Total Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl">
            <Calendar size={28} />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">Total Jadwal</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100">
              {loading ? '-' : schedules.length}
            </h3>
          </div>
        </div>

        {/* Add/Edit Form */}
        <div className={`lg:col-span-3 rounded-[1.5rem] p-6 shadow-sm border transition-all ${editingSchedule ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-lg font-bold flex items-center gap-2 ${editingSchedule ? 'text-amber-800 dark:text-amber-500' : 'text-slate-800 dark:text-slate-100'}`}>
              {editingSchedule ? <Edit2 size={20}/> : <Plus size={20}/>}
              {editingSchedule ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}
            </h3>
            {editingSchedule && (
              <button onClick={() => setEditingSchedule(null)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-sm font-bold transition-all">
                <X size={16} /> Batal Edit
              </button>
            )}
          </div>

          <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4 relative">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kelas / Mata Kuliah</label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select name="class_id" value={formValues.class_id || ''} onChange={handleInputChange} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 dark:text-slate-200 appearance-none">
                  <option value="">-- Pilih Kelas (Kosong = Staff) --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.nama_mata_kuliah}</option>)}
                </select>
              </div>
            </div>
            
            <div className="md:col-span-4 relative">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Dosen / Staff Terjadwal</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select name="dosen_id" value={formValues.dosen_id || ''} onChange={handleInputChange} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 dark:text-slate-200 appearance-none">
                  <option value="">-- Pilih Dosen / Staff --</option>
                  {dosens.map(d => <option key={d.id} value={d.id}>{d.nama} ({d.nomor_induk})</option>)}
                </select>
              </div>
            </div>
            
            <div className="md:col-span-4 relative">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Hari</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select name="hari" value={formValues.hari} onChange={handleInputChange} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 dark:text-slate-200 appearance-none">
                  {['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'].map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
            
            <div className="md:col-span-4 relative">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Jam Mulai</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="time" name="jam_mulai" value={formValues.jam_mulai} onChange={handleInputChange} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 dark:text-slate-200" required />
              </div>
            </div>
            
            <div className="md:col-span-4 relative">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Jam Selesai</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="time" name="jam_selesai" value={formValues.jam_selesai} onChange={handleInputChange} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 dark:text-slate-200" required />
              </div>
            </div>
            
            <div className="md:col-span-4 flex items-end">
              <button type="submit" className={`w-full text-white px-6 py-2.5 rounded-xl flex justify-center items-center gap-2 font-bold shadow-md active:scale-95 transition-all ${editingSchedule ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}>
                {editingSchedule ? <><Check size={18} /> Simpan</> : <><Plus size={18} /> Buat Jadwal</>}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar size={20} className="text-indigo-500"/>
            Daftar Jadwal
          </h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Cari kelas, dosen, atau hari..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-800 dark:text-slate-200 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300 w-48">Hari & Waktu</th>
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300">Kelas / Mata Kuliah</th>
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300">Dosen / Staff</th>
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300 text-right w-48">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-10 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex justify-center mb-3"><Loader className="animate-spin text-blue-500" size={32} /></div>
                    <span className="font-medium">Memuat data jadwal...</span>
                  </td>
                </tr>
              ) : filteredSchedules.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-16 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex justify-center mb-4 opacity-30"><AlertCircle size={48} /></div>
                    <span className="font-bold text-lg">Tidak ada data</span>
                    <p className="mt-1 text-sm">Belum ada jadwal yang dibuat atau cocok dengan pencarian.</p>
                  </td>
                </tr>
              ) : (
                filteredSchedules.map(s => (
                  <tr key={s.id} className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group ${editingSchedule?.id === s.id ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                    <td className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl mt-1">
                          <Clock size={16} />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{s.hari}</span>
                          <p className="text-sm font-mono text-slate-500 dark:text-slate-400 mt-0.5">{s.jam_mulai} - {s.jam_selesai}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      {s.nama_mata_kuliah ? (
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold shadow-sm text-xs ${getAvatarColor(s.nama_mata_kuliah)}`}>
                            {s.nama_mata_kuliah.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{s.nama_mata_kuliah}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700">Tidak ada (Shift)</span>
                      )}
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shadow-sm text-xs ${getAvatarColor(s.nama_dosen || 'Staff')}`}>
                          {(s.nama_dosen || 'S').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{s.nama_dosen || '-'}</span>
                      </div>
                    </td>
                    <td className="p-5 text-right flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {s.nama_mata_kuliah && (
                        <button onClick={() => exportMasterSheet(s.id, s.nama_mata_kuliah)} title="Unduh Master Sheet" className="text-emerald-600 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 p-2.5 rounded-xl transition-colors">
                          <FileSpreadsheet size={18} />
                        </button>
                      )}
                      <button onClick={() => setEditingSchedule(s)} title="Edit Jadwal" className="text-blue-600 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 p-2.5 rounded-xl transition-colors">
                        <Edit2 size={18}/>
                      </button>
                      <button onClick={() => handleDelete(s.id)} title="Hapus Jadwal" className="text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 p-2.5 rounded-xl transition-colors">
                        <Trash2 size={18}/>
                      </button>
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

export default AdminSchedules;
