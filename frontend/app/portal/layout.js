'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isLoggedIn } from '@/lib/api';
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
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login');
    }
  }, [router]);

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
