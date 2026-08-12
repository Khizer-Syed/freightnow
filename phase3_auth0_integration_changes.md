# Phase 3: Auth0 Integration Changes

## Overview
Replaced the custom JWT + OTP authentication system with Auth0 Universal Login (hosted login page). Users are now redirected to Auth0's hosted page for login/signup instead of using the custom email/password + 6-digit OTP flow.

## Auth0 Configuration

### Credentials (in `backend/.env`)
```
AUTH0_DOMAIN=dev-1j30e4bjorr1z8ps.us.auth0.com
AUTH0_CLIENT_ID=tjR12i3hvfIoJhkaZxRpSCiFlf6x5bYT
AUTH0_CLIENT_SECRET=fjQRYmQ6HbduYk-UUS27CXpc76rQyoLSE5SAWf7Ucv4wG0Jt9RLp1olEWlCWZ3Jq
AUTH0_AUDIENCE=https://api.iffcargo.com
```

### Auth0 Dashboard Settings
- **Application Type:** Single Page Application
- **Allowed Callback URLs:** `http://localhost:3000/login`
- **Allowed Logout URLs:** `http://localhost:3000`
- **Allowed Web Origins:** `http://localhost:3000`
- **API Identifier:** `https://api.iffcargo.com`
- **User-delegated Access:** Enabled for IFF Cargo API

---

## Backend Changes

### 1. New Dependency
- Added `express-oauth2-jwt-bearer` — validates Auth0 access tokens via JWKS

### 2. `backend/src/config/env.js`
Added Auth0 config fields:
```js
auth0Domain: process.env.AUTH0_DOMAIN,
auth0Audience: process.env.AUTH0_AUDIENCE,
```

### 3. `backend/src/models/User.js`
- Added `auth0Id` field (`{ type: String, unique: true, sparse: true }`) to link Auth0 users to local DB records
- Made `passwordHash` optional (no longer required since Auth0 manages passwords)

### 4. `backend/src/middleware/auth.js` — Full Rewrite
**Before:** Used `jsonwebtoken` to verify self-issued JWT tokens with a shared secret.

**After:** Two-layer middleware:
1. `checkJwt` — uses `express-oauth2-jwt-bearer`'s `auth()` to validate Auth0 tokens via JWKS (RS256, automatic key rotation)
2. `loadUser` — finds or creates a User record in MongoDB by `auth0Id` (the token's `sub` claim). On first login, creates a new user. Also handles migration by falling back to email lookup for existing users.

The combined `authenticate` middleware still sets `req.user = { id, email, role, companyId }` — all downstream route handlers work unchanged.

### 5. `backend/src/routes/auth.routes.js` — Simplified
**Removed:** `/login`, `/register`, `/verify-otp`, `/resend-otp`, `/change-password` (all handled by Auth0 now)

**Kept:** `GET /auth/me` — returns the authenticated user's profile from MongoDB

---

## Frontend Changes

### 1. New Dependency
- Added `@auth0/auth0-react` — Auth0's React SPA SDK using Authorization Code + PKCE

### 2. `frontend/app/layout.js` — Added Auth0Provider
- Wraps the entire app with `<Auth0Provider>` configured with domain, clientId, audience
- Uses `cacheLocation="localstorage"` for token persistence across page refreshes
- `redirect_uri` set to `window.location.origin/login`
- `onRedirectCallback` navigates to `/portal` after successful login

### 3. `frontend/components/AuthBridge.js` — New Component
Bridges Auth0 SDK to the `fetchAPI()` helper:
- When authenticated, provides `getAccessTokenSilently()` as the token getter
- When not authenticated, clears the token getter

### 4. `frontend/lib/api.js` — Rewritten
**Removed:** `getToken()`, `setToken()`, `removeToken()`, `isLoggedIn()` (localStorage manual management)

**Added:** `setTokenGetter(fn)` pattern — called by AuthBridge. `fetchAPI()` now awaits the token getter to get a fresh Auth0 access token for each request's Bearer header.

### 5. `frontend/app/login/page.js` — Replaced
**Before:** Custom login form with email/password fields + OTP verification step.

**After:** Redirects to Auth0 Universal Login page. If already authenticated, redirects to `/portal`.

### 6. `frontend/app/register/page.js` — Replaced
**Before:** Multi-step registration form (personal info → company → EULA).

**After:** Redirects to Auth0 with `screen_hint: 'signup'` to show the sign-up tab.

### 7. `frontend/app/portal/layout.js` — Updated Auth Guard
**Before:** Checked `isLoggedIn()` (localStorage token existence).

**After:** Uses `useAuth0()` hook — checks `isAuthenticated` and `isLoading`. Redirects to Auth0 login if not authenticated. Shows loading state while SDK initializes.

### 8. `frontend/components/Sidebar.js` — Updated
- **Logout:** Uses Auth0 `logout()` with `returnTo: window.location.origin` instead of `removeToken()` + router push
- **User display:** Shows real user name and email from `useAuth0().user` instead of hardcoded placeholder

---

## Auth Flow (New)

```
1. User visits /login (or any /portal page)
2. Frontend detects not authenticated → calls loginWithRedirect()
3. Browser redirects to Auth0 Universal Login (hosted page)
4. User enters email/password on Auth0's page
5. Auth0 validates credentials, issues authorization code
6. Browser redirects back to http://localhost:3000/login with code
7. Auth0 SDK exchanges code for access token (PKCE, no secret needed)
8. AuthBridge provides token to fetchAPI() via setTokenGetter()
9. Frontend calls backend API with Bearer token
10. Backend validates token via JWKS (express-oauth2-jwt-bearer)
11. Backend finds/creates user in MongoDB by auth0Id
12. Sets req.user = { id, email, role, companyId }
13. Route handler proceeds normally
```

---

## How Auth0 Authenticates Users

### Visual Flow

```
User clicks "Sign In"
        │
        ▼
┌─────────────────────┐
│  /login page        │  Calls loginWithRedirect()
│  (your app)         │  ─────────────────────────►
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  Auth0 Hosted Page  │  User enters email/password
│  (dev-1j30e4b...)   │  Auth0 handles validation,
│                     │  MFA, social logins, etc.
└─────────────────────┘
        │  User authenticated ✓
        ▼
┌─────────────────────┐
│  Redirect back to   │  http://localhost:3000/login?code=xxx&state=xxx
│  your app           │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  Auth0 SDK          │  Exchanges ?code for a JWT access token
│  (in Auth0Provider) │  via POST /oauth/token (PKCE flow)
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  onRedirectCallback │  Navigates user to /portal
└─────────────────────┘
```

### Key Pieces in the Code

**Frontend** — gets and attaches the token:
- `frontend/app/layout.js` — wraps the app in `Auth0Provider`, configures the Auth0 tenant/audience
- `frontend/components/AuthBridge.js` — feeds `getAccessTokenSilently` to the API helper so every `fetchAPI()` call includes the Bearer token
- `frontend/lib/api.js` — attaches `Authorization: Bearer <token>` to all backend requests

**Backend** — validates the token:
- `backend/src/middleware/auth.js` — uses `express-oauth2-jwt-bearer` to verify the JWT signature against Auth0's public keys (fetched from `https://dev-1j30e4b.../.well-known/jwks.json`). Then `loadUser()` finds or creates the user in MongoDB by matching the `auth0Id` (the `sub` claim in the token).

### What Auth0 Handles vs What Stays Local

| Before (custom)              | Now (Auth0)                        |
|------------------------------|------------------------------------|
| You stored password hashes   | Auth0 stores credentials           |
| You built 2FA with email OTP | Auth0 handles MFA natively         |
| You issued/validated JWTs    | Auth0 issues, you just verify      |
| You built registration forms | Auth0 hosted signup page           |

### Where Users Live

Users still exist in **your MongoDB** (for app-specific data like company, role, shipments). But the `auth0Id` field links them to their Auth0 identity. On first login, the backend auto-creates a local user record.

---

## What Was Removed
- Custom JWT token generation (`jsonwebtoken` for signing)
- OTP/2FA flow (TwoFactorCode model, email service for codes)
- Password registration and login endpoints
- Frontend login form and OTP form
- Frontend multi-step registration form
- Manual localStorage token management

## What Still Works Unchanged
- All protected routes (quotes, bookings, shipments, claims, billing, profile, spot-rates, fedex-account, addresses)
- `requireRole` middleware
- `optionalAuth` for rate endpoints
- All business logic and carrier adapters
- Database schema (only added `auth0Id` field, nothing removed)

---

## User Migration Notes
- Old demo users (`john@acmecorp.com`) exist only in MongoDB — they need Auth0 accounts now
- The `loadUser` middleware handles migration: if a user logs in via Auth0 with an email that already exists in MongoDB, it links their `auth0Id` to that existing record
- New users signing up via Auth0 get a fresh MongoDB User record with `role: 'customer'`
- Company info collection happens post-signup in the Profile page
