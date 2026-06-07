import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [demoLink, setDemoLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      if (data.demoResetLink) {
        setDemoLink(data.demoResetLink);
      }
      toast.success('Check your email for the reset link.');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send reset link');
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
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-safe-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="text-safe-600" size={32} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Check Your Email</h2>
              <p className="text-sm text-gray-600">
                If an account exists with <strong>{email}</strong>, we've sent a password reset link.
              </p>
              <p className="text-xs text-warning-600 bg-warning-50 border border-warning-200 rounded-lg p-3">
                The link will expire in <strong>5 minutes</strong> for security reasons.
              </p>
              {demoLink && (
                <div className="text-left bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
                  <p className="font-medium text-blue-700 mb-1">Demo Mode Reset Link:</p>
                  <a
                    href={demoLink}
                    className="text-blue-600 underline break-all"
                  >
                    {demoLink}
                  </a>
                </div>
              )}
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Forgot Password</h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter the email associated with your account and we'll send you a link to reset your password.
                The link expires in <strong>5 minutes</strong>.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="your.email@moh.gov.my"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={18} />
                      Send Reset Link
                    </>
                  )}
                </button>
              </form>
              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
