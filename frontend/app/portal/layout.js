'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import s from './layout.module.css';

const PAGE_TITLES = {
  '/portal': 'Dashboard',
  '/portal/quote': 'Get a Quote',
  '/portal/shipments': 'My Shipments',
  '/portal/track': 'Track Shipment',
  '/portal/claims': 'Claims',
  '/portal/profile': 'Profile',
  '/portal/billing': 'Billing',
};

export default function PortalLayout({ children }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect();
    }
  }, [isLoading, isAuthenticated, loginWithRedirect]);

  if (isLoading || !isAuthenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  const title = PAGE_TITLES[pathname] || 'Portal';

  return (
    <div className={s.wrapper}>
      <Sidebar />
      <div className={s.main}>
        <Topbar title={title} />
        <div className={s.pageContent}>
          {children}
        </div>
      </div>
    </div>
  );
}
