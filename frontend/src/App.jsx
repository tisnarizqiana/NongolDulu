import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Camera, ScanFace, LogIn } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { Toaster } from 'react-hot-toast';
import ThemeToggle from './components/ThemeToggle';

// Fallback Loader
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// Lazy Loaded Pages
const Enroll = React.lazy(() => import('./pages/Enroll'));
const Attendance = React.lazy(() => import('./pages/Attendance'));
const Login = React.lazy(() => import('./pages/Login'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));

const AdminLayout = React.lazy(() => import('./components/AdminLayout'));
const AdminDashboard = React.lazy(() => import('./pages/admin/Dashboard'));
const AdminSettings = React.lazy(() => import('./pages/admin/AdminSettings'));
const ManageUsers = React.lazy(() => import('./pages/admin/ManageUsers'));
const AttendanceReport = React.lazy(() => import('./pages/admin/AttendanceReport'));
const AdminDepartments = React.lazy(() => import('./pages/admin/AdminDepartments'));
const AdminClasses = React.lazy(() => import('./pages/admin/AdminClasses'));
const AdminSchedules = React.lazy(() => import('./pages/admin/AdminSchedules'));

const StudentDashboard = React.lazy(() => import('./pages/dashboards/StudentDashboard'));
const LecturerDashboard = React.lazy(() => import('./pages/dashboards/LecturerDashboard'));
const StaffDashboard = React.lazy(() => import('./pages/dashboards/StaffDashboard'));

const NavLink = ({ to, icon: Icon, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
        isActive 
          ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-700 dark:text-blue-400' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-100'
      }`}
    >
      <Icon size={18} />
      <span className="hidden md:inline">{children}</span>
    </Link>
  );
};

const PublicLayout = ({ children }) => {
  const { settings, getLogoUrl } = useSettings();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center h-16 gap-2">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-500 font-bold text-lg sm:text-xl tracking-tight shrink-0">
              <img src={getLogoUrl()} alt="Nongol Dulu Logo" className="w-6 h-6 sm:w-8 sm:h-8 object-contain shrink-0" />
              <span className="hidden sm:inline">{settings.app_name}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <NavLink to="/" icon={ScanFace}>Mulai Absen</NavLink>
              </div>
              <ThemeToggle />
              <Link to="/login" className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/30 px-3 sm:px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                <LogIn size={16} /> <span className="hidden sm:inline">Login</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-grow flex items-center justify-center relative overflow-hidden">
        {children}
      </main>
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 text-center text-slate-500 dark:text-slate-400 text-sm z-10">
        &copy; {new Date().getFullYear()} Nongol Dulu (University Grade).
      </footer>
    </div>
  );
};

// Route Guards
const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" />;
  return children;
};

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout><Attendance /></PublicLayout>} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Rute Mahasiswa */}
        <Route path="/student" element={
          <PrivateRoute allowedRoles={['mahasiswa']}>
            <StudentDashboard />
          </PrivateRoute>
        } />

        {/* Rute Dosen */}
        <Route path="/lecturer" element={
          <PrivateRoute allowedRoles={['dosen']}>
            <LecturerDashboard />
          </PrivateRoute>
        } />

        {/* Rute Staff */}
        <Route path="/staff" element={
          <PrivateRoute allowedRoles={['staff']}>
            <StaffDashboard />
          </PrivateRoute>
        } />

        {/* Rute Admin */}
        <Route path="/admin" element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminLayout />
          </PrivateRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="kiosk" element={<div className="flex justify-center w-full min-h-[calc(100vh-100px)] items-center"><Attendance isAdminMode={true} /></div>} />
          <Route path="enroll" element={<Enroll />} />
          <Route path="users/:role" element={<ManageUsers />} />
          <Route path="attendances" element={<AttendanceReport />} />
          <Route path="settings" element={<AdminSettings />} />
          
          {/* Academic Management */}
          <Route path="departments" element={<AdminDepartments />} />
          <Route path="classes" element={<AdminClasses />} />
          <Route path="schedules" element={<AdminSchedules />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <ConfirmProvider>
            <Router>
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    color: '#334155',
                    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    fontWeight: '600',
                    padding: '16px 24px',
                  },
                  success: {
                    iconTheme: {
                      primary: '#10b981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
              <AppRoutes />
            </Router>
          </ConfirmProvider>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;
