# NavU — University Services

NavU is a bilingual (Arabic/English) university services interface for room bookings, campus transportation, laboratory services, and maintenance requests.

## Run locally

Use Node.js 20.19 or later:

```bash
npm install
npm run dev
```

The development command starts the Vite interface and the local API. The API stores profiles, role permissions, and service requests in `data/navu.sqlite`.

## Accounts

User profile data and permissions are stored in the NavU SQLite database. Passwords are stored as scrypt hashes. Ordinary users may update their mobile number and profile photo; identifiers, roles, and college/department are read-only. Requests are filtered and authorized by the API according to the signed-in role.

No demo accounts are created. Provision real accounts through a trusted administrative process before enabling sign-in for users.

The selected college is the event/service location, not the signed-in user's college. Request history is stored by the API and is not filtered by the current location selection. Room inventory and preferences are still interface-level data and must be replaced with approved university records before operational use.

The sign-in page uses the bundled campus image at `public/najran-campus.jpeg`, displayed at its original aspect ratio.

## Checks

```bash
npm run build
npm run lint
```
