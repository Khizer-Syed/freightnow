'use client';
import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import s from './page.module.css';

const DEMO_INVOICES = [
  { id: 'INV-2026-0052', date: 'May 25, 2026', amount: 'C$312.40', shipments: 1, status: 'pending' },
  { id: 'INV-2026-0051', date: 'May 20, 2026', amount: 'C$456.95', shipments: 2, status: 'paid' },
  { id: 'INV-2026-0050', date: 'May 15, 2026', amount: 'C$228.75', shipments: 1, status: 'paid' },
  { id: 'INV-2026-0049', date: 'May 8, 2026', amount: 'C$185.60', shipments: 1, status: 'paid' },
  { id: 'INV-2026-0048', date: 'Apr 30, 2026', amount: 'C$1,241.50', shipments: 4, status: 'paid' },
];

const DEMO_PAYMENTS = [
  { id: 1, type: 'Visa', last4: '4242', expiry: '08/27', isDefault: true },
  { id: 2, type: 'Mastercard', last4: '8821', expiry: '11/26', isDefault: false },
];

export default function BillingPage() {
  const [invoices, setInvoices] = useState(DEMO_INVOICES);
  const [payments, setPayments] = useState(DEMO_PAYMENTS);
  const [stats, setStats] = useState({ totalSpent: 4218, monthSpent: 1183, outstanding: 312 });

  useEffect(() => {
    async function load() {
      try {
        const [invoiceData, paymentData, statsData] = await Promise.all([
          fetchAPI('/api/billing/invoices').catch(() => null),
          fetchAPI('/api/billing/payment-methods').catch(() => null),
          fetchAPI('/api/billing/stats').catch(() => null),
        ]);
        if (invoiceData?.invoices) setInvoices(invoiceData.invoices);
        if (paymentData?.paymentMethods) setPayments(paymentData.paymentMethods);
        if (statsData) setStats(statsData);
      } catch {}
    }
    load();
  }, []);

  function getBadgeClass(status) {
    if (status === 'paid') return s.badgePaid;
    if (status === 'pending') return s.badgePending;
    return s.badgeOverdue;
  }

  return (
    <>
      {/* Stats */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statLabel}>Total spent (all time)</div>
          <div className={s.statValue}>C${stats.totalSpent?.toLocaleString()}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>This month</div>
          <div className={s.statValue}>C${stats.monthSpent?.toLocaleString()}</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Outstanding</div>
          <div className={s.statValue}>C${stats.outstanding?.toLocaleString()}</div>
        </div>
      </div>

      {/* Payment methods */}
      <div className="section-card">
        <div className={s.sectionTitle}>Payment methods</div>
        <div className={s.paymentCards}>
          {payments.map(pm => (
            <div key={pm.id} className={`${s.paymentCard} ${pm.isDefault ? s.default : ''}`}>
              <div className={s.cardType}>{pm.type}</div>
              <div className={s.cardNumber}>•••• •••• •••• {pm.last4}</div>
              <div className={s.cardExpiry}>Expires {pm.expiry}</div>
              {pm.isDefault && <div className={s.defaultBadge}>Default</div>}
            </div>
          ))}
        </div>
        <button className={s.btnAdd}>+ Add payment method</button>
      </div>

      {/* Invoices */}
      <div className="section-card">
        <div className={s.sectionTitle}>Invoices</div>
        <div className={s.tableWrap}>
          <table>
            <thead><tr><th>Invoice #</th><th>Date</th><th>Amount</th><th>Shipments</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={i}>
                  <td>{inv.id}</td>
                  <td>{inv.date}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{inv.amount}</td>
                  <td>{inv.shipments}</td>
                  <td><span className={`${s.badge} ${getBadgeClass(inv.status)}`}>{inv.status}</span></td>
                  <td><button className={s.btnDownload}>Download PDF</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
