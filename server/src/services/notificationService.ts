import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { dataPath } from '../paths.js';

const NOTIFICATIONS_FILE = dataPath('demo-notifications.json');

function getNotifications(): any[] {
  const data = fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8');
  return JSON.parse(data);
}

function saveNotifications(notifications: any[]) {
  fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
}

export const notificationService = {
  getByUserId(userId: string) {
    return getNotifications()
      .filter((n: any) => n.userId === userId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getUnreadCount(userId: string) {
    return getNotifications().filter((n: any) => n.userId === userId && !n.read).length;
  },

  markAsRead(id: string) {
    const notifications = getNotifications();
    const index = notifications.findIndex((n: any) => n.id === id);
    if (index === -1) return null;
    notifications[index].read = true;
    saveNotifications(notifications);
    return notifications[index];
  },

  markAllAsRead(userId: string) {
    const notifications = getNotifications();
    notifications.forEach((n: any) => {
      if (n.userId === userId) n.read = true;
    });
    saveNotifications(notifications);
  },

  create(data: { userId: string; title: string; message: string; type: string; link?: string }) {
    const notifications = getNotifications();
    const notification = {
      id: `notif-${uuidv4().slice(0, 8)}`,
      ...data,
      read: false,
      createdAt: new Date().toISOString(),
    };
    notifications.push(notification);
    saveNotifications(notifications);
    return notification;
  },
};
