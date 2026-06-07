import fs from 'fs';
import { dataPath } from '../paths.js';

const CMS_FILE = dataPath('cms-config.json');

export const cmsService = {
  getConfig() {
    const data = fs.readFileSync(CMS_FILE, 'utf-8');
    return JSON.parse(data);
  },

  saveConfig(config: any) {
    // Backup current config
    const backup = fs.readFileSync(CMS_FILE, 'utf-8');
    const backupFile = CMS_FILE.replace('.json', `.backup-${Date.now()}.json`);
    fs.writeFileSync(backupFile, backup);

    fs.writeFileSync(CMS_FILE, JSON.stringify(config, null, 2));
    return config;
  },

  updateGlobal(updates: any) {
    const config = this.getConfig();
    config.global = { ...config.global, ...updates };
    return this.saveConfig(config);
  },

  updateColors(colors: any) {
    const config = this.getConfig();
    config.global.colors = { ...config.global.colors, ...colors };
    return this.saveConfig(config);
  },

  updatePage(path: string, pageConfig: any) {
    const config = this.getConfig();
    config.pages[path] = pageConfig;
    return this.saveConfig(config);
  },

  resetToDefault() {
    const defaultConfig = {
      global: {
        siteName: 'PreserveLink',
        tagline: 'Cold Chain Stability Tool for Malaysian Pharmacists',
        logoUrl: '/logo.svg',
        colors: {
          primary: '#1e40af',
          secondary: '#3b82f6',
          accent: '#60a5fa',
          background: '#f8fafc',
          safe: '#16a34a',
          warning: '#ea580c',
          critical: '#dc2626',
        },
        contactInfo: 'Pharmaceutical Services Programme, Ministry of Health Malaysia',
      },
      pages: {},
    };
    return this.saveConfig(defaultConfig);
  },
};
