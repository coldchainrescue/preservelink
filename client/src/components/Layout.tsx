import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useState, useEffect } from 'react';
import { Bell, LogOut, Menu, X, Search, PlusCircle, LayoutDashboard, Shield, Settings, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useServerEvents } from '../hooks/useServerEvents';

export default function Layout() {
  const { user, logout, setUser } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [serverTime, setServerTime] = useState(new Date());

  // Live push events: new users, contributions approved/rejected, role changes
  useServerEvents();

  const isVerified = user?.verificationStatus === 'verified';
  const isPendingVerification = user?.verificationStatus === 'pending_verification';

  useEffect(() => {
    const timer = setInterval(() => setServerTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get('/notifications');
        setUnreadCount(data.unreadCount);
      } catch {}
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // FIX: Refresh user silently on navigation — NEVER logout on failure.
  // Render's free tier cold-starts slowly; a failed /auth/me is not a logout.
  useEffect(() => {
    api.get('/auth/me')
      .then(({ data }) => {
        if (data && data.id) setUser(data);
      })
      .catch(() => {
        // Silently ignore — token still valid, just a background refresh
      });
  }, [location.pathname, setUser]);

  useEffect(() => {
    api.post('/analytics/track', { eventType: 'page_view', metadata: { path: location.pathname } }).catch(() => {});
  }, [location.pathname]);

  const canContribute = isVerified || user?.role === 'admin' || user?.role === 'true_admin';

  const navItems = [
    { path: '/search', label: 'Search', icon: Search },
    ...(canContribute ? [{ path: '/contribute', label: 'Contribute', icon: PlusCircle }] : []),
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(user?.role === 'admin' || user?.role === 'true_admin'
      ? [{ path: '/admin', label: 'Admin', icon: Shield }]
      : []),
    ...(user?.role === 'true_admin'
      ? [{ path: '/cms', label: 'CMS Editor', icon: Settings }]
      : []),
  ];

  const displayName = user?.role === 'admin'
    ? `${user.fullName.split(' ')[0]} (Admin)`
    : user?.role === 'true_admin'
      ? `${user.fullName.split(' ')[0]} (True Admin)`
      : user?.fullName.split(' ')[0];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/search" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">PL</span>
              </div>
              <span className="font-bold text-xl text-primary-800 hidden sm:block">PreserveLink</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard?tab=notifications')}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-critical-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <span className="text-sm text-gray-600 hidden lg:block">{displayName}</span>

              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-critical-600 hover:bg-critical-50 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-600"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <nav className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {isPendingVerification && (
        <div className="bg-warning-50 border-b border-warning-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
            <div className="flex items-start gap-2 text-sm text-warning-800">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <p>
                <strong>Your account is pending administrator verification.</strong>{' '}
                You can search the catalogue, but the contribution feature will be unlocked once an admin verifies your APC.
              </p>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-gray-900 text-gray-400 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm space-y-1">
          <p className="text-gray-300">
            Copyright 2026 &copy; Government of Malaysia, Ministry of Health, Pharmaceutical Services Programme.
          </p>
          <p>Developed by: Hanisah (RPh. 025963)</p>
          <p>Server Time: {serverTime.toLocaleString('en-MY', { dateStyle: 'full', timeStyle: 'medium' })}</p>
        </div>
      </footer>
    </div>
  );
}
