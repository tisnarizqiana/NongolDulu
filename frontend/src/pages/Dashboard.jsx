import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock, Map, LayoutDashboard } from 'lucide-react';

const Dashboard = () => {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL;

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

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-blue-600 rounded-xl text-white">
          <LayoutDashboard size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard Presensi</h1>
          <p className="text-slate-500">Rekapitulasi absensi karyawan</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-5 font-semibold text-slate-600">Nama / NIP</th>
                <th className="p-5 font-semibold text-slate-600">Waktu</th>
                <th className="p-5 font-semibold text-slate-600">Status</th>
                <th className="p-5 font-semibold text-slate-600">Lokasi GPS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-10 text-center text-slate-500">Memuat data...</td>
                </tr>
              ) : attendances.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-10 text-center text-slate-500">Belum ada data absensi.</td>
                </tr>
              ) : (
                attendances.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          {item.nama.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{item.nama}</p>
                          <p className="text-sm text-slate-500">{item.nip}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock size={16} className="text-slate-400" />
                        {new Date(item.created_at).toLocaleString('id-ID')}
                      </div>
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.status === 'Hadir' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-5">
                      {item.latitude && item.longitude ? (
                        <a 
                          href={`https://maps.google.com/?q=${item.latitude},${item.longitude}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:underline"
                        >
                          <Map size={16} /> Lihat Peta
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Tidak ada lokasi</span>
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

export default Dashboard;
