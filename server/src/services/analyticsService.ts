import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { dataPath } from '../paths.js';

const ANALYTICS_FILE = dataPath('analytics.json');

function getAnalytics(): any[] {
  const data = fs.readFileSync(ANALYTICS_FILE, 'utf-8');
  return JSON.parse(data);
}

function saveAnalytics(events: any[]) {
  fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(events, null, 2));
}

export const analyticsService = {
  track(event: {
    eventType: string;
    userId?: string;
    metadata?: Record<string, any>;
  }) {
    const events = getAnalytics();
    events.push({
      id: `evt-${uuidv4().slice(0, 8)}`,
      ...event,
      timestamp: new Date().toISOString(),
    });
    // Keep only last 10000 events
    if (events.length > 10000) {
      events.splice(0, events.length - 10000);
    }
    saveAnalytics(events);
  },

  getStats() {
    const events = getAnalytics();
    return {
      totalEvents: events.length,
      pageViews: events.filter((e: any) => e.eventType === 'page_view').length,
      searches: events.filter((e: any) => e.eventType === 'search').length,
      logins: events.filter((e: any) => e.eventType === 'login').length,
      registrations: events.filter((e: any) => e.eventType === 'register').length,
      contributions: events.filter((e: any) => e.eventType === 'contribution').length,
    };
  },
};
