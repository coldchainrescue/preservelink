import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

// Called once in Layout.tsx — opens a live SSE connection to the backend.
// Whenever the server broadcasts an event, the right person sees a toast
// and their UI updates automatically without a page refresh.

export function useServerEvents() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const url = `https://preservelink-backend.onrender.com/api/events/stream?token=${accessToken}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'NEW_USER') {
          toast(`New registration: ${data.fullName}`, { icon: '👤' });
        }

        if (data.type === 'NEW_CONTRIBUTION') {
          toast(`New contribution submitted: ${data.genericName}`, { icon: '📋' });
        }

        if (data.type === 'CONTRIBUTION_UPDATED') {
          const msg = data.status === 'approved'
            ? `✅ Your contribution for ${data.genericName} has been approved!`
            : data.status === 'rejected'
              ? `❌ Your contribution for ${data.genericName} was not approved.`
              : `📝 Update on your contribution: ${data.genericName}`;
          toast(msg, { duration: 6000 });
        }

        if (data.type === 'ROLE_CHANGED') {
          toast(`Your account has been updated. Reloading...`, { icon: '🔄', duration: 3000 });
          setTimeout(() => window.location.reload(), 2000);
        }
      } catch {}
    };

    es.onerror = () => {
      // EventSource auto-reconnects — just close cleanly on error
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [isAuthenticated, accessToken]);
}
