import { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, Thermometer, Clock, Filter, FileDown, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function Search() {
  const [categories, setCategories] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [form, setForm] = useState({
    medicineName: '',
    category: '',
    temperature: '',
    duration: '',
    durationUnit: 'hours' as 'hours' | 'minutes',
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/search/categories').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  const handleAutocomplete = async (value: string) => {
    setForm((prev) => ({ ...prev, medicineName: value }));
    if (value.length >= 2) {
      try {
        const { data } = await api.get(`/search/autocomplete?q=${encodeURIComponent(value)}`);
        setSuggestions(data);
        setShowSuggestions(true);
      } catch { setSuggestions([]); }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicineName || !form.temperature || !form.duration) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await api.post('/search/query', form);
      setResult(data);
    } catch (error: any) {
      setResult(null);
      toast.error(error.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    if (!resultRef.current) return;
    toast.loading('Generating PDF...');
    try {
      const canvas = await html2canvas(resultRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`PreserveLink-${form.medicineName}-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.dismiss();
      toast.success('PDF downloaded!');
    } catch {
      toast.dismiss();
      toast.error('PDF generation failed');
    }
  };

  const verdictConfig = {
    safe: { icon: CheckCircle, color: 'bg-safe-50 border-safe-200 text-safe-700', badge: 'badge-safe', label: 'SAFE TO USE' },
    short_shelf_life: { icon: AlertTriangle, color: 'bg-warning-50 border-warning-200 text-warning-700', badge: 'badge-warning', label: 'SHORTENED SHELF LIFE' },
    discard: { icon: XCircle, color: 'bg-critical-50 border-critical-200 text-critical-700', badge: 'badge-critical', label: 'DISCARD' },
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Search Form */}
      <div className="card mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Cold Chain Stability Check</h1>
        <p className="text-gray-500 text-sm mb-6">Determine immediate action for temperature-sensitive medicines after a fridge breakdown.</p>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Medicine Name */}
            <div className="md:col-span-2 relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Medicine Name</label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={form.medicineName}
                  onChange={(e) => handleAutocomplete(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="input-field pl-10"
                  placeholder="Type medicine name (e.g., Insulin Glargine, Lantus)"
                  required
                />
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full text-left px-4 py-2.5 hover:bg-primary-50 text-sm border-b border-gray-50 last:border-0"
                      onMouseDown={() => { setForm((prev) => ({ ...prev, medicineName: s.split(' (')[0] })); setShowSuggestions(false); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Filter size={14} className="inline mr-1" />Category (Optional)
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="input-field"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Thermometer size={14} className="inline mr-1" />Current Refrigerator Temperature (&deg;C)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.temperature}
                onChange={(e) => setForm((prev) => ({ ...prev, temperature: e.target.value }))}
                className="input-field"
                placeholder="e.g., 15"
                required
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock size={14} className="inline mr-1" />Duration of Exposure
              </label>
              <input
                type="number"
                step="0.5"
                value={form.duration}
                onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
                className="input-field"
                placeholder="e.g., 4"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={form.durationUnit}
                onChange={(e) => setForm((prev) => ({ ...prev, durationUnit: e.target.value as 'hours' | 'minutes' }))}
                className="input-field"
              >
                <option value="hours">Hours</option>
                <option value="minutes">Minutes</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full md:w-auto flex items-center justify-center gap-2">
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <SearchIcon size={18} />
                Check Stability and Action Plan
              </>
            )}
          </button>
        </form>
      </div>

      {/* Results */}
      {searched && result && (
        <div ref={resultRef} className="space-y-6">
          {/* Verdict Panel */}
          <div className={`border-2 rounded-xl p-6 ${verdictConfig[result.verdict as keyof typeof verdictConfig].color}`}>
            <div className="flex items-start gap-4">
              {(() => {
                const Icon = verdictConfig[result.verdict as keyof typeof verdictConfig].icon;
                return <Icon size={32} className="flex-shrink-0 mt-1" />;
              })()}
              <div>
                <h2 className="text-xl font-bold mb-1">
                  Stability Verdict & Action Plan for {result.medicine.genericName}
                </h2>
                <span className={verdictConfig[result.verdict as keyof typeof verdictConfig].badge}>
                  {verdictConfig[result.verdict as keyof typeof verdictConfig].label}
                </span>
                <p className="mt-3 text-sm leading-relaxed">{result.verdictMessage}</p>
              </div>
            </div>
          </div>

          {/* Medicine Details */}
          <div className="card">
            <h3 className="font-semibold text-lg text-gray-900 mb-4">Medicine Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><span className="text-xs font-medium text-gray-500 uppercase">Active Ingredient</span><p className="text-gray-900">{result.medicine.activeIngredient}</p></div>
              <div><span className="text-xs font-medium text-gray-500 uppercase">Brand Name</span><p className="text-gray-900">{result.medicine.brandName}</p></div>
              <div><span className="text-xs font-medium text-gray-500 uppercase">Manufacturer</span><p className="text-gray-900">{result.medicine.manufacturer}</p></div>
              <div><span className="text-xs font-medium text-gray-500 uppercase">Strength</span><p className="text-gray-900">{result.medicine.strength}</p></div>
              <div><span className="text-xs font-medium text-gray-500 uppercase">Category</span><p className="text-gray-900">{result.medicine.category}</p></div>
              {result.matchedStability?.shelfLife && (
                <div><span className="text-xs font-medium text-gray-500 uppercase">Remaining Shelf Life</span><p className="text-gray-900 font-medium">{result.matchedStability.shelfLife}</p></div>
              )}
            </div>
          </div>

          {/* Detailed Info */}
          <div className="card">
            <h3 className="font-semibold text-lg text-gray-900 mb-4">Detailed Information</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">General Information (Product Leaflet)</h4>
                <p className="text-gray-700 text-sm leading-relaxed">{result.medicine.generalInfo}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Specific Information (Manufacturer)</h4>
                <p className="text-gray-700 text-sm leading-relaxed">{result.medicine.specificInfo}</p>
              </div>
            </div>
          </div>

          {/* Credits */}
          <div className="card">
            <h3 className="font-semibold text-lg text-gray-900 mb-4">Credits</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-gray-500 block">Contributor</span><span className="text-gray-900">{result.medicine.contributorName}</span></div>
              {result.medicine.salespersonEmail && (
                <div><span className="text-gray-500 block">Salesperson Email</span><a href={`mailto:${result.medicine.salespersonEmail}`} className="text-primary-600 hover:underline">{result.medicine.salespersonEmail}</a></div>
              )}
              {result.medicine.contactNumber && (
                <div><span className="text-gray-500 block">Contact Number</span><span className="text-gray-900">{result.medicine.contactNumber}</span></div>
              )}
            </div>
          </div>

          {/* PDF Export */}
          <div className="flex justify-end">
            <button onClick={exportPDF} className="btn-secondary flex items-center gap-2">
              <FileDown size={18} />
              Download PDF Report
            </button>
          </div>
        </div>
      )}

      {searched && !result && !loading && (
        <div className="card text-center py-12">
          <SearchIcon className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-700">No Results Found</h3>
          <p className="text-gray-500 mt-1">No matching medicine found in our database. Please check the spelling or try a different search term.</p>
        </div>
      )}
    </div>
  );
}
