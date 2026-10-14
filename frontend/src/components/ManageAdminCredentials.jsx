import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Save,
  RotateCcw
} from 'lucide-react';
import api from '../services/api';

const ManageAdminCredentials = ({ onToast }) => {
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form fields
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility toggles
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fetchStandardAdmin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/auth/standard-admin');
      if (response.data.success && response.data.admin) {
        setAdminData(response.data.admin);
        setUsername(response.data.admin.username || '');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      console.error('Error fetching standard admin details:', err);
      const msg = err.response?.data?.message || 'Failed to load Standard Admin account details';
      setError(msg);
      if (onToast) onToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStandardAdmin();
  }, []);

  const handleResetForm = () => {
    if (adminData) {
      setUsername(adminData.username || '');
    }
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Username cannot be empty');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters long');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New password and confirmation password do not match');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        username: trimmedUsername,
      };

      if (newPassword) {
        payload.newPassword = newPassword;
        payload.confirmPassword = confirmPassword;
      }

      const response = await api.put('/auth/standard-admin/credentials', payload);

      if (response.data.success) {
        const msg = response.data.message || 'Standard Admin credentials updated successfully!';
        setSuccessMsg(msg);
        setAdminData(response.data.admin);
        setUsername(response.data.admin.username);
        setNewPassword('');
        setConfirmPassword('');
        if (onToast) onToast(msg, 'success');
      }
    } catch (err) {
      console.error('Error updating standard admin credentials:', err);
      const msg = err.response?.data?.message || 'Failed to update Standard Admin credentials';
      setError(msg);
      if (onToast) onToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
        <RefreshCw size={36} className="animate-spin mx-auto text-yankees-blue mb-4 opacity-60" />
        <p className="text-base font-semibold text-yankees-blue">Loading Standard Admin credentials...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-yankees-blue text-burlywood flex items-center justify-center shadow-md">
            <Key size={26} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-yankees-blue">Manage Standard Admin Credentials</h2>
            <p className="text-sm text-gray-500">
              Super Admin authorized control to view and update credentials for <code className="bg-gray-100 px-1.5 py-0.5 rounded text-yankees-blue font-semibold">/kaifshere</code>
            </p>
          </div>
        </div>

        <button
          onClick={fetchStandardAdmin}
          disabled={saving || loading}
          className="flex items-center gap-2 px-4 py-2 bg-burlywood text-yankees-blue font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50 shadow-sm cursor-pointer"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Security Note Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4.5 flex items-start gap-3.5">
        <ShieldCheck size={22} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-0.5">Strict Cryptographic Security</p>
          <p className="text-blue-700 leading-relaxed">
            All passwords are encrypted with strong one-way <strong>bcrypt</strong> hashing. Stored password hashes are never exposed or viewable in plaintext. When you enter a new password below, it will be securely hashed before saving.
          </p>
        </div>
      </div>

      {/* Account Info Summary Card */}
      {adminData && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
            Current Account Overview
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-light-bg p-4 rounded-xl">
              <span className="text-xs text-gray-500 font-medium">Standard Admin Username</span>
              <p className="text-lg font-bold text-yankees-blue mt-0.5 font-mono">
                {adminData.username}
              </p>
            </div>

            <div className="bg-light-bg p-4 rounded-xl">
              <span className="text-xs text-gray-500 font-medium">System Role</span>
              <div className="mt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-900">
                  <User size={12} />
                  ADMIN_STANDARD
                </span>
              </div>
            </div>

            <div className="bg-light-bg p-4 rounded-xl">
              <span className="text-xs text-gray-500 font-medium">Account Status</span>
              <div className="mt-1">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                  adminData.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  <CheckCircle2 size={12} />
                  {adminData.isActive ? 'Active & Verified' : 'Deactivated'}
                </span>
              </div>
            </div>

            <div className="bg-light-bg p-4 rounded-xl">
              <span className="text-xs text-gray-500 font-medium">Last Login</span>
              <p className="text-sm font-medium text-gray-700 mt-1">
                {adminData.lastLogin
                  ? new Date(adminData.lastLogin).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'No login recorded'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Credentials Form */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 md:p-8">
        <h3 className="text-lg font-bold text-yankees-blue mb-2">Edit Credentials</h3>
        <p className="text-sm text-gray-500 mb-6">
          Update the username and/or assign a new password for the Standard Admin. After saving, the updated credentials will be required immediately at <code className="bg-gray-100 px-1 rounded text-yankees-blue">/kaifshere</code>.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
            <AlertTriangle size={20} className="shrink-0 mt-0.5 text-red-600" />
            <div className="text-sm">
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 flex items-start gap-3">
            <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-green-600" />
            <div className="text-sm">
              <p className="font-semibold">Success</p>
              <p>{successMsg}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Standard Admin Username <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. standard_admin"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yankees-blue/20 focus:border-yankees-blue font-mono font-medium transition"
                required
                disabled={saving}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Letters, numbers, underscores, dots, or hyphens (3–30 characters).
            </p>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-yankees-blue">Reset Password</h4>
              <p className="text-xs text-gray-500">
                Leave both password fields blank if you only want to change the username.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* New Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (optional)"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yankees-blue/20 focus:border-yankees-blue transition"
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Minimum 6 characters.
                </p>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yankees-blue/20 focus:border-yankees-blue transition"
                    disabled={saving || !newPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 font-medium mt-1">
                    Passwords do not match
                  </p>
                )}
                {newPassword && confirmPassword && newPassword === confirmPassword && (
                  <p className="text-xs text-green-600 font-medium mt-1">
                    ✓ Passwords match
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-yankees-blue text-white font-semibold rounded-xl hover:bg-yankees-blue/90 transition shadow-md disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{saving ? 'Saving Changes...' : 'Save Credentials'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetForm}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition disabled:opacity-50 cursor-pointer text-sm"
            >
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManageAdminCredentials;
