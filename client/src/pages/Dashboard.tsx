import { useState, useEffect, useRef, Fragment } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Settings, Bell, FileText, Send, Eye, MessageSquare, X } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, updateSettings } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'submissions');
  const [contributions, setContributions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsForm, setSettingsForm] = useState({ workingPlace: user?.workingPlace || '', currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [responseForm, setResponseForm] = useState<{ [key: string]: string }>({});
  // Which submission row currently has the inline reply form expanded
  const [openReplyRowId, setOpenReplyRowId] = useState<string | null>(null);
  const replySectionRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contribRes, notifRes] = await Promise.all([
        api.get('/contributions/my'),
        api.get('/notifications'),
      ]);
      setContributions(contribRes.data);
      setNotifications(notifRes.data.notifications);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settingsForm.newPassword && settingsForm.newPassword !== settingsForm.confirmNewPassword) {
      toast.error('New passwords do not match');
      return;
    }
    try {
      await updateSettings({
        workingPlace: settingsForm.workingPlace,
        ...(settingsForm.newPassword && { currentPassword: settingsForm.currentPassword, newPassword: settingsForm.newPassword }),
      });
      toast.success('Settings updated successfully');
      setSettingsForm((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmNewPassword: '' }));
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Update failed');
    }
  };

  const handleResponse = async (contributionId: string) => {
    const text = responseForm[contributionId];
    if (!text?.trim()) { toast.error('Please enter a response'); return; }
    try {
      await api.post(`/contributions/${contributionId}/respond`, { response: text });
      toast.success('Reply sent to admin');
      setResponseForm((prev) => ({ ...prev, [contributionId]: '' }));
      setOpenReplyRowId(null);
      // Refresh so the row reflects new state
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit response');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  // When a notification is clicked: mark read, then navigate to its link
  const handleNotificationClick = (n: any) => {
    if (!n.read) markAsRead(n.id);
    if (n.link) {
      navigate(n.link);
    }
  };

  // Watch for ?reply=<id> in URL — switch tab + open reply form for that row
  useEffect(() => {
    const replyId = searchParams.get('reply');
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
    if (replyId && contributions.length > 0) {
      const target = contributions.find((c) => c.id === replyId);
      if (target && target.adminComment) {
        setOpenReplyRowId(replyId);
        setTimeout(() => {
          const el = replySectionRefs.current[replyId];
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-warning-400');
            setTimeout(() => el.classList.remove('ring-2', 'ring-warning-400'), 2000);
            const input = el.querySelector('input[type="text"]') as HTMLInputElement | null;
            input?.focus();
          }
        }, 150);
      }
    }
  }, [searchParams, contributions]);

  // Sync activeTab to URL
  const switchTab = (tab: string) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    next.delete('reply');
    setSearchParams(next, { replace: true });
  };

  const statusConfig: any = {
    pending: { label: 'Pending', class: 'badge-pending' },
    approved: { label: 'Approved', class: 'badge-safe' },
    rejected: { label: 'Rejected', class: 'badge-critical' },
    awaiting_reply: { label: 'Awaiting Reply', class: 'badge-warning' },
  };

  const tabs = [
    { id: 'submissions', label: 'My Submissions', icon: FileText },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Determine if the user can reply to this submission. Replies are allowed
  // whenever the admin has left a comment AND the submission is NOT approved.
  const canReply = (c: any) => Boolean(c.adminComment) && c.status !== 'approved';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Submissions Tab */}
      {activeTab === 'submissions' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Submission History</h2>
          {loading ? (
            <div className="text-center py-8"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" /></div>
          ) : contributions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No submissions yet. Start contributing!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-gray-600 font-medium">Active Ingredient</th>
                    <th className="text-left py-3 px-2 text-gray-600 font-medium">Brand</th>
                    <th className="text-left py-3 px-2 text-gray-600 font-medium">Strength</th>
                    <th className="text-left py-3 px-2 text-gray-600 font-medium">Manufacturer</th>
                    <th className="text-left py-3 px-2 text-gray-600 font-medium">Status</th>
                    <th className="text-left py-3 px-2 text-gray-600 font-medium">Remarks</th>
                    <th className="text-left py-3 px-2 text-gray-600 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((c) => (
                    <Fragment key={c.id}>
                      <tr className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2">{c.genericName}</td>
                        <td className="py-3 px-2">{c.brandName}</td>
                        <td className="py-3 px-2">{c.strength}</td>
                        <td className="py-3 px-2">{c.manufacturer}</td>
                        <td className="py-3 px-2"><span className={statusConfig[c.status]?.class}>{statusConfig[c.status]?.label}</span></td>
                        <td className="py-3 px-2 max-w-xs">
                          {c.adminComment ? (
                            <span className="text-gray-700 text-xs">{c.adminComment}</span>
                          ) : (
                            <span className="text-gray-400 text-xs italic">—</span>
                          )}
                          {c.userResponse && (
                            <div className="text-xs text-blue-600 mt-1 italic">
                              You replied: {c.userResponse}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          {c.status === 'approved' && (
                            <button className="text-primary-600 hover:underline text-xs flex items-center gap-1">
                              <Eye size={12} />View
                            </button>
                          )}
                          {canReply(c) && (
                            <button
                              onClick={() => setOpenReplyRowId(openReplyRowId === c.id ? null : c.id)}
                              className="text-warning-700 hover:text-warning-800 text-xs flex items-center gap-1 font-medium"
                            >
                              {openReplyRowId === c.id ? (
                                <><X size={12} />Close</>
                              ) : (
                                <><MessageSquare size={12} />Add Reply</>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                      {/* Inline reply box */}
                      {openReplyRowId === c.id && canReply(c) && (
                        <tr
                          ref={(el) => { replySectionRefs.current[c.id] = el; }}
                          className="bg-warning-50 transition-shadow"
                        >
                          <td colSpan={7} className="px-2 py-3">
                            <div className="space-y-2">
                              <p className="text-xs text-warning-700 font-medium">
                                Reply to admin&apos;s remark on {c.genericName} ({c.brandName}):
                              </p>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={responseForm[c.id] || ''}
                                  onChange={(e) => setResponseForm((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                  className="input-field flex-1 text-sm"
                                  placeholder="Type your response..."
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleResponse(c.id);
                                  }}
                                />
                                <button
                                  onClick={() => handleResponse(c.id)}
                                  className="btn-primary text-sm flex items-center gap-1 whitespace-nowrap"
                                >
                                  <Send size={14} />Send
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h2>
          {notifications.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No notifications</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors hover:shadow-sm ${
                    n.read ? 'bg-white border-gray-100' : 'bg-primary-50 border-primary-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{n.title}</h4>
                      <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                      {n.link && (
                        <p className="text-xs text-primary-600 mt-1 font-medium">Click to open &rarr;</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="card max-w-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h2>
          <form onSubmit={handleSettingsSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input value={user?.email || ''} disabled className="input-field bg-gray-50 text-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Working Place</label>
              <input
                value={settingsForm.workingPlace}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, workingPlace: e.target.value }))}
                className="input-field"
              />
            </div>
            <hr className="my-4" />
            <h3 className="text-sm font-medium text-gray-700">Change Password</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input type="password" value={settingsForm.currentPassword} onChange={(e) => setSettingsForm((prev) => ({ ...prev, currentPassword: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" value={settingsForm.newPassword} onChange={(e) => setSettingsForm((prev) => ({ ...prev, newPassword: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input type="password" value={settingsForm.confirmNewPassword} onChange={(e) => setSettingsForm((prev) => ({ ...prev, confirmNewPassword: e.target.value }))} className="input-field" />
            </div>
            <button type="submit" className="btn-primary">Save Changes</button>
          </form>
        </div>
      )}
    </div>
  );
}
