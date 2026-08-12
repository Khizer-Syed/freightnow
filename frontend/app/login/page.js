'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchAPI, setToken } from '@/lib/api';
import s from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  function extractError(err, fallback) {
    return typeof err.error === 'string' ? err.error : err.error?.message || fallback;
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await fetchAPI('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data.twoFactorRequired) {
        setPendingToken(data.pendingToken);
        setStep('otp');
      } else {
        setToken(data.token);
        router.push('/portal');
      }
    } catch (err) {
      if (err instanceof TypeError || err.message === 'Failed to fetch') {
        setError('Cannot reach the server. Make sure the backend is running on port 4000.');
      } else {
        setError(extractError(err, 'Invalid email or password'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await fetchAPI('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ pendingToken, code }),
      });
      setToken(data.token);
      router.push('/portal');
    } catch (err) {
      if (err instanceof TypeError || err.message === 'Failed to fetch') {
        setError('Cannot reach the server. Make sure the backend is running on port 4000.');
      } else {
        setError(extractError(err, "That code didn't work. Please try again."));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    setResent(false);
    try {
      await fetchAPI('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ pendingToken }),
      });
      setCode('');
      setResent(true);
    } catch (err) {
      setError(extractError(err, 'Could not resend code.'));
    }
  }

  function handleBack() {
    setStep('password');
    setCode('');
    setError('');
    setResent(false);
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
        {step === 'password' && (
          <form className={s.authBox} onSubmit={handlePasswordSubmit}>
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
        )}

        {step === 'otp' && (
          <form className={s.authBox} onSubmit={handleOtpSubmit}>
            <h1>Verify it&apos;s you</h1>
            <p>Enter the 6-digit code we sent to {email}</p>

            {error && <div className={s.error}>{error}</div>}
            {resent && <div className={s.success}>A new code has been sent.</div>}

            <div className="field">
              <label>Verification code</label>
              <input
                className={s.otpInput}
                inputMode="numeric"
                placeholder="000000"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                autoFocus
                required
              />
            </div>
            <div className={s.fieldFooter}><a href="#" onClick={e => { e.preventDefault(); handleResend(); }}>Resend code</a></div>

            <button type="submit" className={s.btnAuth} disabled={loading || code.length !== 6}>
              {loading && <span className="spinner" />}
              {loading ? 'Verifying…' : 'Verify and sign in'}
            </button>

            <div className={s.authSwitch}>
              <a href="#" onClick={e => { e.preventDefault(); handleBack(); }}>&larr; Back to sign in</a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
