'use client';
import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { fetchAPI } from '@/lib/api';

// The user's app role (customer / company_admin / iff_staff / iff_admin) lives on our own
// User record, not in the Auth0 profile — read it from /api/profile. Purely for showing or
// hiding UI; every admin endpoint enforces the role server-side regardless.
export default function useRole() {
  const { isAuthenticated } = useAuth0();
  const [role, setRole] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    fetchAPI('/api/profile')
      .then(p => { if (!cancelled) setRole(p?.role || null); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  return { role, loaded };
}
