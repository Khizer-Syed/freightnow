# FedEx Integration Requirements

This document summarizes the FedEx Integrator requirements provided by FedEx.

---

## Mandatory Requirements

### FedEx EULA

The application must:

- Display the entire FedEx EULA.
- Require users to scroll through the EULA.
- Require acknowledgement that it has been read.
- Require explicit acceptance.

Example flow:

```text
Display FedEx EULA
        |
        v
Scroll Through Agreement
        |
        v
Check Confirmation Box
        |
        v
Accept FedEx EULA
```

A hyperlink to the EULA is NOT sufficient.

---

## Account Registration

FedEx requires implementation of:

- Account Registration API
- Customer registration flow

Production credentials are returned as:

- child_key
- child_secret

---

## Multi-Factor Authentication

### Factor 1

Customers must provide:

- FedEx account number
- Shipping address

### Factor 2

Supported methods:

- PIN via Email
- PIN via SMS
- PIN via Phone Call (US & Canada)
- Invoice Validation

Fallback:

- Contact FedEx Technical Support

---

## Recommended APIs

| API |
|------|
| Account Registration API |
| Address Validation API |
| Comprehensive Rates & Transit Times API |
| Rates & Transit Times API |
| Service Availability API |
| Ship API |
| Pickup Request API |
| Trade Document Upload API |
| FedEx Locations Search API |
| Basic Integrated Visibility API |

FedEx recommends Ship API over OpenShip API unless otherwise required.

---

## Shipping Capabilities

Recommended:

- Domestic shipping
- International shipping
- Return labels
- Pickup requests
- Multiple package shipments
- Future day shipping
- Saturday delivery
- Residential delivery

---

## International Shipping Requirements

Recommended support includes:

- Commercial invoices
- Electronic Trade Documents (ETD)
- Trade document uploads
- Broker Select
- Customs clearance documentation
- Importer of Record (IOR)

---

## Label Requirements

Supported formats:

- PDF
- PNG
- ZPL

FedEx validates label generation during certification.

---

## Billing and Rating

Recommended capabilities:

- Duties and taxes billing
- Sender billing
- Recipient billing
- Third-party billing
- Discounted rates
- Declared value

---

## Shipment Visibility

Recommended:

- Shipment cancellation
- Shipment visibility
- Shipment alerts
- Priority Alert services

---

## Branding Requirements

Only official FedEx branding may be used.

Requirements:

- Official FedEx logos only.
- Official FedEx service names.
- Compliance with FedEx Brand Guidelines.

Required disclaimer:

> The FedEx service marks are owned by Federal Express Corporation and are used by permission.

Minimum font size:

- 8 pt

---

## Insurance Terminology

Do NOT use:

```text
FedEx Shipping Insurance
```

Use:

```text
Declared Value
```

Third-party insurance may be offered if clearly stated that it is not provided by FedEx.

---

## Sandbox Requirements

FedEx provides:

- Virtualized Sandbox
- Functional Sandbox

Production credentials should not be used during development.

---

## Suggested API Flow

```text
Customer Login
        |
        v
FedEx Onboarding
        |
        v
EULA Acceptance
        |
        v
MFA Verification
        |
        v
Address Validation
        |
        v
Service Availability API
        |
        v
Rates API
        |
        v
Ship API
        |
        v
Trade Document Upload
        |
        v
Generate Shipping Label
        |
        v
Schedule Pickup
        |
        v
Track Shipment
```

---

## Official Resources

FedEx Brand Guidelines

https://brand.fedex.com/

FedEx Logo Assets

https://brand.fedex.com/portals/fedex-external

FedEx Developer Portal

https://developer.fedex.com/

---

## Summary Checklist

| Requirement | Status |
|------------|------------|
| FedEx EULA | Mandatory |
| Account Registration API | Mandatory |
| Multi-Factor Authentication | Mandatory |
| Child Credentials | Mandatory |
| Branding Compliance | Mandatory |
| Address Validation API | Recommended |
| Service Availability API | Recommended |
| Ship API | Recommended |
| Trade Document Upload API | Recommended |
| Label Support (PDF, PNG, ZPL) | Recommended |
| International Shipping Support | Recommended |
| Sandbox Testing | Recommended |