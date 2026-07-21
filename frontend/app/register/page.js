'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchAPI, setToken } from '@/lib/api';
import s from './page.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1 fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');

  // Step 2 fields
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState('CA');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [postal, setPostal] = useState('');
  const [shipType, setShipType] = useState('Courier / Small packages');

  // Step 3 fields
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeFedex, setAgreeFedex] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);

  function goStep(n) {
    setError('');
    if (n === 2 && step === 1) {
      if (!firstName || !lastName || !email || !password) {
        setError('Please fill in all required fields.');
        return;
      }
      if (password !== password2) {
        setError('Passwords do not match.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
    }
    setStep(n);
  }

  async function handleRegister() {
    if (!agreeTerms || !agreeFedex || !agreeAge) {
      setError('Please accept all agreements to continue.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await fetchAPI('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          password,
          company: { name: company, country, province, city, postalCode: postal, shippingType: shipType },
        }),
      });
      setToken(data.token);
      setStep(4); // success
    } catch (err) {
      const msg = typeof err.error === 'string' ? err.error : err.error?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function stepClass(n) {
    if (n < step) return `${s.step} ${s.stepDone}`;
    if (n === step) return `${s.step} ${s.stepActive}`;
    return s.step;
  }

  return (
    <div className={s.wrapper}>
      <div className={s.left}>
        <div className={s.leftLogo}>
          <img src="/logo-white.svg" alt="IFF" />
          <Link href="/" className={s.backHome}>&larr; Back to website</Link>
        </div>
        <div className={s.leftContent}>
          <h2>Start shipping smarter with <span>IFF</span></h2>
          <p>Free account. No monthly fees. Pay only for the shipments you book.</p>
          <div className={s.tierCards}>
            <div className={s.tierCard}><h4>Standard account — Free</h4><p>Instant quotes, online booking, label printing, shipment tracking</p></div>
            <div className={s.tierCard}><h4>Volume discounts</h4><p>Ship regularly? Contact us for custom pricing and dedicated support</p></div>
            <div className={s.tierCard}><h4>All carriers included</h4><p>FedEx, XPO, Day &amp; Ross, Manitoulin, Polaris and more</p></div>
          </div>
        </div>
        <div className={s.leftBottom}>&copy; 2026 IFF. Trusted since 1993.</div>
      </div>

      <div className={s.right}>
        <div className={s.authBox}>
          <h1>Create your account</h1>
          <p>Free to join &middot; No credit card required to get quotes</p>

          {step < 4 && (
            <div className={s.stepIndicator}>
              <div className={stepClass(1)}><div className={s.stepNum}>1</div><span className={s.stepLabel}>Your info</span></div>
              <div className={s.stepDivider} />
              <div className={stepClass(2)}><div className={s.stepNum}>2</div><span className={s.stepLabel}>Company</span></div>
              <div className={s.stepDivider} />
              <div className={stepClass(3)}><div className={s.stepNum}>3</div><span className={s.stepLabel}>Agreement</span></div>
            </div>
          )}

          {error && <div className={s.error}>{error}</div>}

          {/* Step 1 */}
          {step === 1 && (
            <div>
              <div className="grid2">
                <div className="field"><label>First name</label><input placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
                <div className="field"><label>Last name</label><input placeholder="Smith" value={lastName} onChange={e => setLastName(e.target.value)} /></div>
              </div>
              <div className="field"><label>Email address</label><input type="email" placeholder="john@company.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div className="field"><label>Phone number</label><input type="tel" placeholder="416 555 0100" value={phone} onChange={e => setPhone(e.target.value)} /></div>
              <div className="field"><label>Password</label><input type="password" placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} /></div>
              <div className="field"><label>Confirm password</label><input type="password" placeholder="Repeat password" value={password2} onChange={e => setPassword2(e.target.value)} /></div>
              <button className={s.btnAuth} onClick={() => goStep(2)}>Continue &rarr;</button>
              <div className={s.authSwitch}>Already have an account? <Link href="/login">Sign in</Link></div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div>
              <div className="field"><label>Company name</label><input placeholder="Acme Corp" value={company} onChange={e => setCompany(e.target.value)} /></div>
              <div className="grid2">
                <div className="field"><label>Country</label>
                  <select value={country} onChange={e => setCountry(e.target.value)}>
                    <option value="CA">Canada</option>
                    <option value="US">United States</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="field"><label>Province / State</label><input placeholder="Ontario" value={province} onChange={e => setProvince(e.target.value)} /></div>
              </div>
              <div className="field"><label>City</label><input placeholder="Toronto" value={city} onChange={e => setCity(e.target.value)} /></div>
              <div className="field"><label>Postal / ZIP code</label><input placeholder="M5V 3A8" value={postal} onChange={e => setPostal(e.target.value)} /></div>
              <div className="field"><label>Primary shipping type</label>
                <select value={shipType} onChange={e => setShipType(e.target.value)}>
                  <option>Courier / Small packages</option>
                  <option>LTL Freight</option>
                  <option>FTL Trucking</option>
                  <option>Mixed / Multiple types</option>
                </select>
              </div>
              <button className={s.btnBack} onClick={() => goStep(1)}>&larr; Back</button>
              <button className={s.btnAuth} onClick={() => goStep(3)}>Continue &rarr;</button>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '14px', lineHeight: '1.6' }}>
                Please review and accept the following agreements to complete your registration.
              </p>
              <div className={s.eulaBox}>
                <h4>IFF Terms of Use</h4>
                <p>By creating an account with IFF, you agree to our terms of service. Rates displayed are estimates based on information provided and may vary based on actual shipment characteristics. IFF acts as a freight broker and is not liable for carrier delays, loss, or damage beyond the limits set out in our insurance and liability policy.</p>
                <br />
                <h4>FedEx Terms — End User License Agreement</h4>
                <p>Access to FedEx shipping services through IFF Cargo is subject to FedEx&apos;s terms and conditions. By using FedEx services through this platform, you acknowledge that FedEx rates, services, and service areas are subject to change.</p>
                <br />
                <h4>Privacy Policy</h4>
                <p>IFF collects and uses your personal and company information to process shipments, provide quotes, and improve our services. We do not sell your information to third parties.</p>
              </div>
              <div className={s.checkboxRow}>
                <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} />
                <label>I have read and agree to the IFF Cargo <strong>Terms of Use</strong> and <strong>Privacy Policy</strong></label>
              </div>
              <div className={s.checkboxRow}>
                <input type="checkbox" checked={agreeFedex} onChange={e => setAgreeFedex(e.target.checked)} />
                <label>I acknowledge and accept the <strong>FedEx End User License Agreement</strong></label>
              </div>
              <div className={s.checkboxRow}>
                <input type="checkbox" checked={agreeAge} onChange={e => setAgreeAge(e.target.checked)} />
                <label>I confirm I am 18 years of age or older and authorized to create this account</label>
              </div>
              <button className={s.btnBack} onClick={() => goStep(2)}>&larr; Back</button>
              <button className={s.btnAuth} onClick={handleRegister} disabled={loading}>
                {loading && <span className="spinner" />}
                {loading ? 'Creating account…' : 'Create my account'}
              </button>
            </div>
          )}

          {/* Success */}
          {step === 4 && (
            <div className={s.successState}>
              <div className={s.successIcon}>&#10003;</div>
              <h2>Account created!</h2>
              <p>Welcome to IFF Cargo. You can now get instant quotes and book shipments online.</p>
              <button className={s.btnAuth} onClick={() => router.push('/portal')}>Go to my dashboard &rarr;</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
