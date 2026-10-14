import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './components/Footer';
import StudentPage from './pages/StudentPage';
import StandardAdminLogin from './pages/StandardAdminLogin';
import StandardAdminDashboard from './pages/StandardAdminDashboard';
import SuperAdminLogin from './pages/SuperAdminLogin';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import NotFound from './pages/NotFound';
import authService from './services/authService';

/**
 * Standard Admin Route Component (/kaifshere)
 * Displays login page when unauthenticated, and dashboard when authenticated as ADMIN_STANDARD.
 */
const StandardAdminRoute = () => {
  const [admin, setAdmin] = useState(() => authService.getCurrentAdmin());

  useEffect(() => {
    const syncAdminState = () => {
      setAdmin(authService.getCurrentAdmin());
    };
    window.addEventListener('storage', syncAdminState);
    return () => window.removeEventListener('storage', syncAdminState);
  }, []);

  const handleLoginSuccess = (adminData) => {
    setAdmin(adminData || authService.getCurrentAdmin());
  };

  const handleLogout = () => {
    authService.logout();
    setAdmin(null);
  };

  const isAuthenticated = authService.isAuthenticated() && admin && admin.role === 'ADMIN_STANDARD';

  if (isAuthenticated) {
    return <StandardAdminDashboard onLogout={handleLogout} />;
  }

  return <StandardAdminLogin onLoginSuccess={handleLoginSuccess} />;
};

/**
 * Super Admin Route Component (/kaifsgone)
 * Displays login page when unauthenticated, and dashboard when authenticated as ADMIN_SUPER.
 */
const SuperAdminRoute = () => {
  const [admin, setAdmin] = useState(() => authService.getCurrentAdmin());

  useEffect(() => {
    const syncAdminState = () => {
      setAdmin(authService.getCurrentAdmin());
    };
    window.addEventListener('storage', syncAdminState);
    return () => window.removeEventListener('storage', syncAdminState);
  }, []);

  const handleLoginSuccess = (adminData) => {
    setAdmin(adminData || authService.getCurrentAdmin());
  };

  const handleLogout = () => {
    authService.logout();
    setAdmin(null);
  };

  const isAuthenticated = authService.isAuthenticated() && admin && admin.role === 'ADMIN_SUPER';

  if (isAuthenticated) {
    return <SuperAdminDashboard onLogout={handleLogout} />;
  }

  return <SuperAdminLogin onLoginSuccess={handleLoginSuccess} />;
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen flex flex-col justify-between">
          <div className="flex-1 flex flex-col">
            <Routes>
              {/* Public Student Attendance Interface */}
              <Route path="/" element={<StudentPage />} />

              {/* Independent Standard Admin Route */}
              <Route path="/kaifshere" element={<StandardAdminRoute />} />
              <Route path="/kaifshere/dashboard" element={<Navigate to="/kaifshere" replace />} />

              {/* Independent Super Admin Route */}
              <Route path="/kaifsgone" element={<SuperAdminRoute />} />
              <Route path="/kaifsgone/dashboard" element={<Navigate to="/kaifsgone" replace />} />

              {/* 404 Not Found */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
