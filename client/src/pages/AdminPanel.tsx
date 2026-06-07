import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, Users, CheckCircle, XCircle, MessageSquare, ArrowUpCircle, Send, FileText, UserCheck, ExternalLink } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export default function AdminPanel() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'inbox');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentForm, setCommentForm] = useState<{ [key: string]: string }>({});
  const [rejectReasonForm, setRejectReasonForm] = useState<{ [key: string]: string }>({});
  const [showRejectInput, setShowRejectInput] = useState<{ [key: string]: boolean }>({});
  const [stats, setStats] = useState<any>(null);
  const submissionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const userRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subRes, pendingRes] = await Promise.all([
        api.get('/admin/submissions'),
        api.get('/admin/pending-users'),
      ]);
      setSubmissions(subRes.data);
      setPendingUsers(pendingRes.data);
      if (user?.role === 'true_admin') {
        const [usersRes, statsRes] = await Promise.all([api.get('/admin/users'), api.get('/analytics/stats')]);
        setUsers(usersRes.data);
        setStats(statsRes.data);
      }
    } catch (error: any) {
      toast.error('Failed to load admin data');
    }
    setLoading(false);
  };

  // Watch ?submission=<id> or ?user=<id> — scroll to & highlight target
  useEffect(() => {
    const submissionId = searchParams.get('submission');
    const userId = searchParams.get('user');
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) setActiveTab(tab);

    if (submissionId && submissions.length > 0) {
      setTimeout(() => {
        const el = submissionRefs.current[submissionId];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-primary-400');
          setTimeout(() => el.classList.remove('ring-2', 'ring-primary-400'), 2000);
        }
      }, 100);
    }
    if (userId && pendingUsers.length > 0) {
      setTimeout(() => {
        const el = userRefs.current[userId];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-primary-400');
          setTimeout(() => el.classList.remove('ring-2', 'ring-primary-400'), 2000);
        }
      }, 100);
    }
  }, [searchParams, submissions, pendingUsers]);

  const switchTab = (tab: string) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    next.delete('submission');
    next.delete('user');
    setSearchParams(next, { replace: true });
  };

  const handleAction = async (id: string, status: string) => {
    const comment = commentForm[id] || '';
    if (status === 'awaiting_reply' && !comment.trim()) {
      toast.error('Please type a comment to send to the user');
      return;
    }
    try {
      await api.put(`/admin/submissions/${id}`, { status, comment });
      toast.success(
        status === 'approved'
          ? 'Submission approved'
          : status === 'rejected'
            ? 'Submission rejected'
            : 'Reply sent to user'
      );
      setCommentForm((prev) => ({ ...prev, [id]: '' }));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Action failed');
    }
  };

  const handleVerifyUser = async (userId: string) => {
    try {
      await api.put(`/admin/users/${userId}/verify`);
      toast.success('User verified successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to verify user');
    }
  };

  const handleRejectUser = async (userId: string) => {
    const reason = rejectReasonForm[userId] || '';
    if (!reason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await api.put(`/admin/users/${userId}/reject-verification`, { reason });
      toast.success('User registration rejected');
      setRejectReasonForm((prev) => ({ ...prev, [userId]: '' }));
      setShowRejectInput((prev) => ({ ...prev, [userId]: false }));
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject user');
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role });
      toast.success(`User role updated to ${role}`);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update role');
    }
  };

  const tabs = [
    { id: 'inbox', label: 'Review Inbox', icon: MessageSquare },
    {
      id: 'pending-users',
      label: `Pending Registrations${pendingUsers.length > 0 ? ` (${pendingUsers.length})` : ''}`,
      icon: UserCheck,
    },
    ...(user?.role === 'true_admin' ? [
      { id: 'users', label: 'Manage Users', icon: Users },
      { id: 'stats', label: 'Statistics', icon: Shield },
    ] : []),
  ];

  const statusConfig: any = {
    pending: { label: 'Pending Review', class: 'badge-pending' },
    approved: { label: 'Approved', class: 'badge-safe' },
    rejected: { label: 'Rejected', class: 'badge-critical' },
    awaiting_reply: { label: 'Awaiting Reply', class: 'badge-warning' },
  };

  // Resolve absolute URL for the APC file (served by /uploads on the API server)
  const apcFileUrl = (filename: string) => {
    if (!filename) return '';
    // Vite dev server proxies /api but uploads are served via /uploads on the
    // same origin. In dev we hit the backend directly through the Vite proxy.
    return `/uploads/${filename}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Shield className="text-primary-700" size={24} />
        Admin Panel
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => switchTab(tab.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Icon size={16} />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Pending Registrations Tab */}
      {activeTab === 'pending-users' && (
        <div className="space-y-4">
          {loading ? (
            <div className="card text-center py-8">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="card text-center py-8">
              <UserCheck className="mx-auto text-gray-300 mb-2" size={48} />
              <p className="text-gray-500">No pending registrations to review.</p>
            </div>
          ) : (
            pendingUsers.map((u) => (
              <div
                key={u.id}
                ref={(el) => { userRefs.current[u.id] = el; }}
                className="card transition-shadow"
              >
                <div className="flex justify-between items-start mb-4 gap-4 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-gray-900">{u.fullName}</h3>
                    <p className="text-sm text-gray-600">{u.email}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      <strong>RPh:</strong> {u.rphNumber} &bull; <strong>Workplace:</strong> {u.workingPlace}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Registered: {new Date(u.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="badge-pending">Pending Verification</span>
                </div>

                {/* OCR result summary */}
                {u.apcOcrResult && (
                  <div className={`rounded-lg p-3 mb-4 text-sm border ${
                    u.apcOcrResult.keywordFound
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-warning-50 border-warning-200'
                  }`}>
                    <p className="font-medium text-gray-700 mb-1">Automated APC Check:</p>
                    <ul className="text-xs space-y-0.5 text-gray-700">
                      <li>
                        Contains &quot;Annual Practising Certificate&quot; phrase:{' '}
                        <span className={u.apcOcrResult.keywordFound ? 'text-safe-700 font-medium' : 'text-critical-700 font-medium'}>
                          {u.apcOcrResult.keywordFound ? 'Yes' : 'No'}
                        </span>
                      </li>
                      <li>Name match: <span className="font-medium">{u.apcOcrResult.nameMatch ? 'Yes' : 'No'}</span></li>
                      <li>RPh number match: <span className="font-medium">{u.apcOcrResult.rphMatch ? 'Yes' : 'No'}</span></li>
                    </ul>
                    <p className="text-xs text-gray-600 mt-2 italic">{u.apcOcrResult.message}</p>
                  </div>
                )}

                {/* APC file preview link */}
                {u.apcFileUrl ? (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <FileText size={14} /> Uploaded APC File:
                    </p>
                    <a
                      href={apcFileUrl(u.apcFileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium underline"
                    >
                      View APC File
                      <ExternalLink size={12} />
                    </a>
                    <span className="text-xs text-gray-500 ml-2">
                      ({u.apcOriginalFilename || u.apcFileUrl})
                    </span>
                  </div>
                ) : (
                  <div className="bg-critical-50 border border-critical-200 rounded-lg p-3 mb-4 text-sm text-critical-700">
                    No APC file was uploaded with this registration.
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleVerifyUser(u.id)}
                      className="flex items-center gap-1 px-4 py-2 bg-safe-600 text-white rounded-lg text-sm font-medium hover:bg-safe-700"
                    >
                      <CheckCircle size={16} />Verify User
                    </button>
                    <button
                      onClick={() => setShowRejectInput((prev) => ({ ...prev, [u.id]: !prev[u.id] }))}
                      className="flex items-center gap-1 px-4 py-2 bg-critical-600 text-white rounded-lg text-sm font-medium hover:bg-critical-700"
                    >
                      <XCircle size={16} />Reject Registration
                    </button>
                  </div>
                  {showRejectInput[u.id] && (
                    <div className="bg-critical-50 border border-critical-200 rounded-lg p-3 space-y-2">
                      <p className="text-xs text-critical-700 font-medium">
                        Reason for rejection (required, will be emailed to the user):
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={rejectReasonForm[u.id] || ''}
                          onChange={(e) => setRejectReasonForm((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          className="input-field flex-1 text-sm"
                          placeholder="e.g., APC file is not a valid certificate, name mismatch, etc."
                        />
                        <button
                          onClick={() => handleRejectUser(u.id)}
                          className="btn-primary bg-critical-600 hover:bg-critical-700 text-sm flex items-center gap-1 whitespace-nowrap"
                        >
                          <Send size={14} />Confirm Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Inbox */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          {loading ? (
            <div className="card text-center py-8"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" /></div>
          ) : submissions.length === 0 ? (
            <div className="card text-center py-8"><p className="text-gray-500">No submissions to review</p></div>
          ) : (
            submissions.map((s) => {
              const comment = commentForm[s.id] || '';
              const hasComment = comment.trim().length > 0;
              return (
                <div
                  key={s.id}
                  ref={(el) => { submissionRefs.current[s.id] = el; }}
                  className="card transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{s.genericName} ({s.brandName})</h3>
                      <p className="text-sm text-gray-500">{s.manufacturer} &bull; {s.strength} &bull; {s.category}</p>
                      <p className="text-xs text-gray-400 mt-1">By: {s.contributorName} &bull; {new Date(s.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={statusConfig[s.status]?.class}>{statusConfig[s.status]?.label}</span>
                  </div>

                  {s.stabilityStatements?.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                      <p className="font-medium text-gray-700 mb-1">Stability Statement(s):</p>
                      {s.stabilityStatements.map((stmt: any, i: number) => (
                        <p key={i} className="text-gray-600">
                          According to {stmt.manufacturer}, if {stmt.drugName} is stored at {stmt.temperature}&deg;C for {stmt.duration} {stmt.durationUnit}, stability is {stmt.stabilityPeriod} {stmt.stabilityUnit}.
                        </p>
                      ))}
                    </div>
                  )}

                  {s.adminComment && (
                    <div className="bg-warning-50 border border-warning-200 rounded-lg p-3 mb-4 text-sm">
                      <p className="font-medium text-warning-700 mb-1">Your previous comment:</p>
                      <p className="text-warning-800">{s.adminComment}</p>
                    </div>
                  )}

                  {s.userResponse && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">
                      <p className="font-medium text-blue-700 mb-1">User Response:</p>
                      <p className="text-blue-800">{s.userResponse}</p>
                    </div>
                  )}

                  {(s.status === 'pending' || s.status === 'awaiting_reply') && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={comment}
                        onChange={(e) => setCommentForm((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        className="input-field text-sm"
                        placeholder="Type a comment to send the user (required for Send Reply / used as reason for Reject)..."
                      />
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleAction(s.id, 'approved')}
                          className="flex items-center gap-1 px-4 py-2 bg-safe-600 text-white rounded-lg text-sm font-medium hover:bg-safe-700"
                        >
                          <CheckCircle size={16} />Approve
                        </button>
                        <button
                          onClick={() => handleAction(s.id, 'rejected')}
                          className="flex items-center gap-1 px-4 py-2 bg-critical-600 text-white rounded-lg text-sm font-medium hover:bg-critical-700"
                        >
                          <XCircle size={16} />Reject
                        </button>
                        <button
                          onClick={() => handleAction(s.id, 'awaiting_reply')}
                          disabled={!hasComment}
                          className="flex items-center gap-1 px-4 py-2 bg-warning-600 text-white rounded-lg text-sm font-medium hover:bg-warning-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          title={!hasComment ? 'Type a comment first' : ''}
                        >
                          <Send size={16} />Send Reply
                        </button>
                      </div>
                      {!hasComment && (
                        <p className="text-xs text-gray-400">Tip: Type a comment above to enable <strong>Send Reply</strong>. The comment will also be used as the reason if you click Reject.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && user?.role === 'true_admin' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Manage Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-gray-600 font-medium">Name</th>
                  <th className="text-left py-3 px-2 text-gray-600 font-medium">Email</th>
                  <th className="text-left py-3 px-2 text-gray-600 font-medium">Working Place</th>
                  <th className="text-left py-3 px-2 text-gray-600 font-medium">Role</th>
                  <th className="text-left py-3 px-2 text-gray-600 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100">
                    <td className="py-3 px-2">{u.fullName}</td>
                    <td className="py-3 px-2 text-gray-600">{u.email}</td>
                    <td className="py-3 px-2 text-gray-600">{u.workingPlace}</td>
                    <td className="py-3 px-2"><span className={`text-xs font-medium px-2 py-1 rounded ${u.role === 'true_admin' ? 'bg-purple-100 text-purple-700' : u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{u.role}</span></td>
                    <td className="py-3 px-2">
                      {u.role === 'user' && (
                        <button onClick={() => handleRoleChange(u.id, 'admin')} className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                          <ArrowUpCircle size={14} />Promote to Admin
                        </button>
                      )}
                      {u.role === 'admin' && (
                        <button onClick={() => handleRoleChange(u.id, 'user')} className="text-xs text-gray-500 hover:underline">
                          Demote to User
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats */}
      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="card text-center">
              <p className="text-2xl font-bold text-primary-700">{value as number}</p>
              <p className="text-sm text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
