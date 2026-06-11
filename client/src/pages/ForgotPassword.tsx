import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [maskedName, setMaskedName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password/verify-email', { email });
      setMaskedName(data.maskedName || 'user');
      setStep(2);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Email not found in our records');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password/reset', { email, newPassword });
      setStep(3);
      toast.success('Password updated successfully!');
      setTimeout(() => navigate('/login'), 2500);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
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
          <p className="text-gray-500 mt-1">Reset your password</p>
        </div>

        <div className="card">
          {step === 1 && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Forgot Password</h2>
              <p className="text-sm text-gray-500 mb-6">Enter your registered email and you can set a new password directly — no email link needed.</p>
              <form onSubmit={handleVerifyEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="your.email@moh.gov.my" required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><KeyRound size={18} />Continue</>}
                </button>
              </form>
              <div className="mt-6 text-center">
                <Link to="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Set New Password</h2>
              <p className="text-sm text-gray-500 mb-6">
                Setting new password for <strong>{maskedName}</strong> (<span className="text-gray-600">{email}</span>)
              </p>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field pr-10" placeholder="Min. 8 characters" required minLength={8} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field" placeholder="Re-enter new password" required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><KeyRound size={18} />Reset Password</>}
                </button>
              </form>
              <div className="mt-4 text-center">
                <button onClick={() => setStep(1)} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                  <ArrowLeft size={14} /> Use a different email
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-safe-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="text-safe-600" size={32} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Password Updated!</h2>
              <p className="text-sm text-gray-600">Redirecting you to sign in...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
