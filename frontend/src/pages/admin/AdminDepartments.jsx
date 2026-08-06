import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Building, Trash2, Plus, Edit2, X, Check, Search, AlertCircle, Loader, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';

const AdminDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [newDept, setNewDept] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const confirm = useConfirm();

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchDepts = async () => {
    try {
      const res = await axios.get(`${API_URL}/departments`);
      setDepartments(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil data departemen');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, [API_URL]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newDept.trim()) {
      toast.error('Nama departemen tidak boleh kosong');
      return;
    }
    
    const loadingToast = toast.loading('Menambahkan departemen...');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/departments`, { nama_departemen: newDept }, { headers: { Authorization: `Bearer ${token}` } });
      setNewDept('');
      await fetchDepts();
      toast.success('Departemen berhasil ditambahkan', { id: loadingToast });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal menambah departemen (Mungkin duplikat)', { id: loadingToast });
    }
  };

  const handleDelete = async (id, nama) => {
    const isConfirmed = await confirm(`Yakin ingin menghapus departemen ${nama}?`, 'Hapus Departemen');
    if (!isConfirmed) return;
    
    const loadingToast = toast.loading('Menghapus departemen...');
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/departments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      await fetchDepts();
      toast.success('Departemen berhasil dihapus', { id: loadingToast });
    } catch (err) {
      toast.error('Gagal menghapus departemen', { id: loadingToast });
    }
  };

  const handleUpdate = async (id) => {
    if (!editValue.trim()) {
      toast.error('Nama departemen tidak boleh kosong');
      return;
    }
    
    const loadingToast = toast.loading('Menyimpan perubahan...');
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/departments/${id}`, { nama_departemen: editValue }, { headers: { Authorization: `Bearer ${token}` } });
      setEditingId(null);
      await fetchDepts();
      toast.success('Perubahan berhasil disimpan', { id: loadingToast });
    } catch (err) {
      toast.error('Gagal menyimpan perubahan', { id: loadingToast });
    }
  };

  // Generate a consistent color based on string
  const getAvatarColor = (str) => {
    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500', 'bg-rose-500'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const filteredDepts = departments.filter(d => 
    d.nama_departemen.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Kelola Departemen / Fakultas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Daftar ini akan muncul di form Registrasi Wajah pengguna baru</p>
        </div>
      </div>

      {/* Summary & Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Total Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl">
            <Building2 size={28} />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">Total Departemen</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100">
              {loading ? '-' : departments.length}
            </h3>
          </div>
        </div>

        {/* Add Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-all">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Tambah Departemen Baru</h3>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                value={newDept}
                onChange={e => setNewDept(e.target.value)}
                placeholder="Misal: Fakultas Ilmu Komputer"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-800 dark:text-slate-200 transition-colors"
              />
            </div>
            <button 
              type="submit" 
              disabled={!newDept.trim()}
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
            <Building2 size={20} className="text-blue-500"/>
            Daftar Departemen
          </h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Cari departemen..."
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
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300">Nama Departemen</th>
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300 text-right w-32">Aksi</th>
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
              ) : filteredDepts.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-16 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex justify-center mb-4 opacity-30"><AlertCircle size={48} /></div>
                    <span className="font-bold text-lg">Tidak ada data</span>
                    <p className="mt-1 text-sm">Belum ada departemen yang ditambahkan atau cocok dengan pencarian.</p>
                  </td>
                </tr>
              ) : (
                filteredDepts.map(d => (
                  <tr key={d.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="p-5 font-mono text-slate-500 dark:text-slate-400 text-sm">{d.id}</td>
                    <td className="p-5">
                      {editingId === d.id ? (
                        <input 
                          type="text" 
                          value={editValue} 
                          onChange={e => setEditValue(e.target.value)} 
                          className="px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl w-full max-w-md outline-none focus:ring-2 focus:ring-blue-500 font-bold shadow-sm" 
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdate(d.id)}
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm ${getAvatarColor(d.nama_departemen)}`}>
                            {d.nama_departemen.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{d.nama_departemen}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-5 text-right flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {editingId === d.id ? (
                        <>
                          <button onClick={() => handleUpdate(d.id)} title="Simpan" className="text-emerald-600 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 p-2.5 rounded-xl transition-colors"><Check size={18} strokeWidth={3}/></button>
                          <button onClick={() => setEditingId(null)} title="Batal" className="text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 p-2.5 rounded-xl transition-colors"><X size={18} strokeWidth={3}/></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(d.id); setEditValue(d.nama_departemen); }} title="Edit" className="text-blue-600 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 p-2.5 rounded-xl transition-colors"><Edit2 size={18}/></button>
                          <button onClick={() => handleDelete(d.id, d.nama_departemen)} title="Hapus" className="text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 p-2.5 rounded-xl transition-colors"><Trash2 size={18}/></button>
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
    </div>
  );
};

export default AdminDepartments;
