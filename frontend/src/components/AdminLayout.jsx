import React, { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, UserCog, UserCheck, CalendarDays, LogOut, Shield, Building, BookOpen, Clock, UserPlus, Menu, X, Search, Bell, Home, ChevronDown, Settings as SettingsIcon, ScanFace } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useSettings } from '../context/SettingsContext';
import UserProfile from './UserProfile';

const AdminSidebarItem = ({ to, icon: Icon, children, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`flex items-center gap-4 px-5 py-3.5 rounded-full font-medium transition-all mb-2 ${
        isActive 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
      }`}
    >
      <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
      <span className="tracking-wide text-sm">{children}</span>
    </Link>
  );
};

const SidebarGroup = ({ title }) => (
  <div className="mt-4 mb-2 px-5 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
    {title}
  </div>
);

const AdminLayout = () => {
  const { logout, user } = useAuth();
  const { settings, getLogoUrl } = useSettings();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300 font-sans">
      
      {/* Mobile Top Navigation */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-50 flex justify-between items-center px-4">
        <div className="flex items-center gap-3 text-blue-600 font-black text-xl tracking-wide">
          <img src={getLogoUrl()} alt="Logo NONGOL" className="w-9 h-9 object-contain drop-shadow-sm" />
          <span className="whitespace-nowrap">{settings.app_name}</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-300">
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Overlay Backdrop for Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Original White/Slate Theme */}
      <aside className={`w-[280px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 fixed h-full flex flex-col transition-transform duration-300 z-50 
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 shadow-lg`}
      >
        <div className="p-5 flex justify-between items-center">
          <div className="flex items-center gap-3 text-blue-600 font-black text-xl tracking-wide">
            <img src={getLogoUrl()} alt="Logo NONGOL" className="w-9 h-9 object-contain drop-shadow-sm" />
            <span className="whitespace-nowrap">{settings.app_name}</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 text-slate-500">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-5 flex-grow overflow-y-auto custom-scrollbar">
          <SidebarGroup title="Utama" />
          <AdminSidebarItem onClick={() => setSidebarOpen(false)} to="/admin" icon={LayoutDashboard}>Dashboard</AdminSidebarItem>
          <AdminSidebarItem onClick={() => setSidebarOpen(false)} to="/admin/kiosk" icon={ScanFace}>Kiosk Absensi</AdminSidebarItem>
          <AdminSidebarItem onClick={() => setSidebarOpen(false)} to="/admin/attendances" icon={CalendarDays}>Laporan Absensi</AdminSidebarItem>
          
          <SidebarGroup title="Akademik" />
          <AdminSidebarItem onClick={() => setSidebarOpen(false)} to="/admin/departments" icon={Building}>{settings.department_label}</AdminSidebarItem>
          <AdminSidebarItem onClick={() => setSidebarOpen(false)} to="/admin/classes" icon={BookOpen}>Kelas</AdminSidebarItem>
          <AdminSidebarItem onClick={() => setSidebarOpen(false)} to="/admin/schedules" icon={Clock}>Jadwal</AdminSidebarItem>
          
          <SidebarGroup title="Pengguna" />
          <AdminSidebarItem onClick={() => setSidebarOpen(false)} to="/admin/enroll" icon={UserPlus}>Registrasi</AdminSidebarItem>
          <AdminSidebarItem onClick={() => setSidebarOpen(false)} to="/admin/users/mahasiswa" icon={Users}>{settings.student_label}</AdminSidebarItem>
          <AdminSidebarItem onClick={() => setSidebarOpen(false)} to="/admin/users/dosen" icon={UserCheck}>{settings.lecturer_label}</AdminSidebarItem>
          <AdminSidebarItem onClick={() => setSidebarOpen(false)} to="/admin/users/staff" icon={UserCog}>{settings.staff_label}</AdminSidebarItem>
          
          <div className="my-4 border-t border-slate-200 dark:border-slate-800"></div>
          <SidebarGroup title="Sistem" />
          <AdminSidebarItem onClick={() => setSidebarOpen(false)} to="/admin/settings" icon={SettingsIcon}>Pengaturan Sistem</AdminSidebarItem>
        </div>

        <div className="p-6">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-full font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-sm active:scale-95">
            <LogOut size={18} />
            <span className="tracking-widest text-sm uppercase">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-[280px] flex flex-col min-h-screen relative max-w-full overflow-hidden">
        
        {/* Floating Top Navbar - Restored to Standard Theme */}
        <div className="px-4 md:px-8 pt-20 md:pt-8 w-full z-30">
          <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-full px-4 md:px-6 py-4 md:py-3 flex flex-col md:flex-row justify-between items-center shadow-[0_4px_20px_rgb(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 gap-4 md:gap-0">
            
            {/* Search Bar */}
            <div className="relative w-full md:w-80 group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              </div>
              <input 
                type="text" 
                placeholder="Search" 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-11 pr-4 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
            
            {/* Right Side Icons & Profile */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
                <div className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center"><ThemeToggle /></div>
                <button className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Bell size={20} /></button>
                <button className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Home size={20} /></button>
              </div>
              
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
              
              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 py-1.5 px-3 rounded-full transition-colors"
                onClick={() => setIsProfileOpen(true)}
              >
                <span className="text-sm font-bold uppercase tracking-wider hidden sm:block text-slate-700 dark:text-slate-200">{user?.nama || 'SUPER ADMIN'}</span>
                <ChevronDown size={16} className="text-slate-400" />
                <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/50 flex items-center justify-center overflow-hidden border-2 border-blue-200 dark:border-blue-800">
                  <UserCog size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-4 md:p-8 w-full">
          <Outlet />
        </div>
      </main>

      {/* User Profile Modal */}
      <UserProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
};

export default AdminLayout;
