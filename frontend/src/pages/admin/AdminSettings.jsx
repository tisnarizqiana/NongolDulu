import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Settings, Save, RefreshCw, Type, LayoutTemplate, GraduationCap, Users, UserCog, Building, BookOpen, CalendarDays, Heading, AlignLeft, RotateCcw, Upload, Image as ImageIcon, X } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useConfirm } from '../../context/ConfirmContext';

const DEFAULT_SETTINGS = {
  app_name: 'Nongol Dulu',
  app_logo: '',
  department_label: 'Departemen',
  subject_label: 'Mata Kuliah',
  schedule_label: 'Jadwal Perkuliahan',
  
  student_label: 'Kelola Mahasiswa',
  student_header: 'Dashboard Mahasiswa',
  student_subtitle: 'Pantau jadwalmu dan pastikan kehadiran selalu tercatat dengan baik hari ini.',
  
  lecturer_label: 'Kelola Dosen',
  lecturer_header: 'Dashboard Dosen',
  lecturer_subtitle: 'Pantau jadwal mengajar dan kelola presensi mahasiswa dengan mudah.',
  
  staff_label: 'Kelola Staff Admin',
  staff_header: 'Dashboard Staff / Admin',
  staff_subtitle: 'Kelola data master dan pastikan sistem akademik berjalan lancar hari ini.'
};

const AdminSettings = () => {
  const { settings: currentSettings, fetchSettings } = useSettings();
  const confirm = useConfirm();
  const [formData, setFormData] = useState({
    app_name: '',
    app_logo: '',
    department_label: '',
    subject_label: '',
    schedule_label: '',
    
    student_label: '',
    student_header: '',
    student_subtitle: '',
    
    lecturer_label: '',
    lecturer_header: '',
    lecturer_subtitle: '',
    
    staff_label: '',
    staff_header: '',
    staff_subtitle: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const fileInputRef = useRef(null);
  
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (currentSettings) {
      setFormData({
        app_name: currentSettings.app_name || '',
        app_logo: currentSettings.app_logo || '',
        department_label: currentSettings.department_label || '',
        subject_label: currentSettings.subject_label || '',
        schedule_label: currentSettings.schedule_label || '',
        
        student_label: currentSettings.student_label || '',
        student_header: currentSettings.student_header || '',
        student_subtitle: currentSettings.student_subtitle || '',
        
        lecturer_label: currentSettings.lecturer_label || '',
        lecturer_header: currentSettings.lecturer_header || '',
        lecturer_subtitle: currentSettings.lecturer_subtitle || '',
        
        staff_label: currentSettings.staff_label || '',
        staff_header: currentSettings.staff_header || '',
        staff_subtitle: currentSettings.staff_subtitle || ''
      });
      setIsDirty(false);
    }
  }, [currentSettings]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setIsDirty(true);
  };

  const handleResetToDefault = async () => {
    const isConfirmed = await confirm('Apakah Anda yakin ingin mereset semua label ke pengaturan bawaan? (Logo tidak akan terhapus)', 'Reset Pengaturan');
    if (isConfirmed) {
      setFormData(prev => ({ ...DEFAULT_SETTINGS, app_logo: prev.app_logo }));
      setIsDirty(true);
    }
  };
  
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Harap unggah file gambar yang valid');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 5MB');
      return;
    }

    const uploadData = new FormData();
    uploadData.append('logo', file);
    
    setIsUploading(true);
    try {
      const response = await axios.post(`${API_URL}/settings/logo`, uploadData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const newLogoUrl = response.data.url;
      setFormData(prev => ({ ...prev, app_logo: newLogoUrl }));
      setIsDirty(true);
      toast.success('Logo berhasil diunggah (jangan lupa simpan pengaturan)');
    } catch (error) {
      console.error('Logo upload error:', error);
      toast.error(error.response?.data?.error || 'Gagal mengunggah logo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const removeLogo = () => {
    setFormData(prev => ({ ...prev, app_logo: '' }));
    setIsDirty(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDirty) return;
    
    setIsSaving(true);
    try {
      await axios.put(`${API_URL}/settings`, formData);
      toast.success('Pengaturan berhasil diperbarui!');
      await fetchSettings();
      setIsDirty(false);
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.error || 'Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper untuk resolve URL gambar jika diakses cross-origin
  const getFullLogoUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}${path}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative pb-24">
      {/* STICKY HEADER */}
      <div className="sticky top-0 z-20 -mx-6 px-6 py-4 -mt-6 mb-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 transition-all">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Settings className="text-blue-600" size={28} />
            Pengaturan Sistem (CMS)
          </h1>
          <div className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium flex items-center flex-wrap gap-2">
            Sesuaikan label dan terminologi aplikasi agar cocok dengan instansi Anda.
            {isDirty && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-bold text-xs animate-pulse">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                Belum Disimpan
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button
            onClick={handleResetToDefault}
            className="flex-1 lg:flex-none text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <RotateCcw size={18} />
            <span className="hidden sm:inline">Reset Bawaan</span>
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !isDirty}
            className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 ${
              isDirty 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 cursor-pointer' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-70'
            }`}
          >
            {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
            {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
        {/* GROUP: GLOBAL & LOGO */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 transition-all hover:shadow-md lg:col-span-2">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
              <LayoutTemplate size={20} />
            </div>
            Identitas Aplikasi
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* KOLOM LOGO UPLOAD */}
            <div className="lg:col-span-4 flex flex-col gap-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Logo Instansi</label>
              
              <div className="relative group rounded-[1.5rem] border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center h-48 sm:h-56 w-full overflow-hidden transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                
                {formData.app_logo ? (
                  <>
                    <img src={getFullLogoUrl(formData.app_logo)} alt="Logo Preview" className="w-full h-full object-contain p-4" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-3 transition-opacity">
                      <button type="button" className="bg-white text-slate-800 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-slate-100 cursor-pointer">
                        <Upload size={16} /> Ganti Logo
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeLogo(); }} className="text-red-400 hover:text-red-300 text-sm font-medium flex items-center gap-1 cursor-pointer">
                        <X size={16} /> Hapus Logo
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      {isUploading ? <RefreshCw className="animate-spin" size={28} /> : <ImageIcon size={28} />}
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {isUploading ? 'Mengunggah...' : 'Klik untuk unggah logo'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">PNG, JPG up to 5MB</p>
                  </div>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleLogoUpload} 
                  accept="image/png, image/jpeg, image/webp" 
                  className="hidden" 
                />
              </div>
            </div>

            {/* KOLOM FORM GLOBAL */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nama Aplikasi</label>
                <div className="relative">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" name="app_name" value={formData.app_name} onChange={handleChange} required className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900" />
                </div>
              </div>
              
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Label Departemen</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" name="department_label" value={formData.department_label} onChange={handleChange} required className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900" />
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Label Mata Kuliah</label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" name="subject_label" value={formData.subject_label} onChange={handleChange} required className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900" />
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Label Jadwal Perkuliahan</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" name="schedule_label" value={formData.schedule_label} onChange={handleChange} required className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* GROUP: MAHASISWA */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 transition-all hover:shadow-md group">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-105 transition-transform">
              <GraduationCap size={20} />
            </div>
            Dasbor Mahasiswa
          </h3>
          
          <div className="space-y-5">
            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Label Entitas</label>
              <div className="relative">
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" name="student_label" value={formData.student_label} onChange={handleChange} required className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900" />
              </div>
            </div>
            
            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Header Dasbor</label>
              <div className="relative">
                <Heading className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" name="student_header" value={formData.student_header} onChange={handleChange} required className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900" />
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Teks Sambutan</label>
              <div className="relative">
                <AlignLeft className="absolute left-3 top-3 text-slate-400" size={16} />
                <textarea name="student_subtitle" value={formData.student_subtitle} onChange={handleChange} required rows="3" className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900 resize-none" />
              </div>
            </div>
          </div>
        </div>

        {/* GROUP: DOSEN */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 transition-all hover:shadow-md group">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:scale-105 transition-transform">
              <Users size={20} />
            </div>
            Dasbor Dosen
          </h3>
          
          <div className="space-y-5">
            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Label Entitas</label>
              <div className="relative">
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" name="lecturer_label" value={formData.lecturer_label} onChange={handleChange} required className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-700 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900" />
              </div>
            </div>
            
            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Header Dasbor</label>
              <div className="relative">
                <Heading className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" name="lecturer_header" value={formData.lecturer_header} onChange={handleChange} required className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-700 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900" />
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Teks Sambutan</label>
              <div className="relative">
                <AlignLeft className="absolute left-3 top-3 text-slate-400" size={16} />
                <textarea name="lecturer_subtitle" value={formData.lecturer_subtitle} onChange={handleChange} required rows="3" className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-700 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900 resize-none" />
              </div>
            </div>
          </div>
        </div>

        {/* GROUP: STAFF */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 transition-all hover:shadow-md lg:col-span-2 mx-auto w-full group">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl group-hover:scale-105 transition-transform">
              <UserCog size={20} />
            </div>
            Dasbor Staff / Admin
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-5">
            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Label Entitas</label>
              <div className="relative">
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" name="staff_label" value={formData.staff_label} onChange={handleChange} required className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-medium text-slate-700 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900" />
              </div>
            </div>
            
            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Header Dasbor</label>
              <div className="relative">
                <Heading className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" name="staff_header" value={formData.staff_header} onChange={handleChange} required className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-medium text-slate-700 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900" />
              </div>
            </div>

            <div className="relative lg:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Teks Sambutan</label>
              <div className="relative">
                <AlignLeft className="absolute left-3 top-3 text-slate-400" size={16} />
                <textarea name="staff_subtitle" value={formData.staff_subtitle} onChange={handleChange} required rows="2" className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-medium text-slate-700 dark:text-slate-200 transition-all focus:bg-white dark:focus:bg-slate-900 resize-none" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminSettings;
