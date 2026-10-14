import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, Calendar, Clock, Plus, Play, Square, RefreshCw, Menu, X, FileSpreadsheet, FileText, Search, Loader2, MessageSquarePlus, Cake, Key } from 'lucide-react';
import api from '../services/api';
import authService from '../services/authService';
import Toast from '../components/Toast';
import BirthdaysSection, { getBirthdayMeta } from '../components/BirthdaysSection';
import ManageAdminCredentials from '../components/ManageAdminCredentials';

const SuperAdminDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [students, setStudents] = useState([]);
  const [historyAttendance, setHistoryAttendance] = useState([]);
  const [issues, setIssues] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issueStatusFilter, setIssueStatusFilter] = useState('All');
  const [issueTypeFilter, setIssueTypeFilter] = useState('All');
  const [updatingIssueId, setUpdatingIssueId] = useState(null);
  const [selectedIssueDetail, setSelectedIssueDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState({});
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [filters, setFilters] = useState({
    sessionId: '',
    startDate: '',
    endDate: '',
    rollNumber: '',
    studentName: '',
    branch: '',
    semester: '',
  });
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

  const fetchStudents = async () => {
    try {
      const response = await api.get('/students');
      setStudents(response.data.students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get('/reports/history', { params: filters });
      setHistoryAttendance(response.data.attendance || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const fetchIssues = async () => {
    setIssuesLoading(true);
    try {
      const response = await api.get('/issues');
      setIssues(response.data.issues || []);
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setIssuesLoading(false);
    }
  };

  const handleToggleIssueStatus = async (issue) => {
    const nextStatus = issue.status === 'Resolved' ? 'Pending' : 'Resolved';
    setUpdatingIssueId(issue._id);
    try {
      const response = await api.patch(`/issues/${issue._id}/status`, { status: nextStatus });
      if (response.data.success) {
        showToast(`Report marked as ${nextStatus}`, 'success');
        setIssues(prev => prev.map(item => item._id === issue._id ? { ...item, status: nextStatus } : item));
        if (selectedIssueDetail?._id === issue._id) {
          setSelectedIssueDetail(prev => ({ ...prev, status: nextStatus }));
        }
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingIssueId(null);
    }
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

  useEffect(() => {
    fetchSessions();
    fetchActiveSession();
    fetchStudents();
    fetchIssues();
    fetchBirthdayBadge();

    // Poll for updates every 10 seconds
    const interval = setInterval(() => {
      fetchSessions();
      fetchActiveSession();
      fetchIssues();
      fetchBirthdayBadge();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const activeSessionId = activeSession?.id;
  useEffect(() => {
    if (activeSessionId) {
      fetchAttendance(activeSessionId);
      const interval = setInterval(() => {
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
    navigate('/kaifsgone');
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

  const sanitizeSessionFilename = (sessionName, extension) => {
    if (!sessionName || typeof sessionName !== 'string') {
      return `Session.${extension}`;
    }
    let clean = sessionName
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');
    clean = clean.replace(/^[._]+|[._]+$/g, '');
    return `${clean || 'Session'}.${extension}`;
  };

  const triggerBlobDownload = async (response, fallbackFilename) => {
    // Prevent JSON error responses from being downloaded as files
    if (response.data instanceof Blob && response.data.type?.includes('application/json')) {
      const text = await response.data.text();
      let errorMsg = 'Server returned an error';
      try {
        const parsed = JSON.parse(text);
        if (parsed.message) errorMsg = parsed.message;
      } catch {}
      throw new Error(errorMsg);
    }

    // Determine filename from Content-Disposition header if available
    let filename = fallbackFilename;
    const disposition = response.headers['content-disposition'];
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
      if (match && match[1]) {
        filename = match[1].trim();
      }
    }

    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/octet-stream',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return filename;
  };

  const handleExportSessionExcel = async (sessionId, sessionName) => {
    const key = `excel-${sessionId}`;
    setDownloading((prev) => ({ ...prev, [key]: true }));
    try {
      const response = await api.get(`/reports/session/${sessionId}/excel`, {
        responseType: 'blob',
      });
      const downloadedName = await triggerBlobDownload(response, sanitizeSessionFilename(sessionName, 'xlsx'));
      showToast(`Excel downloaded: ${downloadedName}`, 'success');
    } catch (error) {
      let msg = 'Error exporting Excel';
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed.message) msg = parsed.message;
        } catch {}
      } else if (error.message) {
        msg = error.message;
      }
      showToast(msg, 'error');
    } finally {
      setDownloading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleExportSessionPdf = async (sessionId, sessionName) => {
    const key = `pdf-${sessionId}`;
    setDownloading((prev) => ({ ...prev, [key]: true }));
    try {
      const response = await api.get(`/reports/session/${sessionId}/pdf`, {
        responseType: 'blob',
      });
      const downloadedName = await triggerBlobDownload(response, sanitizeSessionFilename(sessionName, 'pdf'));
      showToast(`PDF downloaded: ${downloadedName}`, 'success');
    } catch (error) {
      let msg = 'Error exporting PDF';
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed.message) msg = parsed.message;
        } catch {}
      } else if (error.message) {
        msg = error.message;
      }
      showToast(msg, 'error');
    } finally {
      setDownloading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleExportStudentsExcel = async () => {
    setDownloading((prev) => ({ ...prev, 'students-excel': true }));
    try {
      const response = await api.get('/reports/students/excel', {
        responseType: 'blob',
      });
      const downloadedName = await triggerBlobDownload(response, 'All_Students.xlsx');
      showToast(`Students Excel downloaded: ${downloadedName}`, 'success');
    } catch (error) {
      let msg = 'Error exporting Students Excel';
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed.message) msg = parsed.message;
        } catch {}
      } else if (error.message) {
        msg = error.message;
      }
      showToast(msg, 'error');
    } finally {
      setDownloading((prev) => ({ ...prev, 'students-excel': false }));
    }
  };

  const handleExportStudentsPdf = async () => {
    setDownloading((prev) => ({ ...prev, 'students-pdf': true }));
    try {
      const response = await api.get('/reports/students/pdf', {
        responseType: 'blob',
      });
      const downloadedName = await triggerBlobDownload(response, 'All_Students.pdf');
      showToast(`Students PDF downloaded: ${downloadedName}`, 'success');
    } catch (error) {
      let msg = 'Error exporting Students PDF';
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed.message) msg = parsed.message;
        } catch {}
      } else if (error.message) {
        msg = error.message;
      }
      showToast(msg, 'error');
    } finally {
      setDownloading((prev) => ({ ...prev, 'students-pdf': false }));
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

      <div className="md:hidden bg-yankees-blue text-white p-4 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="text-lg font-semibold">Super Admin Panel</h1>
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

        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-yankees-blue text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-1">Super Admin</h1>
            <p className="text-xs text-burlywood mb-6 font-medium">{admin?.username || 'Super Admin'}</p>

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
                onClick={() => { setActiveTab('students'); setSidebarOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === 'students' ? 'bg-burlywood text-yankees-blue' : 'hover:bg-white/10'}`}
              >
                <div className="flex items-center gap-3">
                  <Users size={20} />
                  <span>Students</span>
                </div>
              </button>

              <button
                onClick={() => { setActiveTab('history'); setSidebarOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === 'history' ? 'bg-burlywood text-yankees-blue font-bold' : 'hover:bg-white/10'}`}
              >
                <div className="flex items-center gap-3">
                  <FileText size={20} />
                  <span>Reports</span>
                </div>
              </button>

              <button
                onClick={() => { setActiveTab('issues'); setSidebarOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === 'issues' ? 'bg-burlywood text-yankees-blue font-bold' : 'hover:bg-white/10'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquarePlus size={20} />
                    <span>Issues & Suggestions</span>
                  </div>
                  {issues.filter(i => i.status === 'Pending').length > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                      {issues.filter(i => i.status === 'Pending').length}
                    </span>
                  )}
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

              <button
                onClick={() => { setActiveTab('manage-admin'); setSidebarOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg transition ${activeTab === 'manage-admin' ? 'bg-burlywood text-yankees-blue font-bold' : 'hover:bg-white/10'}`}
              >
                <div className="flex items-center gap-3">
                  <Key size={20} />
                  <span>Admin Credentials</span>
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

        <main className="flex-1 p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
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

                      <div className="flex gap-3 flex-wrap">
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
                        <button
                          onClick={() => handleExportSessionExcel(activeSession.id, activeSession.sessionName)}
                          disabled={downloading[`excel-${activeSession.id}`]}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                        >
                          {downloading[`excel-${activeSession.id}`] ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <FileSpreadsheet size={18} />
                          )}
                          Export Excel
                        </button>
                        <button
                          onClick={() => handleExportSessionPdf(activeSession.id, activeSession.sessionName)}
                          disabled={downloading[`pdf-${activeSession.id}`]}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                          {downloading[`pdf-${activeSession.id}`] ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <FileText size={18} />
                          )}
                          Export PDF
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
                          placeholder="e.g. Morning Lecture - Computer Science"
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

                      <div className="flex gap-3 flex-wrap">
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
                        <button
                          onClick={() => handleExportSessionExcel(session._id, session.sessionName)}
                          disabled={downloading[`excel-${session._id}`]}
                          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm font-medium"
                          title="Download Excel for this session"
                        >
                          {downloading[`excel-${session._id}`] ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <FileSpreadsheet size={16} />
                          )}
                          Excel
                        </button>
                        <button
                          onClick={() => handleExportSessionPdf(session._id, session.sessionName)}
                          disabled={downloading[`pdf-${session._id}`]}
                          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm font-medium"
                          title="Download PDF for this session"
                        >
                          {downloading[`pdf-${session._id}`] ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <FileText size={16} />
                          )}
                          PDF
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSession(session);
                            fetchAttendance(session._id);
                            setActiveTab('session-details');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-yankees-blue text-white rounded-lg hover:bg-opacity-90 transition text-sm font-medium"
                        >
                          <Users size={16} />
                          View Attendance
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'session-details' && selectedSession && (
              <div className="space-y-6">
                <button
                  onClick={() => setActiveTab('sessions')}
                  className="text-burlywood hover:underline mb-4 font-medium"
                >
                  ← Back to Sessions
                </button>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-yankees-blue">{selectedSession.sessionName}</h2>
                      <p className="text-gray-600">
                        {new Date(selectedSession.sessionDate).toLocaleDateString()} • Timer: {selectedSession.durationMinutes || 10} Mins
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleExportSessionExcel(selectedSession._id, selectedSession.sessionName)}
                        disabled={downloading[`excel-${selectedSession._id}`]}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {downloading[`excel-${selectedSession._id}`] ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <FileSpreadsheet size={18} />
                        )}
                        Export Excel
                      </button>
                      <button
                        onClick={() => handleExportSessionPdf(selectedSession._id, selectedSession.sessionName)}
                        disabled={downloading[`pdf-${selectedSession._id}`]}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {downloading[`pdf-${selectedSession._id}`] ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <FileText size={18} />
                        )}
                        Export PDF
                      </button>
                    </div>
                  </div>

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
                            <th className="text-left py-3 px-4">Mobile</th>
                            <th className="text-left py-3 px-4">Email</th>
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
                              <td className="py-3 px-4">{record.studentId?.mobileNumber || 'N/A'}</td>
                              <td className="py-3 px-4">{record.studentId?.email || 'N/A'}</td>
                              <td className="py-3 px-4">{record.studentId?.branch || 'N/A'}</td>
                              <td className="py-3 px-4">{record.studentId?.semester || 'N/A'}</td>
                              <td className="py-3 px-4">
                                {new Date(record.attendanceTimestamp).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'students' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-yankees-blue">Registered Students</h2>
                    <div className="flex gap-3">
                      <button
                        onClick={handleExportStudentsExcel}
                        disabled={downloading['students-excel']}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {downloading['students-excel'] ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <FileSpreadsheet size={18} />
                        )}
                        Export Excel
                      </button>
                      <button
                        onClick={handleExportStudentsPdf}
                        disabled={downloading['students-pdf']}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {downloading['students-pdf'] ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <FileText size={18} />
                        )}
                        Export PDF
                      </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <p className="text-gray-600 mb-4">Total Students: {students.length}</p>

                  {students.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No students registered yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4">Sr. No.</th>
                            <th className="text-left py-3 px-4">Name</th>
                            <th className="text-left py-3 px-4">Roll Number</th>
                            <th className="text-left py-3 px-4">Mobile</th>
                            <th className="text-left py-3 px-4">Email</th>
                            <th className="text-left py-3 px-4">Branch</th>
                            <th className="text-left py-3 px-4">Semester</th>
                            <th className="text-left py-3 px-4">Registered</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student, index) => (
                            <tr key={student._id} className="border-b hover:bg-light-bg">
                              <td className="py-3 px-4">{index + 1}</td>
                              <td className="py-3 px-4">{student.name}</td>
                              <td className="py-3 px-4">{student.rollNumber}</td>
                              <td className="py-3 px-4">{student.mobileNumber}</td>
                              <td className="py-3 px-4">{student.email}</td>
                              <td className="py-3 px-4">{student.branch}</td>
                              <td className="py-3 px-4">{student.semester}</td>
                              <td className="py-3 px-4">
                                {new Date(student.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-yankees-blue">Attendance Reports</h2>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-yankees-blue mb-4">Filters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                      <select
                        value={filters.sessionId}
                        onChange={(e) => setFilters({ ...filters, sessionId: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue"
                      >
                        <option value="">All Sessions</option>
                        {sessions.map((session) => (
                          <option key={session._id} value={session._id}>
                            {session.sessionName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                      <input
                        type="text"
                        value={filters.rollNumber}
                        onChange={(e) => setFilters({ ...filters, rollNumber: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                      <input
                        type="text"
                        value={filters.studentName}
                        onChange={(e) => setFilters({ ...filters, studentName: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                      <input
                        type="text"
                        value={filters.branch}
                        onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                      <input
                        type="text"
                        value={filters.semester}
                        onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yankees-blue"
                      />
                    </div>
                  </div>

                  <button
                    onClick={fetchHistory}
                    className="flex items-center gap-2 px-6 py-3 bg-yankees-blue text-white rounded-lg hover:bg-opacity-90 transition"
                  >
                    <Search size={18} />
                    Search
                  </button>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold text-yankees-blue mb-4">
                    Results ({historyAttendance.length})
                  </h3>

                  {historyAttendance.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No records found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4">Student</th>
                            <th className="text-left py-3 px-4">Roll Number</th>
                            <th className="text-left py-3 px-4">Session</th>
                            <th className="text-left py-3 px-4">Branch</th>
                            <th className="text-left py-3 px-4">Semester</th>
                            <th className="text-left py-3 px-4">Date & Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyAttendance.map((record) => (
                            <tr key={record._id} className="border-b hover:bg-light-bg">
                              <td className="py-3 px-4">{record.studentId?.name || 'N/A'}</td>
                              <td className="py-3 px-4">{record.studentId?.rollNumber || 'N/A'}</td>
                              <td className="py-3 px-4">{record.sessionId?.sessionName || 'N/A'}</td>
                              <td className="py-3 px-4">{record.studentId?.branch || 'N/A'}</td>
                              <td className="py-3 px-4">{record.studentId?.semester || 'N/A'}</td>
                              <td className="py-3 px-4">
                                {new Date(record.attendanceTimestamp).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'issues' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-yankees-blue">Issues & Suggestions</h2>
                    <p className="text-sm text-gray-600">User feedback and issue reports submitted via the portal footer</p>
                  </div>
                  <button
                    onClick={fetchIssues}
                    disabled={issuesLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-burlywood text-yankees-blue rounded-lg hover:opacity-90 transition font-medium cursor-pointer"
                  >
                    <RefreshCw size={18} className={issuesLoading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
                    <p className="text-sm font-medium text-gray-500">Total Submissions</p>
                    <p className="text-3xl font-bold text-yankees-blue mt-1">{issues.length}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-5 border border-amber-100">
                    <p className="text-sm font-medium text-amber-700">Pending Review</p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">
                      {issues.filter(i => i.status === 'Pending').length}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl shadow p-5 border border-green-100">
                    <p className="text-sm font-medium text-green-700">Resolved</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">
                      {issues.filter(i => i.status === 'Resolved').length}
                    </p>
                  </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-white rounded-xl shadow p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Status:</span>
                    {['All', 'Pending', 'Resolved'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setIssueStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                          issueStatusFilter === st
                            ? 'bg-yankees-blue text-white shadow-xs'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-500 uppercase">Type:</span>
                    {['All', 'Issue', 'Suggestion'].map((tp) => (
                      <button
                        key={tp}
                        onClick={() => setIssueTypeFilter(tp)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                          issueTypeFilter === tp
                            ? 'bg-burlywood text-yankees-blue font-bold shadow-xs'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Issues Table */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                  {issues
                    .filter((item) => {
                      if (issueStatusFilter !== 'All' && item.status !== issueStatusFilter) return false;
                      if (issueTypeFilter !== 'All' && item.type !== issueTypeFilter) return false;
                      return true;
                    })
                    .length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      <MessageSquarePlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-lg font-medium text-gray-700">No reports found</p>
                      <p className="text-sm text-gray-500">No issues or suggestions match the selected filters.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-yankees-blue text-white">
                          <tr>
                            <th className="text-left py-3.5 px-4 font-semibold">Sr. No.</th>
                            <th className="text-left py-3.5 px-4 font-semibold">Name</th>
                            <th className="text-left py-3.5 px-4 font-semibold">Contact Info</th>
                            <th className="text-left py-3.5 px-4 font-semibold">Type</th>
                            <th className="text-left py-3.5 px-4 font-semibold">Description</th>
                            <th className="text-left py-3.5 px-4 font-semibold">Submitted At</th>
                            <th className="text-left py-3.5 px-4 font-semibold">Status</th>
                            <th className="text-center py-3.5 px-4 font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {issues
                            .filter((item) => {
                              if (issueStatusFilter !== 'All' && item.status !== issueStatusFilter) return false;
                              if (issueTypeFilter !== 'All' && item.type !== issueTypeFilter) return false;
                              return true;
                            })
                            .map((issue, idx) => (
                              <tr key={issue._id} className="hover:bg-slate-50 transition">
                                <td className="py-3 px-4 font-medium text-gray-500">{idx + 1}</td>
                                <td className="py-3 px-4 font-semibold text-yankees-blue">{issue.name}</td>
                                <td className="py-3 px-4">
                                  <div className="text-xs text-gray-700 font-mono">{issue.email}</div>
                                  <div className="text-xs text-gray-500 font-mono mt-0.5">{issue.mobileNumber}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    issue.type === 'Issue'
                                      ? 'bg-red-100 text-red-800 border border-red-200'
                                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                                  }`}>
                                    {issue.type}
                                  </span>
                                </td>
                                <td className="py-3 px-4 max-w-xs">
                                  <p className="line-clamp-2 text-gray-700">{issue.description}</p>
                                  <button
                                    onClick={() => setSelectedIssueDetail(issue)}
                                    className="text-xs text-burlywood hover:underline font-medium mt-1 inline-block cursor-pointer"
                                  >
                                    View full details →
                                  </button>
                                </td>
                                <td className="py-3 px-4 text-xs text-gray-600 whitespace-nowrap">
                                  {new Date(issue.createdAt).toLocaleString('en-GB', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    issue.status === 'Resolved'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${issue.status === 'Resolved' ? 'bg-green-600' : 'bg-amber-600'}`} />
                                    {issue.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                  <button
                                    onClick={() => handleToggleIssueStatus(issue)}
                                    disabled={updatingIssueId === issue._id}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                      issue.status === 'Resolved'
                                        ? 'bg-gray-100 text-gray-700 hover:bg-amber-50 hover:text-amber-700 border border-gray-200'
                                        : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                                  >
                                    {updatingIssueId === issue._id ? (
                                      <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                      issue.status === 'Resolved' ? 'Reopen' : 'Mark Resolved'
                                    )}
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Detail Modal */}
                {selectedIssueDetail && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
                      <div className="bg-yankees-blue text-white p-5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquarePlus className="w-5 h-5 text-burlywood" />
                          <h3 className="font-bold">{selectedIssueDetail.type} Details</h3>
                        </div>
                        <button
                          onClick={() => setSelectedIssueDetail(null)}
                          className="p-1 rounded text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4 bg-light-bg p-4 rounded-xl">
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Submitted By</p>
                            <p className="text-sm font-bold text-yankees-blue mt-0.5">{selectedIssueDetail.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Status</p>
                            <p className={`text-sm font-bold mt-0.5 ${selectedIssueDetail.status === 'Resolved' ? 'text-green-600' : 'text-amber-600'}`}>
                              {selectedIssueDetail.status}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Email Address</p>
                            <p className="text-xs font-mono text-gray-700 mt-0.5">{selectedIssueDetail.email}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Mobile Number</p>
                            <p className="text-xs font-mono text-gray-700 mt-0.5">{selectedIssueDetail.mobileNumber}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 font-medium">Submission Timestamp</p>
                            <p className="text-xs text-gray-700 mt-0.5">
                              {new Date(selectedIssueDetail.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Description
                          </p>
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                            {selectedIssueDetail.description}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <button
                            onClick={() => handleToggleIssueStatus(selectedIssueDetail)}
                            disabled={updatingIssueId === selectedIssueDetail._id}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 cursor-pointer ${
                              selectedIssueDetail.status === 'Resolved'
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {updatingIssueId === selectedIssueDetail._id && <Loader2 size={14} className="animate-spin" />}
                            {selectedIssueDetail.status === 'Resolved' ? 'Mark as Pending' : 'Mark as Resolved'}
                          </button>
                          <button
                            onClick={() => setSelectedIssueDetail(null)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition cursor-pointer"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Birthdays Tab */}
            {activeTab === 'birthdays' && (
              <BirthdaysSection onToast={showToast} />
            )}

            {/* Manage Standard Admin Credentials Tab */}
            {activeTab === 'manage-admin' && (
              <ManageAdminCredentials onToast={showToast} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
