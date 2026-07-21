'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { removeToken } from '@/lib/api';
import s from './Sidebar.module.css';

const NAV_ITEMS = [
  { section: 'Main' },
  { href: '/portal/quote', label: 'Get a quote', icon: 'search' },
  { href: '/portal', label: 'Dashboard', icon: 'dashboard' },
  { href: '/portal/shipments', label: 'My shipments', icon: 'truck' },
  { href: '/portal/track', label: 'Track shipment', icon: 'pin' },
  { href: '/portal/claims', label: 'Claims', icon: 'file' },
  { section: 'Account' },
  { href: '/portal/profile', label: 'Profile', icon: 'user' },
  { href: '/portal/billing', label: 'Billing', icon: 'card' },
  { href: '/', label: 'Back to website', icon: 'home' },
];

const ICONS = {
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  truck: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  pin: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  file: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  user: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  card: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  home: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  logout: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleSignOut() {
    removeToken();
    router.push('/login');
  }

  function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase();
  }

  // TODO: replace with real user data from context
  const user = { name: 'John Smith', email: 'john@acmecorp.com' };

  return (
    <aside className={s.sidebar}>
      <div className={s.logo}>
        <Link href="/">
          <img src="/logo-white.svg" alt="IFF" />
        </Link>
      </div>

      <div className={s.user}>
        <div className={s.avatar}>{getInitials(user.name)}</div>
        <div className={s.name}>{user.name}</div>
        <div className={s.email}>{user.email}</div>
      </div>

      <nav className={s.nav}>
        {NAV_ITEMS.map((item, i) => {
          if (item.section) {
            return <div key={i} className={s.section}>{item.section}</div>;
          }
          const isActive = item.href === '/portal'
            ? pathname === '/portal'
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${s.item} ${isActive ? s.active : ''}`}
            >
              {ICONS[item.icon]}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={s.bottom}>
        <button onClick={handleSignOut} className={s.item} style={{ border: 'none', background: 'none', width: '100%' }}>
          {ICONS.logout}
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
