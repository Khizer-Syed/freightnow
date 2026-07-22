'use client';
import { useState } from 'react';

// Renders the official FedEx logo. Drop the approved asset (from
// https://brand.fedex.com/portals/fedex-external) at /public/carrier-logos/fedex.svg.
// Until that file exists, this falls back to plain text so the UI never breaks
// or shows a broken-image icon.
export default function FedexLogo({ height = 20, className }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className={className} style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: Math.round(height * 0.7), color: 'var(--navy)' }}>
        FedEx
      </span>
    );
  }

  return (
    <img
      src="/carrier-logos/fedex.svg"
      alt="FedEx"
      className={className}
      style={{ height, width: 'auto', maxWidth: '100%' }}
      onError={() => setFailed(true)}
    />
  );
}
