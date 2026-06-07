import { useState, useEffect } from 'react';
import { Palette, Layout, Type, Image, Save, RotateCcw, Upload, Monitor, Smartphone, Tablet } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function CMSEditor() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('colors');
  const [preview, setPreview] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  useEffect(() => {
    api.get('/cms/config').then(({ data }) => { setConfig(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleColorChange = (key: string, value: string) => {
    setConfig((prev: any) => ({
      ...prev,
      global: { ...prev.global, colors: { ...prev.global.colors, [key]: value } },
    }));
  };

  const handleGlobalChange = (key: string, value: string) => {
    setConfig((prev: any) => ({
      ...prev,
      global: { ...prev.global, [key]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/cms/config', config);
      toast.success('CMS configuration saved successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save');
    }
    setSaving(false);
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset to default configuration?')) return;
    try {
      const { data } = await api.post('/cms/reset');
      setConfig(data.config);
      toast.success('Reset to defaults');
    } catch {
      toast.error('Failed to reset');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const { data } = await api.post('/cms/upload-logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setConfig((prev: any) => ({ ...prev, global: { ...prev.global, logoUrl: data.logoUrl } }));
      toast.success('Logo uploaded!');
    } catch {
      toast.error('Logo upload failed');
    }
  };

  const sections = [
    { id: 'colors', label: 'Color Scheme', icon: Palette },
    { id: 'global', label: 'Global Settings', icon: Layout },
    { id: 'blocks', label: 'Page Blocks', icon: Type },
    { id: 'logo', label: 'Logo & Branding', icon: Image },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CMS Editor</h1>
          <p className="text-sm text-gray-500">Visual configuration editor — True Admin only</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="btn-secondary flex items-center gap-1 text-sm">
            <RotateCcw size={16} />Reset
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1 text-sm">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === s.id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={18} />{s.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main editor area */}
        <div className="lg:col-span-3">
          {/* Color Scheme Editor */}
          {activeSection === 'colors' && config && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Color Scheme</h2>
              <p className="text-sm text-gray-500 mb-6">Customize the application's color palette. Changes apply globally.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(config.global.colors).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <input
                      type="color"
                      value={value as string}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border-0"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700 capitalize">{key}</p>
                      <p className="text-xs text-gray-400 font-mono">{value as string}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Global Settings */}
          {activeSection === 'global' && config && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Global Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
                  <input value={config.global.siteName} onChange={(e) => handleGlobalChange('siteName', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
                  <input value={config.global.tagline} onChange={(e) => handleGlobalChange('tagline', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Information</label>
                  <input value={config.global.contactInfo} onChange={(e) => handleGlobalChange('contactInfo', e.target.value)} className="input-field" />
                </div>
              </div>
            </div>
          )}

          {/* Page Blocks */}
          {activeSection === 'blocks' && config && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Page Blocks</h2>
              <p className="text-sm text-gray-500 mb-4">Manage content blocks for each page.</p>

              {/* Preview size toggle */}
              <div className="flex gap-2 mb-6">
                <button onClick={() => setPreview('desktop')} className={`p-2 rounded ${preview === 'desktop' ? 'bg-primary-100 text-primary-700' : 'text-gray-400'}`}><Monitor size={18} /></button>
                <button onClick={() => setPreview('tablet')} className={`p-2 rounded ${preview === 'tablet' ? 'bg-primary-100 text-primary-700' : 'text-gray-400'}`}><Tablet size={18} /></button>
                <button onClick={() => setPreview('mobile')} className={`p-2 rounded ${preview === 'mobile' ? 'bg-primary-100 text-primary-700' : 'text-gray-400'}`}><Smartphone size={18} /></button>
              </div>

              {Object.entries(config.pages).map(([path, page]: [string, any]) => (
                <div key={path} className="mb-6 p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">{page.title} <span className="text-xs text-gray-400">({path})</span></h3>
                  {page.blocks?.length > 0 ? (
                    <div className="space-y-2">
                      {page.blocks.map((block: any, i: number) => (
                        <div key={block.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded border">
                          <span className="text-xs font-mono text-gray-400">{i + 1}</span>
                          <span className="text-sm capitalize font-medium text-gray-700">{block.type}</span>
                          <span className="text-xs text-gray-400 flex-1">
                            {block.type === 'hero' ? block.content?.title : block.type === 'text' ? 'Text block' : block.type}
                          </span>
                          <label className="flex items-center gap-1 text-xs text-gray-500">
                            <input
                              type="checkbox"
                              checked={block.visible}
                              onChange={() => {
                                const newConfig = { ...config };
                                newConfig.pages[path].blocks[i].visible = !block.visible;
                                setConfig({ ...newConfig });
                              }}
                              className="rounded border-gray-300"
                            />
                            Visible
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No custom blocks (using default layout)</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Logo & Branding */}
          {activeSection === 'logo' && config && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Logo & Branding</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Logo</label>
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                    {config.global.logoUrl ? (
                      <img src={config.global.logoUrl} alt="Logo" className="max-w-full max-h-full p-2" />
                    ) : (
                      <span className="text-gray-400 text-xs">No logo</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload New Logo</label>
                  <label className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors w-fit">
                    <Upload size={18} className="text-gray-500" />
                    <span className="text-sm text-gray-600">Choose file...</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  <p className="text-xs text-gray-400 mt-1">Recommended: SVG or PNG with transparent background</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
