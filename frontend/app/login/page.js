'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchAPI, setToken } from '@/lib/api';
import s from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await fetchAPI('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      router.push('/portal');
    } catch (err) {
      const msg = typeof err.error === 'string' ? err.error : err.error?.message || 'Invalid email or password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.wrapper}>
      <div className={s.left}>
        <div className={s.leftLogo}>
          <img src="/logo-white.svg" alt="IFF" />
          <Link href="/" className={s.backHome}>&larr; Back to website</Link>
        </div>
        <div className={s.leftContent}>
          <h2>Ship smarter with <span>IFF</span></h2>
          <p>Compare rates from top carriers, book instantly, and manage all your shipments in one place.</p>
          <div className={s.features}>
            <div className={s.feature}><span className={s.featureCheck}>&#10003;</span>Instant quotes from 5+ carriers</div>
            <div className={s.feature}><span className={s.featureCheck}>&#10003;</span>Book, pay, and print labels online</div>
            <div className={s.feature}><span className={s.featureCheck}>&#10003;</span>Track all shipments in one dashboard</div>
            <div className={s.feature}><span className={s.featureCheck}>&#10003;</span>Volume discounts for frequent shippers</div>
          </div>
        </div>
        <div className={s.leftBottom}>&copy; 2026 IFF. Trusted since 1993.</div>
      </div>

      <div className={s.right}>
        <form className={s.authBox} onSubmit={handleSubmit}>
          <h1>Welcome back</h1>
          <p>Sign in to your IFF account</p>

          {error && <div className={s.error}>{error}</div>}

          <div className="field">
            <label>Email address</label>
            <input
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <div className={s.fieldFooter}><a href="#">Forgot password?</a></div>

          <button type="submit" className={s.btnAuth} disabled={loading}>
            {loading && <span className="spinner" />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className={s.authSwitch}>
            Don&apos;t have an account? <Link href="/register">Create one free</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
