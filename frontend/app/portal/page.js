'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchAPI } from '@/lib/api';
import s from './page.module.css';

export default function DashboardPage() {
  const [stats, setStats] = useState({ shipmentsThisMonth: 12, totalSpent: 4218, inTransit: 3, saved: 681 });
  const [shipments, setShipments] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, shipmentsData] = await Promise.all([
          fetchAPI('/api/billing/stats').catch(() => null),
          fetchAPI('/api/shipments?limit=5').catch(() => null),
        ]);
        if (statsData) setStats(statsData);
        if (shipmentsData?.shipments) setShipments(shipmentsData.shipments);
      } catch {}
    }
    loadData();
  }, []);

  function getStatusClass(status) {
    if (status === 'delivered') return s.statusDelivered;
    if (status === 'in_transit') return s.statusTransit;
    return s.statusPending;
  }

  function getStatusLabel(status) {
    if (status === 'delivered') return '● Delivered';
    if (status === 'in_transit') return '↦ In transit';
    return '○ Pending pickup';
  }

  // Fallback demo data
  const demoShipments = [
    { trackingNumber: '1Z999AA1234567890', route: 'Toronto → Chicago', carrier: 'FedEx Freight', service: 'Freight Economy', date: 'May 20', cost: 'C$312.40', status: 'delivered' },
    { trackingNumber: '7489234572834', route: 'Toronto → New York', carrier: 'XPO Logistics', service: 'Standard LTL', date: 'May 18', cost: 'C$228.75', status: 'delivered' },
    { trackingNumber: '1Z888BB9876543210', route: 'Mississauga → Detroit', carrier: 'Day & Ross', service: 'Freight Priority', date: 'May 22', cost: 'C$185.60', status: 'in_transit' },
    { trackingNumber: 'MAN-2026-00481', route: 'Toronto → Montreal', carrier: 'Manitoulin', service: 'Standard LTL', date: 'May 23', cost: 'C$142.30', status: 'in_transit' },
    { trackingNumber: 'POL-2026-00192', route: 'Brampton → Ottawa', carrier: 'Polaris', service: 'Ground', date: 'May 25', cost: 'C$98.50', status: 'pending' },
  ];

  const displayShipments = shipments.length ? shipments : demoShipments;

  return (
    <>
      {/* Stats */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statLabel}>Shipments this month</div>
          <div className={s.statValue}>{stats.shipmentsThisMonth}</div>
          <div className={`${s.statSub} ${s.statSubUp}`}>&uarr; 3 from last month</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Total spent (CAD)</div>
          <div className={s.statValue}>${stats.totalSpent?.toLocaleString()}</div>
          <div className={s.statSub}>This month</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>In transit</div>
          <div className={s.statValue}>{stats.inTransit}</div>
          <div className={s.statSub}>Active shipments</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>Saved vs list rate</div>
          <div className={s.statValue}>${stats.saved}</div>
          <div className={`${s.statSub} ${s.statSubUp}`}>&uarr; With IFF rates</div>
        </div>
      </div>

      {/* Quick action */}
      <div className={s.quickAction}>
        <div className={s.quickActionInner}>
          <div>
            <div className={s.quickActionTitle}>Ready to ship?</div>
            <div className={s.quickActionSub}>Get instant quotes from all carriers — envelope, parcel, LTL, air, ocean and more.</div>
          </div>
          <Link href="/portal/quote" className={s.quickActionBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            Get a quote
          </Link>
        </div>
      </div>

      {/* Recent shipments */}
      <div className="section-card">
        <div className={s.scHeader}>
          <div>
            <div className={s.scTitle}>Recent shipments</div>
            <div className={s.scSub}>Your last 5 bookings</div>
          </div>
          <Link href="/portal/shipments" className={s.scLink}>View all &rarr;</Link>
        </div>
        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr><th>Tracking #</th><th>Route</th><th>Carrier</th><th>Service</th><th>Date</th><th>Cost</th><th>Status</th></tr>
            </thead>
            <tbody>
              {displayShipments.map((ship, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '12px' }}>{ship.trackingNumber}</td>
                  <td>{ship.route || `${ship.originCity || ''} → ${ship.destinationCity || ''}`}</td>
                  <td>{ship.carrier || ship.carrierName}</td>
                  <td>{ship.service || ship.serviceName}</td>
                  <td>{ship.date || ship.createdAt?.split('T')[0]}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{ship.cost || `C$${ship.totalRate?.toFixed(2)}`}</td>
                  <td><span className={`${s.statusBadge} ${getStatusClass(ship.status)}`}>{getStatusLabel(ship.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
