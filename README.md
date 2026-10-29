# Akhi Lifestyle — Admin Panel (Next.js 14)

Full admin panel for your FastAPI shop backend. Uses all admin endpoints (73). Responsive: desktop, tablet, phone.

## Run in VS Code

```bash
# 1. open this folder in VS Code, open the terminal
npm install

# 2. tell it where your backend runs
cp .env.local.example .env.local      # Windows: copy .env.local.example .env.local
# edit BACKEND_URL (already set to http://150.136.74.154:8001 in .env.local)

# 3. start
npm run dev
```
Open http://localhost:3000 and sign in with your owner username/password
(the `ADMIN_USERNAME` / `ADMIN_PASSWORD` from the backend `.env`, or a staff account).

Backend must be running first. No CORS setup needed: Next.js forwards `/api/*` and `/uploads/*` to `BACKEND_URL`.

Production: `npm run build` then `npm start`.
On your server set `BACKEND_URL=http://127.0.0.1:8001` (the port your FastAPI runs on) before building.

## Project layout — one file per section

All the code for a section (list, forms, every API call) is in ONE file:

| Section | File |
|---|---|
| Dashboard | `src/sections/DashboardSection.jsx` |
| Products (+ add/edit, images, stock) | `src/sections/ProductsSection.jsx` |
| Categories | `src/sections/CategoriesSection.jsx` |
| Orders (+ detail, invoice, Steadfast, CSV export) | `src/sections/OrdersSection.jsx` |
| Payments (bKash/Nagad verify) | `src/sections/PaymentsSection.jsx` |
| Customers | `src/sections/CustomersSection.jsx` |
| Coupons | `src/sections/CouponsSection.jsx` |
| Banners | `src/sections/BannersSection.jsx` |
| Reviews | `src/sections/ReviewsSection.jsx` |
| Returns | `src/sections/ReturnsSection.jsx` |
| Inventory | `src/sections/InventorySection.jsx` |
| Delivery zones | `src/sections/DeliveryZonesSection.jsx` |
| Chat & Messages | `src/sections/ChatSection.jsx` |
| Notifications | `src/sections/NotificationsSection.jsx` |
| Reports | `src/sections/ReportsSection.jsx` |
| Staff (owner) | `src/sections/StaffSection.jsx` |
| Settings + my password | `src/sections/SettingsSection.jsx` |

To change a section, edit only its file. The top comment of each file lists the endpoints it uses.
`src/app/(admin)/<name>/page.jsx` are tiny wrappers (just render the section).

Shared: `src/lib/api.js` (API client), `src/components/ui.jsx` (modal, table, uploader…), `src/components/Shell.jsx` (sidebar + top bar), `src/app/globals.css` (colours: change `--pink` / `--navy` at the top).

## Roles
- **owner**: everything.
- **staff**: everything except Settings (view only), Staff page, sales/profit/top-customer reports (the backend blocks these).

## Notes
- Token is stored in the browser (localStorage), valid 12 hours, then you sign in again.
- Chat reply needs `META_PAGE_TOKEN` in the backend `.env`, otherwise it shows a 503 message.
- "Send to Steadfast" needs the Steadfast keys in the backend `.env`.
