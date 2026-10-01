const CarrierAdapter = require('./CarrierAdapter');
const { addBusinessDays, formatDate } = require('../utils/dateHelpers');
const xpoApi = require('../services/xpoApi.service');

// XPO LTL — rating and tracking are live via XPO's LTL APIs (see services/xpoApi.service.js).
// Booking is not integrated: XPO's BOL/pickup APIs haven't been set up for this account yet,
// so bookShipment() says so rather than pretending a shipment was tendered.
class XPOAdapter extends CarrierAdapter {
  get id() { return 'xpo'; }
  get name() { return 'XPO Logistics'; }
  get isLive() { return xpoApi.isConfigured(); }

  // ─── getRates ─────────────────────────────────────────────────

  async getRates(params) {
    if (params.shipmentType !== 'ltl') return [];
    if (!this.isLive) return [];

    try {
      return await this._getLiveRates(params);
    } catch (err) {
      console.error('[XPO-RATE] Live rates failed:', err.message);
      return [];
    }
  }

  async _getLiveRates(params) {
    const { origin, destination, weight, pieces, dimensions, freightClass, pickupDate } = params;
    const count = pieces || 1;

    const body = {
      shipmentInfo: {
        paymentTermCd: 'P', // prepaid, billed to IFF's Bill-To account below
        accessorials: [],
        commodity: [{
          grossWeight: { weight, weightUom: 'LBS' },
          nmfcClass: freightClass ? String(freightClass) : '70',
          hazmatInd: false,
          pieceCnt: count,
          dimensions: {
            length: Math.round(dimensions?.length || 48),
            width: Math.round(dimensions?.width || 40),
            height: Math.round(dimensions?.height || 40),
            dimensionsUom: 'INCH',
          },
        }],
        shipper: { address: { postalCd: this._postal(origin) } },
        consignee: { address: { postalCd: this._postal(destination) } },
        // Only one party may carry an account number per request — XPO rejects a shipper
        // account and a bill-to account together, so origin stays address-only.
        bill2Party: { acctInstId: process.env.XPO_BILL_ACCOUNT },
        shipmentDate: `${this._shipDate(pickupDate)}T12:00:00.000-0500`,
        palletCnt: count,
        linealFt: 0,
      },
    };

    const data = await xpoApi.rateQuote(body);
    return this._parseRateResponse(data, pickupDate);
  }

  // XPO wants Canadian postal codes without the space and US ZIPs as 5 digits.
  _postal(loc) {
    const raw = String(loc?.postalCode || '').replace(/\s+/g, '').toUpperCase();
    return loc?.country === 'US' ? raw.slice(0, 5) : raw;
  }

  // XPO rates for the requested pickup date; fall back to the next business day when none
  // is given or it's already in the past.
  _shipDate(pickupDate) {
    const today = new Date().toISOString().split('T')[0];
    if (pickupDate && pickupDate >= today) return pickupDate;
    return formatDate(addBusinessDays(new Date(), 1));
  }

  _parseRateResponse(data, pickupDate) {
    const rq = data?.data?.rateQuote;
    const charge = rq?.totCharge?.[0];
    const amount = parseFloat(charge?.amt);
    if (!amount) return [];

    const transit = data.data.transitTime || {};
    const transitDays = Number(transit.transitDays) || 5;
    const baseDate = pickupDate ? new Date(`${pickupDate}T12:00:00`) : new Date();
    const deliveryDate = transit.estdDlvrDate
      ? new Date(transit.estdDlvrDate).toISOString().split('T')[0]
      : formatDate(addBusinessDays(baseDate, transitDays));

    return [{
      serviceName: 'LTL Standard',
      serviceCode: rq.confirmationNbr || null,
      rate: Math.round(amount * 100) / 100,
      // XPO quotes in USD; rate.service converts to the quote's currency before pricing.
      currency: charge.currencyCd || 'USD',
      transitDays,
      deliveryDate,
      isLive: true,
      quoteReference: rq.confirmationNbr || null,
    }];
  }

  // ─── getTracking ──────────────────────────────────────────────

  async getTracking(trackingNumber) {
    if (!this.isLive) throw new Error('XPO tracking is not available (no live credentials configured)');

    const [statusRes, eventsRes] = await Promise.all([
      xpoApi.getShipmentStatus(trackingNumber),
      xpoApi.listTrackingEvents(trackingNumber).catch((err) => {
        console.error('[XPO-TRACK] Event history failed:', err.message);
        return null;
      }),
    ]);

    const record = statusRes?.data?.shipmentStatusDtls?.[0];
    if (!record) throw new Error('No XPO tracking record found for this PRO number');

    const status = record.shipmentStatus || {};
    const toDate = ms => (ms ? new Date(ms).toISOString() : null);
    const events = (eventsRes?.data?.shipmentTrackingEvent || []).map((e) => {
      const hdr = e.eventHdr || e.evtHdr || {};
      const loc = e.eventOccrdLoc || {};
      return {
        event: hdr.eventDesc || hdr.evtDesc || '',
        location: [loc.cityName, loc.stateCd].filter(Boolean).join(', '),
        timestamp: toDate(hdr.eventTmst || hdr.evtTmst),
        description: hdr.eventDesc || hdr.evtDesc || '',
      };
    });

    return {
      status: this._mapStatus(status.statusCd),
      estimatedDelivery: toDate(record.estdDlvrDate),
      actualDelivery: toDate(record.finalDlvrDate),
      shipDate: toDate(record.pkupDate),
      latestStatus: (status.description || status.reason || '').trim(),
      service: 'XPO LTL',
      weight: record.totWeight?.weight || null,
      pieces: record.totPiecesCnt || null,
      events,
      rawResponse: { status: statusRes, events: eventsRes },
    };
  }

  // Status codes from the XPO Shipment Tracking guide, appendix 6.1.
  _mapStatus(code) {
    const c = String(code || '');
    if (['23', '20', '28'].includes(c)) return 'delivered'; // delivered / part short / pending review
    if (['32', '26', ''].includes(c)) return 'pending';     // only recorded, or cancelled
    return 'in_transit';
  }

  // ─── bookShipment ─────────────────────────────────────────────

  async bookShipment() {
    throw new Error('XPO booking is not available yet (BOL/pickup API not integrated)');
  }
}

module.exports = new XPOAdapter();
