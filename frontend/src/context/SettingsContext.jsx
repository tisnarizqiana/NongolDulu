import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    app_name: 'Nongol Dulu',
    student_label: 'Mahasiswa',
    lecturer_label: 'Dosen',
    staff_label: 'Staff Admin',
    department_label: 'Departemen',
    lecturer_subtitle: 'Kelola jadwal, absensi, dan jurnal dengan mudah dan cepat.',
    student_subtitle: 'Pantau jadwalmu dan pastikan kehadiran selalu tercatat dengan baik hari ini.',
    staff_subtitle: 'Pantau jadwal shift Anda dan pastikan log kehadiran harian tercatat secara akurat.',
    subject_label: 'Mata Kuliah',
    schedule_label: 'Jadwal Perkuliahan',
    student_header: 'SIAKAD Mahasiswa',
    lecturer_header: 'SIAKAD Dosen V5',
    staff_header: 'SIAKAD Staff'
  });
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/settings`);
      if (res.data && res.data.app_name) {
        setSettings(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const getLogoUrl = () => {
    const path = settings.app_logo;
    if (!path) return '/favicon.png';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}${path}`;
  };

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    const logoUrl = getLogoUrl();
    if (link) {
      link.href = logoUrl;
    } else {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.href = logoUrl;
      document.head.appendChild(newLink);
    }
  }, [settings.app_logo]); // getLogoUrl depends on settings.app_logo and API_URL (constant)

  return (
    <SettingsContext.Provider value={{ settings, fetchSettings, loading, getLogoUrl }}>
      {!loading ? children : (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}
    </SettingsContext.Provider>
  );
};
