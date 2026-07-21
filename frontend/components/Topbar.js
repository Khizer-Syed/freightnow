'use client';
import { useRouter } from 'next/navigation';
import s from './Topbar.module.css';

export default function Topbar({ title }) {
  const router = useRouter();

  return (
    <div className={s.topbar}>
      <div className={s.title}>{title}</div>
      <div className={s.right}>
        <button className={s.btnNewQuote} onClick={() => router.push('/portal/quote')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New quote
        </button>
      </div>
    </div>
  );
}
