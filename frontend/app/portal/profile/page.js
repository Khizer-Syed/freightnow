'use client';
import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import { FEDEX_DISCLAIMER } from '@/lib/fedexCompliance';
import FedexConnectModal from '@/components/FedexConnectModal';
import FedexLogo from '@/components/FedexLogo';
import s from './page.module.css';

export default function ProfilePage() {
  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [company, setCompany] = useState({ name: '', country: 'CA', province: '', city: '', postalCode: '' });
  const [password, setPassword] = useState({ current: '', newPass: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [fedexConnections, setFedexConnections] = useState([]);
  const [showFedexModal, setShowFedexModal] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAPI('/api/profile');
        if (data.user) {
          setProfile({ firstName: data.user.firstName || '', lastName: data.user.lastName || '', email: data.user.email || '', phone: data.user.phone || '' });
          if (data.user.company) setCompany(data.user.company);
        }
      } catch {}
    }
    load();
    loadFedexConnections();
  }, []);

  async function loadFedexConnections() {
    try {
      const data = await fetchAPI('/api/fedex-account');
      setFedexConnections(data.connections || []);
    } catch {}
  }

  async function handleDisconnectFedex(id) {
    try {
      await fetchAPI(`/api/fedex-account/${id}`, { method: 'DELETE' });
      loadFedexConnections();
    } catch {}
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    try {
      await fetchAPI('/api/profile', { method: 'PUT', body: JSON.stringify(profile) });
      setSuccess('Profile updated successfully.');
    } catch {}
    setSaving(false);
  }

  async function handleSaveCompany(e) {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    try {
      await fetchAPI('/api/profile/company', { method: 'PUT', body: JSON.stringify(company) });
      setSuccess('Company info updated.');
    } catch {}
    setSaving(false);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (password.newPass !== password.confirm) { alert('Passwords do not match.'); return; }
    setSaving(true);
    setSuccess('');
    try {
      await fetchAPI('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: password.current, newPassword: password.newPass }) });
      setSuccess('Password changed.');
      setPassword({ current: '', newPass: '', confirm: '' });
    } catch {}
    setSaving(false);
  }

  return (
    <>
      {success && <div className={s.success}>{success}</div>}

      <div className="section-card">
        <div className={s.sectionTitle}>Personal Information</div>
        <form onSubmit={handleSaveProfile}>
          <div className="grid2">
            <div className="field"><label>First name</label><input value={profile.firstName} onChange={e => setProfile({ ...profile, firstName: e.target.value })} /></div>
            <div className="field"><label>Last name</label><input value={profile.lastName} onChange={e => setProfile({ ...profile, lastName: e.target.value })} /></div>
          </div>
          <div className="grid2">
            <div className="field"><label>Email</label><input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} /></div>
            <div className="field"><label>Phone</label><input type="tel" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></div>
          </div>
          <button type="submit" className={s.btnSave} disabled={saving}>Save changes</button>
        </form>
      </div>

      <div className="section-card">
        <div className={s.sectionTitle}>Company</div>
        <form onSubmit={handleSaveCompany}>
          <div className="field"><label>Company name</label><input value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} /></div>
          <div className="grid2">
            <div className="field"><label>Country</label>
              <select value={company.country} onChange={e => setCompany({ ...company, country: e.target.value })}>
                <option value="CA">Canada</option><option value="US">United States</option>
              </select>
            </div>
            <div className="field"><label>Province / State</label><input value={company.province} onChange={e => setCompany({ ...company, province: e.target.value })} /></div>
          </div>
          <div className="grid2">
            <div className="field"><label>City</label><input value={company.city} onChange={e => setCompany({ ...company, city: e.target.value })} /></div>
            <div className="field"><label>Postal code</label><input value={company.postalCode} onChange={e => setCompany({ ...company, postalCode: e.target.value })} /></div>
          </div>
          <button type="submit" className={s.btnSave} disabled={saving}>Save company info</button>
        </form>
      </div>

      <div className="section-card">
        <div className={s.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FedexLogo height={16} />
          FedEx Shipping
        </div>
        {fedexConnections.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>
            FedEx requires all users shipping through FedEx services to review and accept the FedEx End
            User License Agreement and verify their identity before their first FedEx shipment.
          </p>
        )}
        {fedexConnections.map(conn => (
          <div key={conn.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>FedEx account ending in {conn.fedexAccountNumber.slice(-4)}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {conn.status === 'verified' && 'Active'}
                {conn.status === 'awaiting_factor2' && 'Verification pending'}
                {conn.status === 'locked' && 'Locked — too many failed attempts'}
              </div>
            </div>
            <button type="button" className={s.btnDanger} style={{ marginTop: 0 }} onClick={() => handleDisconnectFedex(conn.id)}>Disconnect</button>
          </div>
        ))}
        <button type="button" className={s.btnSave} style={{ marginTop: fedexConnections.length ? 16 : 0 }} onClick={() => setShowFedexModal(true)}>
          Activate FedEx Shipping
        </button>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12 }}>{FEDEX_DISCLAIMER}</div>
      </div>

      {showFedexModal && (
        <FedexConnectModal onClose={() => setShowFedexModal(false)} onConnected={loadFedexConnections} />
      )}

      <div className="section-card">
        <div className={s.sectionTitle}>Change Password</div>
        <form onSubmit={handleChangePassword}>
          <div className="field"><label>Current password</label><input type="password" value={password.current} onChange={e => setPassword({ ...password, current: e.target.value })} required /></div>
          <div className="grid2">
            <div className="field"><label>New password</label><input type="password" value={password.newPass} onChange={e => setPassword({ ...password, newPass: e.target.value })} required /></div>
            <div className="field"><label>Confirm new password</label><input type="password" value={password.confirm} onChange={e => setPassword({ ...password, confirm: e.target.value })} required /></div>
          </div>
          <button type="submit" className={s.btnSave} disabled={saving}>Update password</button>
        </form>
      </div>
    </>
  );
}
