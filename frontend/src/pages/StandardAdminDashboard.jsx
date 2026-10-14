import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, Calendar, Clock, Plus, Play, Square, RefreshCw, Menu, X, Cake } from 'lucide-react';
import api from '../services/api';
import authService from '../services/authService';
import Toast from '../components/Toast';
import BirthdaysSection, { getBirthdayMeta } from '../components/BirthdaysSection';

const StandardAdminDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newSession, setNewSession] = useState({
    sessionName: '',
    sessionDate: '',
    durationMinutes: 10,
  });
  const [birthdayBadge, setBirthdayBadge] = useState({ today: 0, upcoming: 0 });
  const navigate = useNavigate();

  const admin = authService.getCurrentAdmin();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchBirthdayBadge = async () => {
    try {
      const response = await api.get('/students/birthdays');
      const list = response.data.students || [];
      const now = new Date();
      let todayCount = 0;
      let upcomingCount = 0;
      list.forEach((s) => {
        const meta = getBirthdayMeta(s, now);
        if (meta) {
          if (meta.isToday) todayCount++;
          else if (meta.daysRemaining <= 7) upcomingCount++;
        }
      });
      setBirthdayBadge({ today: todayCount, upcoming: upcomingCount });
    } catch (error) {
      console.error('Error fetching birthday badge:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await api.get('/sessions');
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchActiveSession = async () => {
    try {
      const response = await api.get('/sessions/active');
      const incoming = response.data.session || null;
      setActiveSession((prev) => {
        if (!prev && !incoming) return null;
        if (!prev || !incoming) return incoming;
        if (prev.id === incoming.id && prev.status === incoming.status && prev.pin === incoming.pin) {
          return prev;
        }
        return incoming;
      });
    } catch (error) {
      console.error('Error fetching active session:', error);
    }
  };

  const fetchAttendance = async (sessionId) => {
    if (!sessionId) return;
    try {
      const response = await api.get(`/attendance/session/${sessionId}`);
      setAttendance(response.data.attendance || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchActiveSession();
    fetchBirthdayBadge();

    // Poll for active session updates only when page is visible and on dashboard
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      fetchActiveSession();
      if (activeTab === 'dashboard') {
        fetchSessions();
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const activeSessionId = activeSession?.id;
  useEffect(() => {
    if (activeSessionId) {
      fetchAttendance(activeSessionId);
      const interval = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
          return;
        }
        fetchAttendance(activeSessionId);
      }, 10000);
      return () => clearInterval(interval);
    } else {
      setAttendance([]);
    }
  }, [activeSessionId]);

  const handleLogout = () => {
    authService.logout();
    if (onLogout) {
      onLogout();
    }
    navigate('/kaifshere');
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/sessions', newSession);
      if (response.data.success) {
        showToast('Session created successfully!', 'success');
        setShowCreateSession(false);
        setNewSession({ sessionName: '', sessionDate: '', durationMinutes: 10 });
        fetchSessions();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Error creating session', 'error');
    }
    setLoading(false);
  };

  const handleOpenSession = async (sessionId) => {
    try {
      const response = await api.patch(`/sessions/${sessionId}/open`);
      if (response.data.success) {
        showToast('Session opened!', 'success');
        fetchSessions();
        fetchActiveSession();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Error opening session', 'error');
    }
  };

  const handleCloseSession = async (sessionId) => {
    try {
      const response = await api.patch(`/sessions/${sessionId}/close`);
      if (response.data.success) {
        showToast('Session closed!', 'success');
        fetchSessions();
        fetchActiveSession();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Error closing session', 'error');
    }
  };

  const handleRegeneratePin = async (sessionId) => {
    try {
      const response = await api.patch(`/sessions/${sessionId}/pin`);
      if (response.data.success) {
        showToast('PIN regenerated!', 'success');
        fetchSessions();
        fetchActiveSession();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Error regenerating PIN', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open':
        return 'bg-green-100 text-green-800';
      case 'Closed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="min-h-screen bg-light-bg">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Mobile Header */}
      <div className="md:hidden bg-yankees-blue text-white p-4 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="text-lg font-semibold">Admin Dashboard</h1>
        <button onClick={handleLogout}>
          <LogOut size={24} />
        </button>
      </div>

      <div className="flex">
        {/* Mobile Backdrop Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-yankees-blue text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-1">Admin Panel</h1>
            <p className="text-xs text-burlywood mb-6 font-medium">{admin?.username || 'Standard Admin'}</p>

            <nav className="space-y-2">
              <button
                onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === 'dashboard' ? 'bg-burlywood text-yankees-blue' : 'hover:bg-white/10'}`}
              >
                <div className="flex items-center gap-3">
                  <Calendar size={20} />
                  <span>Dashboard</span>
                </div>
              </button>

              <button
                onClick={() => { setActiveTab('sessions'); setSidebarOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === 'sessions' ? 'bg-burlywood text-yankees-blue' : 'hover:bg-white/10'}`}
              >
                <div className="flex items-center gap-3">
                  <Clock size={20} />
                  <span>Sessions</span>
                </div>
              </button>

              <button
                onClick={() => { setActiveTab('history'); setSidebarOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === 'history' ? 'bg-burlywood text-yankees-blue font-bold' : 'hover:bg-white/10'}`}
              >
                <div className="flex items-center gap-3">
                  <Users size={20} />
                  <span>History</span>
                </div>
              </button>

              <button
                onClick={() => { setActiveTab('birthdays'); setSidebarOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === 'birthdays' ? 'bg-burlywood text-yankees-blue font-bold' : 'hover:bg-white/10'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Cake size={20} />
                    <span>Birthdays</span>
                  </div>
                  {birthdayBadge.today > 0 ? (
                    <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                      🎂 {birthdayBadge.today}
                    </span>
                  ) : birthdayBadge.upcoming > 0 ? (
                    <span className="bg-burlywood text-yankees-blue text-xs px-2 py-0.5 rounded-full font-bold">
                      {birthdayBadge.upcoming}
                    </span>
                  ) : null}
                </div>
              </button>
            </nav>

            <div className="absolute bottom-6 left-6 right-6">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 transition flex items-center justify-center gap-2"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-yankees-blue">Live Dashboard</h2>
                  {activeSession && (
                    <button
                      onClick={() => fetchAttendance(activeSession.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-burlywood text-yankees-blue rounded-lg hover:opacity-90 transition"
                    >
                      <RefreshCw size={18} />
                      Refresh
                    </button>
                  )}
                </div>

                {activeSession ? (
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-yankees-blue">{activeSession.sessionName}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(activeSession.status)}`}>
                          {activeSession.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-light-bg p-4 rounded-lg">
                          <p className="text-sm text-gray-600">PIN</p>
                          <p className="text-2xl font-bold text-yankees-blue">{activeSession.pin}</p>
                        </div>
                        <div className="bg-light-bg p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Timer Duration</p>
                          <p className="text-xl font-bold text-yankees-blue">{activeSession.durationMinutes || 10} Mins</p>
                        </div>
                        <div className="bg-light-bg p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Session Status</p>
                          <p className="text-lg font-semibold text-green-700">
                            {activeSession.expiresAt
                              ? `Active (Expires ${new Date(activeSession.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                              : 'Active'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleRegeneratePin(activeSession.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-burlywood text-yankees-blue rounded-lg hover:opacity-90 transition"
                        >
                          <RefreshCw size={18} />
                          Regenerate PIN
                        </button>
                        <button
                          onClick={() => handleCloseSession(activeSession.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                          <Square size={18} />
                          Close Session
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6">
                      <h3 className="text-xl font-semibold text-yankees-blue mb-4">
                        Attendance ({attendance.length})
                      </h3>

                      {attendance.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No attendance recorded yet</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-3 px-4">Sr. No.</th>
                                <th className="text-left py-3 px-4">Name</th>
                                <th className="text-left py-3 px-4">Roll Number</th>
                                <th className="text-left py-3 px-4">Branch</th>
                                <th className="text-left py-3 px-4">Semester</th>
                                <th className="text-left py-3 px-4">Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {attendance.map((record, index) => (
                                <tr key={record._id} className="border-b hover:bg-light-bg">
                                  <td className="py-3 px-4">{index + 1}</td>
                                  <td className="py-3 px-4">{record.studentId?.name || 'N/A'}</td>
                                  <td className="py-3 px-4">{record.studentId?.rollNumber || 'N/A'}</td>
                                  <td className="py-3 px-4">{record.studentId?.branch || 'N/A'}</td>
                                  <td className="py-3 px-4">{record.studentId?.semester || 'N/A'}</td>
                                  <td className="py-3 px-4">
                                    {new Date(record.attendanceTimestamp).toLocaleTimeString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                    <Clock className="mx-auto mb-4 text-gray-400" size={64} />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No Active Session</h3>
                    <p className="text-gray-500 mb-6">Create and open a session to start tracking attendance</p>
                    <button
                      onClick={() => { setActiveTab('sessions'); setShowCreateSession(true); }}
                      className="px-6 py-3 bg-yankees-blue text-white rounded-lg hover:bg-opacity-90 transition"
                    >
                      Create Session
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-yankees-blue">Sessions</h2>
                  <button
                    onClick={() => setShowCreateSession(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-yankees-blue text-white rounded-lg hover:bg-opacity-90 transition"
                  >
                    <Plus size={18} />
                    Create Session
                  </button>
                </div>

                {showCreateSession && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-semibold text-yankees-blue mb-4">Create New Session</h3>
                    <form onSubmit={handleCreateSession} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Session Name *</label>
                        <input
                          type="text"
                          value={newSession.sessionName}
                          onChange={(e) => setNewSession({ ...newSession, sessionName: e.target.value })}
                          placeholder="e.g. Physics Lecture - Batch A"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue"
                          required
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date (Optional)</label>
                        <input
                          type="date"
                          value={newSession.sessionDate}
                          onChange={(e) => setNewSession({ ...newSession, sessionDate: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue"
                          disabled={loading}
                        />
                        <p className="text-xs text-gray-500 mt-1">Optional — defaults to today if left blank.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Timer Duration</label>
                        <div className="flex gap-2 mb-2 flex-wrap">
                          {[5, 10, 15, 30, 45, 60].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => setNewSession({ ...newSession, durationMinutes: mins })}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                newSession.durationMinutes === mins
                                  ? 'bg-yankees-blue text-white shadow-sm'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {mins} Mins
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="1440"
                            value={newSession.durationMinutes}
                            onChange={(e) => setNewSession({ ...newSession, durationMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
                            placeholder="Custom minutes"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue"
                            required
                            disabled={loading}
                          />
                          <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Minutes</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          The session will accept attendance for exactly {newSession.durationMinutes || 10} minutes once opened.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 bg-yankees-blue text-white py-3 rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
                        >
                          {loading ? 'Creating...' : 'Create Session'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCreateSession(false)}
                          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="grid gap-4">
                  {sessions.map((session) => (
                    <div key={session._id} className="bg-white rounded-xl shadow-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-yankees-blue">{session.sessionName}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(session.sessionDate).toLocaleDateString()} • Timer: {session.durationMinutes || 10} Mins
                            {session.status === 'Open' && session.expiresAt && ` (Expires ${new Date(session.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                      </div>

                      <div className="flex gap-3">
                        {session.status === 'Scheduled' && (
                          <button
                            onClick={() => handleOpenSession(session._id)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                          >
                            <Play size={18} />
                            Open
                          </button>
                        )}
                        {session.status === 'Open' && (
                          <button
                            onClick={() => handleCloseSession(session._id)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                          >
                            <Square size={18} />
                            Close
                          </button>
                        )}
                        {session.status !== 'Closed' && (
                          <button
                            onClick={() => handleRegeneratePin(session._id)}
                            className="flex items-center gap-2 px-4 py-2 bg-burlywood text-yankees-blue rounded-lg hover:opacity-90 transition"
                          >
                            <RefreshCw size={18} />
                            Regenerate PIN
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-yankees-blue">Session History</h2>

                <div className="grid gap-4">
                  {sessions.filter(s => s.status === 'Closed').map((session) => (
                    <div key={session._id} className="bg-white rounded-xl shadow-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-yankees-blue">{session.sessionName}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(session.sessionDate).toLocaleDateString()} • {session.startTime} - {session.endTime}
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          Closed
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Birthdays Tab */}
            {activeTab === 'birthdays' && (
              <BirthdaysSection onToast={showToast} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StandardAdminDashboard;
