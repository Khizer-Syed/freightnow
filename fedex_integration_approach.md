# FedEx Integration Approach

## Business Model

Our platform offers discounted shipping rates negotiated directly with carriers (e.g., FedEx, UPS, DHL, etc.).

Customers do not use their own carrier accounts. Instead:

- Customers purchase shipping services through our platform.
- Shipment rates are calculated using our negotiated carrier rates.
- Customers are presented with our discounted rates.
- Shipping labels are generated using our carrier credentials.

Although pricing is based on our FedEx account, FedEx has confirmed that the Integrator technical and UI requirements must still be implemented.

---

## System Architecture

The platform should separate business logic from FedEx compliance requirements.

```text
                        Customer

                            |
                            v

                     Create Shipment

                            |
                            v

                      Pricing Engine

                            |
                            v

                   Carrier Rate Retrieval

                  FedEx | UPS | DHL | etc.

                            |
                            v

                    Apply Pricing Rules

                            |
                            v

                    Display Shipping Rates

                            |
                            v

                          Checkout

                            |
                            v

                     Generate Shipping Label
```

---

## Separation of Concerns

FedEx compliance should be implemented independently from pricing and shipment logic.

Suggested modules:

```text
/pricing-engine
/shipping-engine
/fedex-compliance
/fedex-api
/customer-onboarding
/payment-service
```

---

## FedEx Compliance Layer

FedEx-specific requirements should be implemented as a one-time onboarding process.

```text
Customer Signup
        |
        v
Activate Shipping Services
        |
        v
Activate FedEx Shipping
        |
        v
Accept FedEx EULA
        |
        v
Multi-Factor Authentication
        |
        v
FedEx Shipping Activated
        |
        v
Create Shipments
```

---

## Customer Experience

Avoid presenting the workflow as "connecting a FedEx account."

Recommended wording:

```text
FedEx Shipping Terms

FedEx requires all users shipping through FedEx services
to review and accept the FedEx End User License Agreement
before creating their first shipment.
```

Suggested onboarding steps:

1. Review FedEx EULA.
2. Verify identity.
3. Activate FedEx Shipping.
4. Begin shipping.

This process should occur only once.

---

## Pricing Architecture

Pricing should be independent from FedEx compliance.

Example:

```text
Customer Input
-------------------
Toronto -> Los Angeles
2 kg

        |
        v

Rate Engine

        |
        +--------------------+
        |                    |
        v                    v

FedEx API                UPS API

        |                    |

Negotiated Rates Retrieved

        |
        v

Apply Platform Pricing Rules

        |
        v

Display Customer Rates
```

Customers should only see the final price offered by the platform.

---

## Recommendations

- Keep FedEx certification requirements isolated from business logic.
- Make FedEx onboarding a one-time process.
- Reuse the pricing engine for all carriers.
- Implement carrier-specific compliance modules when required.