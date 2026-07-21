'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchAPI } from '@/lib/api';
import s from './page.module.css';

const DEMO_SHIPMENTS = [
  { id: 'IFF-2026-00341', tracking: '1Z999AA1234567890', route: 'Toronto → Chicago', carrier: 'FedEx Freight', type: 'LTL', weight: '500 lbs', booked: 'May 20', delivery: 'May 24', cost: 'C$312.40', status: 'delivered', origin: 'Toronto, ON M5V 3A8', dest: 'Chicago, IL 60601', pieces: '2 pallets', service: 'Freight Economy' },
  { id: 'IFF-2026-00340', tracking: '7489234572834', route: 'Toronto → New York', carrier: 'XPO Logistics', type: 'LTL', weight: '320 lbs', booked: 'May 18', delivery: 'May 22', cost: 'C$228.75', status: 'delivered', origin: 'Toronto, ON M5V 3A8', dest: 'New York, NY 10001', pieces: '1 pallet', service: 'Standard LTL' },
  { id: 'IFF-2026-00339', tracking: '1Z888BB9876543210', route: 'Mississauga → Detroit', carrier: 'Day & Ross', type: 'Parcel', weight: '180 lbs', booked: 'May 22', delivery: 'May 26', cost: 'C$185.60', status: 'in_transit', origin: 'Mississauga, ON L5B 3C2', dest: 'Detroit, MI 48201', pieces: '3 boxes', service: 'Freight Priority' },
  { id: 'IFF-2026-00338', tracking: 'MAN-2026-00481', route: 'Toronto → Montreal', carrier: 'Manitoulin', type: 'LTL', weight: '240 lbs', booked: 'May 23', delivery: 'May 27', cost: 'C$142.30', status: 'in_transit', origin: 'Toronto, ON M5V 3A8', dest: 'Montreal, QC H2Y 1C6', pieces: '2 boxes', service: 'Standard LTL' },
  { id: 'IFF-2026-00337', tracking: 'POL-2026-00192', route: 'Brampton → Ottawa', carrier: 'Polaris', type: 'Parcel', weight: '45 lbs', booked: 'May 25', delivery: 'May 27', cost: 'C$98.50', status: 'pending', origin: 'Brampton, ON L6T 5R3', dest: 'Ottawa, ON K1A 0B1', pieces: '1 box', service: 'Ground' },
  { id: 'IFF-2026-00336', tracking: 'FX-2026-00891', route: 'Toronto → Vancouver', carrier: 'FedEx Freight', type: 'LTL', weight: '780 lbs', booked: 'May 15', delivery: 'May 21', cost: 'C$486.90', status: 'delivered', origin: 'Toronto, ON M5V 3A8', dest: 'Vancouver, BC V6B 1A1', pieces: '4 pallets', service: 'Freight Economy' },
  { id: 'IFF-2026-00335', tracking: 'XPO-2026-00442', route: 'Hamilton → Boston', carrier: 'XPO Logistics', type: 'LTL', weight: '600 lbs', booked: 'May 12', delivery: 'May 16', cost: 'C$345.20', status: 'delivered', origin: 'Hamilton, ON L8P 1A1', dest: 'Boston, MA 02101', pieces: '3 pallets', service: 'Express LTL' },
];

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState(DEMO_SHIPMENTS);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAPI('/api/shipments');
        if (data.shipments?.length) setShipments(data.shipments);
      } catch {}
    }
    load();
  }, []);

  const filtered = shipments.filter(ship => {
    const matchStatus = filter === 'all' || ship.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || ship.tracking?.toLowerCase().includes(q) || ship.carrier?.toLowerCase().includes(q) || ship.route?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  function getBadgeClass(status) {
    if (status === 'delivered') return s.badgeDelivered;
    if (status === 'in_transit') return s.badgeTransit;
    if (status === 'pending') return s.badgePending;
    return s.badgeException;
  }

  function getBadgeLabel(status) {
    if (status === 'delivered') return '● Delivered';
    if (status === 'in_transit') return '↦ In transit';
    if (status === 'pending') return '○ Pending';
    return '! Exception';
  }

  return (
    <div className="section-card">
      <div className={s.filters}>
        {['all', 'in_transit', 'delivered', 'pending'].map(f => (
          <button key={f} className={`${s.filterBtn} ${filter === f ? s.filterBtnActive : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'in_transit' ? 'In transit' : f === 'delivered' ? 'Delivered' : 'Pending'}
          </button>
        ))}
        <input className={s.searchInput} placeholder="Search tracking, carrier, route…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className={s.tableWrap}>
        <table>
          <thead>
            <tr><th>Tracking #</th><th>Route</th><th>Carrier</th><th>Type</th><th>Weight</th><th>Booked</th><th>Delivery</th><th>Cost</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((ship, i) => (
              <>
                <tr key={ship.id || i}>
                  <td>{ship.tracking || ship.trackingNumber}</td>
                  <td>{ship.route}</td>
                  <td>{ship.carrier}</td>
                  <td>{ship.type}</td>
                  <td>{ship.weight}</td>
                  <td>{ship.booked}</td>
                  <td>{ship.delivery}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{ship.cost}</td>
                  <td><span className={`${s.badge} ${getBadgeClass(ship.status)}`}>{getBadgeLabel(ship.status)}</span></td>
                  <td><button className={s.btnAction} onClick={() => setExpandedRow(expandedRow === i ? null : i)}>Details</button></td>
                </tr>
                {expandedRow === i && (
                  <tr key={`detail-${i}`} className={s.detailRow}>
                    <td colSpan="10">
                      <div className={s.detailInner}>
                        <div><div className={s.detailLabel}>Origin</div><div className={s.detailValue}>{ship.origin}</div></div>
                        <div><div className={s.detailLabel}>Destination</div><div className={s.detailValue}>{ship.dest}</div></div>
                        <div><div className={s.detailLabel}>Pieces</div><div className={s.detailValue}>{ship.pieces}</div><div className={s.detailSub}>{ship.weight}</div></div>
                        <div><div className={s.detailLabel}>Service</div><div className={s.detailValue}>{ship.service}</div><div className={s.detailSub}>{ship.carrier}</div></div>
                        <div><div className={s.detailLabel}>Cost</div><div className={s.detailValue}>{ship.cost}</div></div>
                        <div><div className={s.detailLabel}>Booked</div><div className={s.detailValue}>{ship.booked}</div></div>
                        <div><div className={s.detailLabel}>Est. delivery</div><div className={s.detailValue}>{ship.delivery}</div></div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                          <Link href={`/portal/track?id=${encodeURIComponent(ship.tracking)}`} className={s.btnTrack}>Track &rarr;</Link>
                          <button className={s.btnDownload}>Download BOL</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
