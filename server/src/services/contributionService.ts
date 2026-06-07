import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { dataPath } from '../paths.js';

const CONTRIBUTIONS_FILE = dataPath('demo-contributions.json');
const NOTIFICATIONS_FILE = dataPath('demo-notifications.json');
const USERS_FILE = dataPath('demo-users.json');

function getContributions(): any[] {
  const data = fs.readFileSync(CONTRIBUTIONS_FILE, 'utf-8');
  return JSON.parse(data);
}

function saveContributions(contributions: any[]) {
  fs.writeFileSync(CONTRIBUTIONS_FILE, JSON.stringify(contributions, null, 2));
}

function addNotification(notification: any) {
  const notifications = JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8'));
  notifications.push(notification);
  fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
}

// Get all admin/true_admin user IDs (excluding a specific user — used to skip self-notify)
function getAdminUserIds(excludeUserId?: string): string[] {
  try {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    return users
      .filter((u: any) =>
        (u.role === 'admin' || u.role === 'true_admin') &&
        u.id !== excludeUserId
      )
      .map((u: any) => u.id);
  } catch {
    return [];
  }
}

export const contributionService = {
  getByUserId(userId: string) {
    return getContributions().filter((c: any) => c.userId === userId);
  },

  getAll() {
    return getContributions();
  },

  getById(id: string) {
    return getContributions().find((c: any) => c.id === id);
  },

  create(data: {
    userId: string;
    contributorName: string;
    genericName: string;
    strength: string;
    brandName: string;
    manufacturer: string;
    category: string;
    mktAvailable: boolean;
    mktDetails?: string;
    stabilityStatements: any[];
    attachmentUrls: string[];
  }) {
    const contributions = getContributions();
    const newContribution = {
      id: `contrib-${uuidv4().slice(0, 8)}`,
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    contributions.push(newContribution);
    saveContributions(contributions);

    // Notify ALL admins (except the contributor themselves, in case admin contributes)
    const adminIds = getAdminUserIds(data.userId);
    for (const adminId of adminIds) {
      addNotification({
        id: `notif-${uuidv4().slice(0, 8)}`,
        userId: adminId,
        title: 'New Submission Received',
        message: `${data.contributorName} has submitted new stability data for ${data.genericName} (${data.brandName}).`,
        type: 'info',
        read: false,
        link: `/admin?tab=inbox&submission=${newContribution.id}`,
        contributionId: newContribution.id,
        createdAt: new Date().toISOString(),
      });
    }

    return newContribution;
  },

  updateStatus(id: string, status: string, adminComment?: string, actingAdminId?: string) {
    const contributions = getContributions();
    const index = contributions.findIndex((c: any) => c.id === id);
    if (index === -1) return null;

    contributions[index].status = status;
    contributions[index].updatedAt = new Date().toISOString();
    if (adminComment) {
      contributions[index].adminComment = adminComment;
    }

    saveContributions(contributions);

    // Notify ONLY the user who submitted — not the admin who acted
    // Skip if the contributor is the same as the acting admin (no self-notify)
    if (contributions[index].userId !== actingAdminId) {
      addNotification({
        id: `notif-${uuidv4().slice(0, 8)}`,
        userId: contributions[index].userId,
        title: status === 'approved'
          ? 'Submission Approved!'
          : status === 'rejected'
            ? 'Submission Rejected'
            : 'Action Required',
        message: status === 'approved'
          ? `Your submission for ${contributions[index].genericName} has been approved and published.`
          : status === 'rejected'
            ? `Your submission for ${contributions[index].genericName} has been rejected. ${adminComment || ''}`
            : `Admin has requested additional information for ${contributions[index].genericName}. ${adminComment || ''}`,
        type: status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'warning',
        read: false,
        link: status === 'awaiting_reply'
          ? `/dashboard?tab=submissions&reply=${id}`
          : `/dashboard?tab=submissions`,
        contributionId: id,
        createdAt: new Date().toISOString(),
      });
    }

    return contributions[index];
  },

  addUserResponse(id: string, response: string, attachmentUrl?: string) {
    const contributions = getContributions();
    const index = contributions.findIndex((c: any) => c.id === id);
    if (index === -1) return null;

    contributions[index].userResponse = response;
    if (attachmentUrl) {
      contributions[index].userResponseAttachment = attachmentUrl;
    }
    contributions[index].status = 'pending';
    contributions[index].updatedAt = new Date().toISOString();

    saveContributions(contributions);

    // Notify ALL admins (excluding the contributor, in case the contributor IS an admin)
    const adminIds = getAdminUserIds(contributions[index].userId);
    for (const adminId of adminIds) {
      addNotification({
        id: `notif-${uuidv4().slice(0, 8)}`,
        userId: adminId,
        title: 'User Replied to Your Comment',
        message: `${contributions[index].contributorName} has responded regarding ${contributions[index].genericName} (${contributions[index].brandName}).`,
        type: 'info',
        read: false,
        link: `/admin?tab=inbox&submission=${id}`,
        contributionId: id,
        createdAt: new Date().toISOString(),
      });
    }

    return contributions[index];
  },
};
