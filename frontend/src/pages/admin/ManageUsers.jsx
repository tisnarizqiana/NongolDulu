import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, UserPlus, Search, Edit2, X, Users, AlertCircle, Loader, User, Hash, Shield, Building2, Check, Mail, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmContext';

const ManageUsers = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal Edit State
  const [editingUser, setEditingUser] = useState(null);
  const [departments, setDepartments] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL;
  const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Pengguna';

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/users?role=${role}`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(`Gagal mengambil data ${displayRole}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepts = async () => {
    try {
      const response = await axios.get(`${API_URL}/departments`);
      setDepartments(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDepts();
  }, [role, API_URL]);

  const handleDelete = async (id, nama) => {
    const isConfirmed = await confirm(`Yakin ingin menghapus data pengguna ${nama}?`, 'Hapus Pengguna');
    if (isConfirmed) {
      const loadingToast = toast.loading(`Menghapus data ${nama}...`);
      try {
        await axios.delete(`${API_URL}/users/${id}`);
        setUsers(users.filter(u => u.id !== id));
        toast.success(`Data ${nama} berhasil dihapus`, { id: loadingToast });
      } catch (error) {
        toast.error(`Gagal menghapus data ${nama}`, { id: loadingToast });
      }
    }
  };

  const handleResetPassword = async (id, nama) => {
    const isConfirmed = await confirm(`Yakin ingin mereset password pengguna ${nama} ke default (Nomor Induk)?`, 'Reset Password');
    if (isConfirmed) {
      const loadingToast = toast.loading(`Mereset password ${nama}...`);
      try {
        const token = localStorage.getItem('token');
        await axios.put(`${API_URL}/users/${id}/reset-password`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(`Password ${nama} berhasil direset ke Nomor Induk`, { id: loadingToast });
      } catch (error) {
        toast.error(`Gagal mereset password ${nama}`, { id: loadingToast });
      }
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading('Menyimpan perubahan...');
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/users/${editingUser.id}`, editingUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingUser(null);
      await fetchUsers();
      toast.success('Perubahan berhasil disimpan', { id: loadingToast });
    } catch (error) {
      toast.error('Gagal menyimpan perubahan.', { id: loadingToast });
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

  const filteredUsers = users.filter(u => 
    u.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.nomor_induk.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Kelola {displayRole}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Daftar pengguna terdaftar pada sistem biometrik presensi</p>
        </div>
        <button 
          onClick={() => navigate(`/admin/enroll?role=${role}`)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-md shadow-blue-500/20 active:scale-95"
        >
          <UserPlus size={20} />
          <span>Registrasi Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 transition-all hover:shadow-md">
          <div className="p-4 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 rounded-2xl">
            <Users size={28} />
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold">Total {displayRole}</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100">
              {loading ? '-' : users.length}
            </h3>
          </div>
        </div>

        {/* Search Bar aligned next to total */}
        <div className="md:col-span-3 bg-white dark:bg-slate-900 rounded-[1.5rem] p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center transition-all">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder={`Cari nama atau nomor induk...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium transition-all"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300">Profil & Nama Lengkap</th>
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300">Nomor Induk</th>
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300">Departemen / Prodi</th>
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300">Tanggal Terdaftar</th>
                <th className="p-5 font-bold text-slate-600 dark:text-slate-300 text-right w-32">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex justify-center mb-3"><Loader className="animate-spin text-blue-500" size={32} /></div>
                    <span className="font-medium">Memuat data pengguna...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-16 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex justify-center mb-4 opacity-30"><AlertCircle size={48} /></div>
                    <span className="font-bold text-lg">Tidak ada data</span>
                    <p className="mt-1 text-sm">Belum ada data yang terdaftar atau cocok dengan pencarian.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm ${getAvatarColor(item.nama)}`}>
                          {item.nama.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-100 text-base">{item.nama}</p>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{item.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 font-mono font-medium border border-slate-200 dark:border-slate-700">
                        {item.nomor_induk}
                      </span>
                    </td>
                    <td className="p-5 font-medium text-slate-700 dark:text-slate-300">
                      {item.departemen || <span className="text-slate-400 italic font-normal">Tidak ada</span>}
                    </td>
                    <td className="p-5 text-slate-500 dark:text-slate-400 text-sm font-medium">
                      {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </td>
                    <td className="p-5 text-right flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setEditingUser(item)}
                        className="text-blue-600 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 p-2.5 rounded-xl transition-colors"
                        title="Edit Data"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleResetPassword(item.id, item.nama)}
                        className="text-amber-600 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 p-2.5 rounded-xl transition-colors"
                        title="Reset Password"
                      >
                        <KeyRound size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id, item.nama)}
                        className="text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 p-2.5 rounded-xl transition-colors"
                        title="Hapus Data"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm ${getAvatarColor(editingUser.nama)}`}>
                  <Edit2 size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Edit Data</h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">{editingUser.nama}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingUser(null)} 
                className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-5">
              <div className="relative group">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input type="text" value={editingUser.nama} onChange={e => setEditingUser({...editingUser, nama: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium transition-all" required />
                </div>
              </div>
              
              <div className="relative group">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Nomor Induk</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input type="text" value={editingUser.nomor_induk} onChange={e => setEditingUser({...editingUser, nomor_induk: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium transition-all" required />
                </div>
              </div>
              
              <div className="relative group">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Role / Peran</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium appearance-none transition-all">
                    <option value="mahasiswa">Mahasiswa</option>
                    <option value="dosen">Dosen</option>
                    <option value="staff">Staff Admin</option>
                  </select>
                </div>
              </div>
              
              <div className="relative group">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Departemen / Prodi</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <select value={editingUser.departemen} onChange={e => setEditingUser({...editingUser, departemen: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium appearance-none transition-all">
                    <option value="">-- Kosong --</option>
                    {departments.map(d => <option key={d.id} value={d.nama_departemen}>{d.nama_departemen}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="relative group">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input type="email" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium transition-all" />
                </div>
              </div>
              
              <div className="pt-2">
                <button type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95">
                  <Check size={20} strokeWidth={3} />
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
