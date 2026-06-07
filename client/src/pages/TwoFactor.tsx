import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TwoFactor() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verify2FA } = useAuthStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const email = location.state?.email || '';
  const rememberMe = location.state?.rememberMe || false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verify2FA(email, code, rememberMe);
      toast.success('Verification successful!');
      navigate('/search');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-4">
            <ShieldCheck className="text-primary-700" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Two-Factor Verification</h1>
          <p className="text-gray-500 mt-1">Enter the 6-digit code sent to {email}</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="000000"
                maxLength={6}
                required
              />
              <p className="text-xs text-gray-400 mt-2">Code expires in 5 minutes. In demo mode, use: 000000</p>
            </div>

            <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                'Verify & Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
