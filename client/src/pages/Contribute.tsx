import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { PlusCircle, Info, Upload, Lock } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Contribute() {
  const { user } = useAuthStore();
  const isVerified = user?.verificationStatus === 'verified' || user?.role === 'admin' || user?.role === 'true_admin';
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    genericName: '',
    strength: '',
    brandName: '',
    manufacturer: '',
    category: '',
    mktAvailable: false,
    mktDetails: '',
    declaration: false,
  });
  const [statements, setStatements] = useState([{
    manufacturer: '', drugName: '', temperature: '', duration: '', durationUnit: 'hours', stabilityPeriod: '', stabilityUnit: 'days',
  }]);
  const [customCategory, setCustomCategory] = useState('');

  useEffect(() => {
    api.get('/search/categories').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  // Auto-prefill manufacturer & drug name into stability statements
  useEffect(() => {
    setStatements((prev) =>
      prev.map((stmt) => ({
        ...stmt,
        manufacturer: form.manufacturer || stmt.manufacturer,
        drugName: form.genericName || stmt.drugName,
      }))
    );
  }, [form.manufacturer, form.genericName]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (accepted) => setFiles((prev) => [...prev, ...accepted]),
    accept: { 'image/jpeg': [], 'image/png': [], 'application/pdf': [] },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const updateStatement = (index: number, field: string, value: string) => {
    setStatements((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addStatement = () => {
    setStatements((prev) => [...prev, {
      manufacturer: form.manufacturer || '',
      drugName: form.genericName || '',
      temperature: '',
      duration: '',
      durationUnit: 'hours',
      stabilityPeriod: '',
      stabilityUnit: 'days',
    }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.declaration) {
      toast.error('You must accept the declaration');
      return;
    }
    if (form.category === '__other' && !customCategory.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    setLoading(true);
    try {
      const finalCategory = form.category === '__other' ? customCategory.trim() : form.category;
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (key === 'category') {
          formData.append('category', finalCategory);
        } else {
          formData.append(key, String(val));
        }
      });
      formData.append('stabilityStatements', JSON.stringify(statements));
      files.forEach((f) => formData.append('attachments', f));

      await api.post('/contributions', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Contribution submitted successfully! It will be reviewed by our admin team.');
      setForm({ genericName: '', strength: '', brandName: '', manufacturer: '', category: '', mktAvailable: false, mktDetails: '', declaration: false });
      setStatements([{ manufacturer: '', drugName: '', temperature: '', duration: '', durationUnit: 'hours', stabilityPeriod: '', stabilityUnit: 'days' }]);
      setCustomCategory('');
      setFiles([]);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {!isVerified && (
        <div className="card text-center py-10">
          <div className="w-16 h-16 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-warning-600" size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Contributions Locked</h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto mb-1">
            Your account is currently <strong>pending administrator verification</strong>.
          </p>
          <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
            You will be able to contribute new stability data once an administrator
            has reviewed and approved your Annual Practising Certificate (APC).
          </p>
          <Link to="/search" className="btn-primary inline-flex items-center gap-1">
            Go to Search
          </Link>
        </div>
      )}
      {isVerified && (
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Contribute Stability Data</h1>
        <p className="text-gray-500 text-sm mb-6">Share your findings to help fellow pharmacists make informed decisions.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Generic Name *</label>
              <input name="genericName" value={form.genericName} onChange={handleChange} className="input-field" placeholder="e.g., Insulin Glargine" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Strength *</label>
              <input name="strength" value={form.strength} onChange={handleChange} className="input-field" placeholder="e.g., 100 units/mL" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name *</label>
              <input name="brandName" value={form.brandName} onChange={handleChange} className="input-field" placeholder="e.g., Lantus" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer Name *</label>
              <input name="manufacturer" value={form.manufacturer} onChange={handleChange} className="input-field" placeholder="e.g., Sanofi" required />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Category *</label>
            <select name="category" value={form.category} onChange={handleChange} className="input-field" required>
              <option value="">Select category</option>
              {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
              <option value="__other">Other (new category)</option>
            </select>
            {form.category === '__other' && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="input-field mt-2"
                placeholder="Type the new category name"
                required
              />
            )}
          </div>

          {/* MKT */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                Mean Kinetic Temperature (MKT)
                <span className="relative group">
                  <sup className="text-primary-600 cursor-help font-bold">i</sup>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    Mean Kinetic Temperature (MKT) is a single, calculated temperature that represents the cumulative thermal stress a temperature-sensitive product experiences over a period of time.
                  </span>
                </span>
              </label>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, mktAvailable: !prev.mktAvailable }))}
                className={`w-12 h-6 rounded-full transition-colors ${form.mktAvailable ? 'bg-safe-500' : 'bg-critical-500'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${form.mktAvailable ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <span className="text-xs text-gray-500">{form.mktAvailable ? 'Yes - MKT data available' : 'No - MKT data not available'}</span>
            {form.mktAvailable && (
              <textarea
                name="mktDetails"
                value={form.mktDetails}
                onChange={handleChange}
                className="input-field mt-3"
                placeholder="Enter MKT details..."
                rows={2}
              />
            )}
          </div>

          {/* Stability Statements */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Manufacturer Stability Statement(s)</h3>
            <p className="text-xs text-gray-500 mb-3 italic">
              Template: "According to <strong>[Manufacturer]</strong>, if <strong>[Drug Name]</strong> is stored at [&deg;C] for [Number] [Hours/Minutes], the stability is for [Number] [Months/Weeks/Days/Hours]."
            </p>
            <p className="text-xs text-gray-400 mb-3">Manufacturer and Drug Name auto-fill from the fields above.</p>
            {statements.map((stmt, i) => (
              <div key={i} className="p-4 border border-gray-200 rounded-lg mb-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Manufacturer</label>
                    <input
                      value={stmt.manufacturer}
                      onChange={(e) => updateStatement(i, 'manufacturer', e.target.value)}
                      className="input-field text-sm bg-gray-50"
                      placeholder="From Manufacturer Name above"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Drug Name</label>
                    <input
                      value={stmt.drugName}
                      onChange={(e) => updateStatement(i, 'drugName', e.target.value)}
                      className="input-field text-sm bg-gray-50"
                      placeholder="From Generic Name above"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Storage Temp (°C)</label>
                    <input type="number" step="0.1" value={stmt.temperature} onChange={(e) => updateStatement(i, 'temperature', e.target.value)} className="input-field text-sm" placeholder="e.g., 25" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Duration</label>
                    <input type="number" value={stmt.duration} onChange={(e) => updateStatement(i, 'duration', e.target.value)} className="input-field text-sm" placeholder="e.g., 6" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
                    <select value={stmt.durationUnit} onChange={(e) => updateStatement(i, 'durationUnit', e.target.value)} className="input-field text-sm">
                      <option value="hours">Hours</option>
                      <option value="minutes">Minutes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Stable for</label>
                    <input type="number" value={stmt.stabilityPeriod} onChange={(e) => updateStatement(i, 'stabilityPeriod', e.target.value)} className="input-field text-sm" placeholder="e.g., 24" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Period Unit</label>
                    <select value={stmt.stabilityUnit} onChange={(e) => updateStatement(i, 'stabilityUnit', e.target.value)} className="input-field text-sm">
                      <option value="months">Months</option>
                      <option value="weeks">Weeks</option>
                      <option value="days">Days</option>
                      <option value="hours">Hours</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={addStatement} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              <PlusCircle size={16} /> Add another statement
            </button>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attachments (Proof)</label>
            <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 transition-colors">
              <input {...getInputProps()} />
              <Upload className="mx-auto text-gray-400 mb-2" size={24} />
              <p className="text-sm text-gray-600">Drag & drop files here, or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG (max 10MB each)</p>
            </div>
            <p className="text-xs text-gray-500 italic mt-2">Email screenshots must clearly show the recipient and sender for verification purposes.</p>
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-1.5 rounded">
                    <span className="text-gray-700">{f.name}</span>
                    <button type="button" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-critical-500 text-xs hover:underline">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Declaration */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="declaration"
                name="declaration"
                checked={form.declaration}
                onChange={handleChange}
                className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                required
              />
              <label htmlFor="declaration" className="text-sm text-gray-700">
                I confirm that the information I am submitting is true, accurate, and original. I understand and accept that I am solely responsible for the accuracy of this content and any liability resulting from false information. I agree to have my name publicly displayed as the contributor of this data.
              </label>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <PlusCircle size={18} />
                Submit Contribution
              </>
            )}
          </button>
        </form>
      </div>
      )}
    </div>
  );
}
