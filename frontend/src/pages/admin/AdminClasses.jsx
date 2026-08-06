import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BookOpen, Trash2, Plus, Users, Edit2, X, Check, Search, AlertCircle, Loader, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';

const AdminClasses = () => {
  const [classes, setClasses] = useState([]);
  const [newClass, setNewClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const confirm = useConfirm();
  
  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Class Enrollment Modal State
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState('');
  const [modalSearchQuery, setModalSearchQuery] = useState('');

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${API_URL}/classes`);
      setClasses(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil data kelas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [API_URL]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newClass.trim()) {
      toast.error('Nama kelas tidak boleh kosong');
      return;
    }
    
    const loadingToast = toast.loading('Menambahkan kelas...');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/classes`, { nama_mata_kuliah: newClass }, { headers: { Authorization: `Bearer ${token}` } });
      setNewClass('');
      await fetchClasses();
      toast.success('Kelas berhasil ditambahkan', { id: loadingToast });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menambah kelas', { id: loadingToast });
    }
  };

  const handleUpdate = async (id) => {
    if (!editValue.trim()) {
      toast.error('Nama kelas tidak boleh kosong');
      return;
    }

    const loadingToast = toast.loading('Menyimpan perubahan...');
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/classes/${id}`, { nama_mata_kuliah: editValue }, { headers: { Authorization: `Bearer ${token}` } });
      setEditingId(null);
      await fetchClasses();
      toast.success('Perubahan berhasil disimpan', { id: loadingToast });
    } catch (err) {
      toast.error('Gagal menyimpan perubahan', { id: loadingToast });
    }
  };

  const handleDelete = async (id, nama) => {
    const isConfirmed = await confirm(`Yakin ingin menghapus kelas ${nama}?`, 'Hapus Kelas');
    if (!isConfirmed) return;
    
    const loadingToast = toast.loading('Menghapus kelas...');
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/classes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      await fetchClasses();
      toast.success('Kelas berhasil dihapus', { id: loadingToast });
    } catch (err) {
      toast.error('Gagal menghapus kelas', { id: loadingToast });
    }
  };

  // --- Class Enrollment Logic ---
  const openEnrollmentModal = async (cls) => {
    setSelectedClass(cls);
    setSelectedStudentToAdd('');
    setModalSearchQuery('');
    
    try {
      const token = localStorage.getItem('token');
      const [studentsRes, allRes] = await Promise.all([
        axios.get(`${API_URL}/classes/${cls.id}/students`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/users?role=mahasiswa`)
      ]);
      setClassStudents(studentsRes.data);
      
      // Filter out students that are already in the class for the dropdown
      const enrolledIds = studentsRes.data.map(s => s.id);
      setAllStudents(allRes.data.filter(s => !enrolledIds.includes(s.id)));
    } catch (error) {
      console.error('Error fetching enrollments', error);
      toast.error('Gagal memuat data anggota kelas');
    }
  };

  const handleAddStudentToClass = async () => {
    if (!selectedStudentToAdd) return;
    
    const loadingToast = toast.loading('Menambahkan anggota...');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/class-enrollments`, 
        { class_id: selectedClass.id, mahasiswa_id: selectedStudentToAdd }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await openEnrollmentModal(selectedClass); // Refresh
      toast.success('Mahasiswa berhasil ditambahkan', { id: loadingToast });
    } catch (error) {
      toast.error('Gagal menambahkan mahasiswa ke kelas', { id: loadingToast });
    }
  };

  const handleRemoveStudentFromClass = async (mahasiswa_id, nama) => {
    const isConfirmed = await confirm(`Keluarkan ${nama} dari kelas ini?`, 'Keluarkan Mahasiswa');
    if (!isConfirmed) return;

    const loadingToast = toast.loading('Mengeluarkan anggota...');
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/class-enrollments/${selectedClass.id}/${mahasiswa_id}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await openEnrollmentModal(selectedClass); // Refresh
      toast.success('Mahasiswa berhasil dikeluarkan', { id: loadingToast });
    } catch (error) {
      toast.error('Gagal mengeluarkan mahasiswa', { id: loadingToast });
    }
  };

  // Generate a consistent color based on string
  const getAvatarColor = (str) => {
    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500'];
    let hash = 0;
    if (!str) return colors[0];
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const filteredClasses = classes.filter(c => 
    c.nama_mata_kuliah.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredClassStudents = classStudents.filter(s =>
    s.nama.toLowerCase().includes(modalSearchQuery.toLowerCase()) || 
    s.nomor_induk.toLowerCase().includes(modalSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Kelola Kelas / Mata Kuliah</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Mata kuliah yang akan dipasangkan ke jadwal dan menampung mahasiswa</p>
        </div>
      </div>

      {/* Summary & Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Total Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl">
            <BookOpen size={28} />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">Total Kelas</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100">
              {loading ? '-' : classes.length}
            </h3>
          </div>
        </div>

        {/* Add Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-all">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Tambah Kelas Baru</h3>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                value={newClass}
                onChange={e => setNewClass(e.target.value)}
                placeholder="Misal: Pemrograman Web Lanjut"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-800 dark:text-slate-200 transition-colors"
              />
            </div>
            <button 
              type="submit" 
              disabled={!newClass.trim()}
              className="bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
            >
              <Plus size={20} /> Simpan
            </button>
          </form>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BookOpen size={20} className="text-blue-500"/>
            Daftar Kelas Terdaftar
          </h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Cari kelas..."
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
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300 w-24">ID</th>
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300">Nama Kelas / Mata Kuliah</th>
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300 text-right w-48">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" className="p-10 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex justify-center mb-3"><Loader className="animate-spin text-blue-500" size={32} /></div>
                    <span className="font-medium">Memuat data...</span>
                  </td>
                </tr>
              ) : filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-16 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex justify-center mb-4 opacity-30"><AlertCircle size={48} /></div>
                    <span className="font-bold text-lg">Tidak ada data</span>
                    <p className="mt-1 text-sm">Belum ada kelas yang ditambahkan atau cocok dengan pencarian.</p>
                  </td>
                </tr>
              ) : (
                filteredClasses.map(c => (
                  <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="p-5 font-mono text-slate-500 dark:text-slate-400 text-sm">{c.id}</td>
                    <td className="p-5">
                      {editingId === c.id ? (
                        <input 
                          type="text" 
                          value={editValue} 
                          onChange={e => setEditValue(e.target.value)} 
                          className="px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl w-full max-w-md outline-none focus:ring-2 focus:ring-blue-500 font-bold shadow-sm" 
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdate(c.id)}
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm ${getAvatarColor(c.nama_mata_kuliah)}`}>
                            {c.nama_mata_kuliah.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{c.nama_mata_kuliah}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-5 text-right flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {editingId === c.id ? (
                        <>
                          <button onClick={() => handleUpdate(c.id)} title="Simpan" className="text-emerald-600 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 p-2.5 rounded-xl transition-colors"><Check size={18} strokeWidth={3}/></button>
                          <button onClick={() => setEditingId(null)} title="Batal" className="text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 p-2.5 rounded-xl transition-colors"><X size={18} strokeWidth={3}/></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => openEnrollmentModal(c)} title="Anggota Kelas" className="text-violet-600 bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/30 dark:hover:bg-violet-900/50 px-3 py-2 rounded-xl transition-colors flex items-center gap-2 font-bold text-sm">
                            <Users size={16}/> Anggota
                          </button>
                          <button onClick={() => { setEditingId(c.id); setEditValue(c.nama_mata_kuliah); }} title="Edit" className="text-blue-600 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 p-2.5 rounded-xl transition-colors"><Edit2 size={18}/></button>
                          <button onClick={() => handleDelete(c.id, c.nama_mata_kuliah)} title="Hapus" className="text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 p-2.5 rounded-xl transition-colors"><Trash2 size={18}/></button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL KELOLA ANGGOTA KELAS */}
      {selectedClass && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm ${getAvatarColor(selectedClass.nama_mata_kuliah)}`}>
                  <BookOpen size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Anggota Kelas</h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">{selectedClass.nama_mata_kuliah}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedClass(null)} 
                className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>
            
            {/* Add Student Section */}
            <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 border-b border-slate-100 dark:border-slate-800">
              <label className="block text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                <UserPlus size={16}/> Tambah Mahasiswa ke Kelas
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <select 
                  value={selectedStudentToAdd} 
                  onChange={e => setSelectedStudentToAdd(e.target.value)}
                  className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-200 shadow-sm"
                >
                  <option value="">-- Pilih Mahasiswa --</option>
                  {allStudents.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.nomor_induk})</option>)}
                </select>
                <button 
                  onClick={handleAddStudentToClass} 
                  disabled={!selectedStudentToAdd}
                  className="bg-blue-600 disabled:bg-slate-300 disabled:dark:bg-slate-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                >
                  Tambahkan
                </button>
              </div>
            </div>

            {/* Students List Section */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-lg">
                  <Users size={20} className="text-emerald-500"/> 
                  Terdaftar 
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-sm">{classStudents.length}</span>
                </h3>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Cari anggota..."
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-900/50 custom-scrollbar">
                {classStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
                      <Users size={32} />
                    </div>
                    <p className="font-bold text-slate-600 dark:text-slate-300">Kelas Masih Kosong</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Belum ada mahasiswa yang ditambahkan.</p>
                  </div>
                ) : filteredClassStudents.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    Tidak ada anggota yang cocok dengan pencarian.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredClassStudents.map(student => (
                      <div key={student.id} className="flex justify-between items-center p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm">
                            {student.nama.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100 line-clamp-1" title={student.nama}>{student.nama}</p>
                            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">{student.nomor_induk}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemoveStudentFromClass(student.id, student.nama)} 
                          title="Keluarkan"
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-xl transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClasses;
