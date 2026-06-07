import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setTokenError('No reset token provided.');
      setVerifying(false);
      return;
    }

    api.get('/auth/reset-password/verify', { params: { token } })
      .then(({ data }) => {
        if (data.valid) {
          setTokenValid(true);
          setEmail(data.email);
        } else {
          setTokenError(data.error || 'This reset link is invalid.');
        }
      })
      .catch((err) => {
        setTokenError(
          err.response?.data?.error ||
          'This reset link is invalid or has expired (links are valid for 5 minutes only).'
        );
      })
      .finally(() => setVerifying(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login'), 2500);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reset password');
      // If token expired during the form, surface this clearly
      if (error.response?.status === 400) {
        setTokenValid(false);
        setTokenError(error.response.data.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-700 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">PL</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PreserveLink</h1>
          <p className="text-gray-500 mt-1">Set a new password</p>
        </div>

        <div className="card">
          {verifying ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-600">Verifying reset link...</p>
            </div>
          ) : !tokenValid ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-critical-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="text-critical-600" size={32} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Link Invalid or Expired</h2>
              <p className="text-sm text-gray-600">{tokenError}</p>
              <Link
                to="/forgot-password"
                className="btn-primary inline-flex items-center gap-1"
              >
                Request a New Link
              </Link>
            </div>
          ) : success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-safe-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="text-safe-600" size={32} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Password Reset!</h2>
              <p className="text-sm text-gray-600">
                Your password has been updated successfully. Redirecting to sign in...
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Reset Your Password</h2>
              <p className="text-sm text-gray-500 mb-6">
                Setting new password for <strong>{email}</strong>
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pr-10"
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    placeholder="Re-enter new password"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock size={18} />
                      Reset Password
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
