import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Upload, UserPlus, ExternalLink } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    workingPlace: '',
    rphNumber: '',
    agreedToTerms: false,
  });
  const [apcFile, setApcFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setApcFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'application/pdf': [] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!form.agreedToTerms) {
      toast.error('You must agree to the Terms & Conditions');
      return;
    }
    if (!apcFile) {
      toast.error('You must upload your Annual Practising Certificate (APC) file.');
      return;
    }

    setLoading(true);
    setVerifying(true);

    try {
      const formData = new FormData();
      formData.append('fullName', form.fullName);
      formData.append('email', form.email);
      formData.append('password', form.password);
      formData.append('workingPlace', form.workingPlace);
      formData.append('rphNumber', form.rphNumber);
      formData.append('agreedToTerms', 'true');
      formData.append('apcFile', apcFile);

      const result = await register(formData);
      if (result.requiresTwoFactor) {
        toast.success('Registration submitted! Please verify your email.');
        navigate('/verify-2fa', { state: { email: result.email } });
      } else {
        toast.success(
          'Registration submitted! Your account is pending administrator verification. You can search the catalogue now — contributions will unlock once an admin verifies your APC.',
          { duration: 8000 }
        );
        navigate('/search');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-700 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">PL</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-1">Register as a verified pharmacist</p>
        </div>

        {/* Verification Loading Overlay */}
        {verifying && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center">
              <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Verifying Your Credentials</h3>
              <p className="text-gray-500 text-sm">
                Verifying your credentials with our automated system... (This takes a few seconds).
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input name="fullName" value={form.fullName} onChange={handleChange} className="input-field" placeholder="As per APC certificate" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Working Place</label>
              <input name="workingPlace" value={form.workingPlace} onChange={handleChange} className="input-field" placeholder="e.g., Hospital Kuala Lumpur" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="input-field" placeholder="your.email@moh.gov.my" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pharmacy Registration Number (RPh)
              </label>
              <input name="rphNumber" value={form.rphNumber} onChange={handleChange} className="input-field" placeholder="e.g., RPh025963" required />
              <a
                href="https://prisma.pharmacy.gov.my/find-registered-pharmacist"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 mt-1"
              >
                <ExternalLink size={12} />
                Verify via PRiSMA Portal
              </a>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input name="password" type="password" value={form.password} onChange={handleChange} className="input-field" placeholder="Min. 8 characters" required minLength={8} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} className="input-field" placeholder="Re-enter password" required />
              </div>
            </div>

            {/* APC Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Annual Practising Certificate (APC)
              </label>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2 text-xs text-blue-800 space-y-1.5">
                <p className="font-medium">How to obtain your APC:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>
                    Visit{' '}
                    <a
                      href="https://prisma.pharmacy.gov.my"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium hover:text-blue-900 inline-flex items-center gap-0.5"
                    >
                      prisma.pharmacy.gov.my
                      <ExternalLink size={10} />
                    </a>{' '}
                    and log in to your account.
                  </li>
                  <li>Download your <strong>Annual Practising Certificate (APC)</strong> as a PDF, OR</li>
                  <li>Take a clear screenshot of your APC.</li>
                  <li>Upload the file below (PDF, JPG, or PNG).</li>
                </ol>
                <p className="text-blue-600 italic pt-1">
                  Make sure your full name and RPh number are clearly visible on the certificate for automated verification.
                </p>
              </div>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                {apcFile ? (
                  <p className="text-sm text-primary-600 font-medium">{apcFile.name}</p>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600">Drag & drop your APC file or screenshot here, or click to browse</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, JPG, or PNG (max 10MB)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="agreedToTerms"
                name="agreedToTerms"
                checked={form.agreedToTerms}
                onChange={handleChange}
                className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                required
              />
              <label htmlFor="agreedToTerms" className="text-sm text-gray-600">
                I agree to the{' '}
                <Link to="/terms" className="text-primary-600 hover:underline" target="_blank">
                  Terms & Conditions
                </Link>
              </label>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={18} />
                  Register
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
