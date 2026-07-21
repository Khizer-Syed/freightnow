'use client';
import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import s from './page.module.css';

export default function ProfilePage() {
  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [company, setCompany] = useState({ name: '', country: 'CA', province: '', city: '', postalCode: '' });
  const [password, setPassword] = useState({ current: '', newPass: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

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
  }, []);

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
