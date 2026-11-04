# 🍽️ QR Dine - Multi-Restaurant QR Ordering SaaS

A production-ready, mobile-first, installable PWA for dine-in restaurants. Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (Auth, Postgres, RLS, Realtime)**. Deployable free on Vercel.

---

## 🌟 Key Features

### Three Distinct Roles
1. **SUPER ADMIN**: Only person who can create or approve restaurant accounts and record setup / maintenance payments.
2. **RESTAURANT OWNER**: Logs in to manage menus, tables, live kitchen orders with loud audio alerts, thermal bills, and sales reports.
3. **CUSTOMER**: **No login, no signup, no app installation**. Customer scans table QR code and orders directly.

### Business Model (Manual UPI / Cash - Zero Gateway Cuts)
- **One-time registration fee**: Default **₹5,000** (recorded upon account onboarding).
- **Monthly maintenance fee**: Default **₹1,000** / month.
- **Automatic Blocking**: Enforced in PostgreSQL via Row Level Security (RLS) policies and `is_restaurant_live()` security-definer helper.
  - Live only if `status = 'active' AND paid_until >= CURRENT_DATE`.
  - When expired/blocked: Customer menu displays *"This restaurant is temporarily unavailable"*, new orders are rejected by the database, and owner dashboard displays a full-screen *"Subscription expired, please contact admin"* overlay with admin phone number (read-only access to past reports and bills is preserved).
  - 5 days before expiration: Dashboard displays an urgent yellow alert banner.
  - Owners can **never** modify `status`, `paid_until`, `fees`, or `max_tables` (enforced via database trigger `trg_prevent_owner_tampering`).

---

## 📱 Role Workflows

### 1. Super Admin Panel (`/admin`)
- **Dashboard KPI Cards**: Total venues, Active & paid, Due within 5 days, Expired/blocked, Monthly revenue collected.
- **Restaurant Directory**: Search and filter by *All*, *Paid*, *Due soon (≤5d)*, *Expired*, *Suspended*.
- **Admin Actions**:
  - Mark monthly payment received (extends `paid_until` by 1 month from today or current date, records payment log).
  - Mark setup fee paid.
  - Suspend / Reactivate access.
  - Reset owner password.
  - Edit fees & table limits.
  - Delete restaurant account.
- **Payments Ledger**: History of all UPI / cash transactions with 1-click CSV export.
- **Create Restaurant Account**: Secure server action (`/api/admin/create-restaurant`) using high-privilege `SUPABASE_SERVICE_ROLE_KEY` kept strictly server-side.
- **Daily Cron Simulator**: Simulates pg_cron to mark overdue restaurants as expired.

### 2. Restaurant Owner Dashboard (`/dashboard`)
- **Live Orders**:
  - Instant updates via Supabase Realtime + 15-second polling backup.
  - **"Start taking orders"** button unlocks browser Web Audio API context and requests **Screen Wake Lock**.
  - **Loud repeating audio chime** alerts kitchen staff until an action is taken.
  - **Full-screen popup queue**: *"Table X: New Order"* with items, quantities, notes, totals, and large **ACCEPT** / **REJECT** buttons (with customizable rejection reasons).
  - **Live Order Statuses**: `Pending` ➔ `Accepted` ➔ `Preparing` ➔ `Ready` ➔ `Served` ➔ `Completed/Billed`.
  - **Add-on Orders**: Customer additions arrive as *"Table X: Add-on items"* and automatically merge into the table running bill upon acceptance.
  - **Manual Item Addition**: Walk-in dish additions directly from kitchen tablet.
  - **Quantity Adjustments**: Edit quantities or cancel items before food is served.
- **Menu Manager**:
  - Category creation, reordering, and item management.
  - Client-side image compression prior to storage upload.
  - Veg / Non-Veg tags and instant **Available / Sold Out** toggles.
- **Tables & QR Generator**:
  - Table counter restricted to restaurant's `max_tables`.
  - Generates unique cryptographic token URLs: `/r/{slug}/t/{token}`.
  - Individual **Download PNG** and **Download All as Printable A4 PDF** (4 cards per page with branding and scan instructions).
  - Regenerate table tokens for security renewal.
- **Fiscal Bills & Receipts**:
  - Sequential invoice numbering per restaurant.
  - Complete tax breakdowns (Subtotal, GST %, Service Charge %, Grand Total).
  - **Thermal 80mm Print Stylesheet**: Clean layout formatted for thermal receipt printers.
  - **Download PDF**: Formatted receipts.
  - **Share on WhatsApp**: One-click link with itemized breakdown pre-filled.
- **Sales & Kitchen Reports**:
  - Today's metrics: revenue, order count, average order value (AOV), kitchen acceptance rate.
  - 30-day daily order volume chart.
  - Monthly revenue report with month picker, top 10 selling dishes, and peak dining hours.
  - Custom date-range CSV exports.
- **Settings**: Restaurant branding, logo, GSTIN, tax percentages, currency symbol, and kitchen alert volume slider with test chime.

### 3. Customer Ordering (`/r/[slug]/t/[token]`)
- **Frictionless Mobile-First Experience**: No login, no signup, no app installation.
- Sticky category tabs, quick dish search, and Veg-Only filter.
- Dynamic floating cart drawer with cooking notes, tax preview, and **"Place Order"** button.
- **Live Order Tracker**: Real-time progress bar from kitchen acceptance to food ready.
- **"Order More Items"**: Opens menu for add-on orders merged into the active running bill.
- **"Call Waiter / Request Bill"**: Sends instant sound and visual alerts to the owner dashboard.
- Browser session persistence across page refreshes; session closes automatically when the owner marks the table paid.
- Abuse protection: Server token validation, rate-limited to 5 orders per 10 minutes per device/table, item quantity capped at 20, and live restaurant check.

---

## 🗄️ Database Architecture & Migrations

All SQL migrations and schema files are in `supabase/migrations/`:

| File | Purpose |
| --- | --- |
| `01_schema.sql` | Core tables (`admins`, `restaurants`, `payments`, `restaurant_tables`, `menu_categories`, `menu_items`, `table_sessions`, `orders`, `order_items`, `bills`, `service_requests`) |
| `02_functions_triggers.sql` | `is_admin()`, `is_restaurant_live()`, anti-tamper trigger, max tables check, security-definer `customer_place_order()`, `generate_table_bill()` |
| `03_rls.sql` | Row Level Security policies for all tables and Supabase Realtime publication configuration |
| `04_seed.sql` | Demo seed data for Super Admin and 2 Demo Restaurants (1 active, 1 expired) |
| `schema_all.sql` | Single combined script for turnkey 1-click execution in Supabase SQL Editor |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18.17+ or 20+
- npm or yarn

### 2. Installation
```bash
git clone <your-repo-url> qr-order-saas
cd qr-order-saas
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your environment variables:
```env
# Client-accessible Supabase variables (safe for public)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# SERVER-ONLY High-Privilege Service Role Key
# NEVER expose this key in client components or with NEXT_PUBLIC_ prefix!
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Admin contact phone shown on expired banners and customer help screens
NEXT_PUBLIC_ADMIN_PHONE=+91 98765 43210
```

> **Note on Demo / Local Fallback Mode:**
> If Supabase credentials are not provided or set to placeholder values, the application runs in interactive local demo mode with in-memory & localStorage persistence. This enables immediate testing and UI reviews without requiring an external database.

---

## 🛠️ Supabase Setup Guide

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Open the **SQL Editor** in the Supabase Dashboard.
3. Open `supabase/schema_all.sql` from this repository, copy the entire content, paste it into the SQL Editor, and click **Run**.
4. Create the First Super Admin:
   - In Supabase Dashboard, navigate to **Authentication** ➔ **Users** and click **Add User**.
   - Email: `admin@qrapi.com`, Password: `Admin@123` (or your chosen password).
   - In SQL Editor, add this user to the `admins` table:
     ```sql
     INSERT INTO public.admins (id, email)
     VALUES ('<USER_UUID_FROM_AUTH_USERS>', 'admin@qrapi.com')
     ON CONFLICT (id) DO NOTHING;
     ```
5. Get API Keys:
   - Go to **Project Settings** ➔ **API**.
   - Copy `Project URL` to `NEXT_PUBLIC_SUPABASE_URL`.
   - Copy `anon` `public` key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Copy `service_role` `secret` key to `SUPABASE_SERVICE_ROLE_KEY`.

---

## 🧪 Testing the 12 Core Requirements

Run the automated test suite verifying all 12 criteria:
```bash
npm test
```

### The 12 Verification Criteria Tested:
1. **Admin creates restaurant; owner logs in**: Admin creates venue; owner can authenticate using slug/credentials.
2. **Owner adds category & item with photo**: Photo compressed client-side; item appears immediately on customer menu.
3. **Owner creates tables; QR codes work**: Table count enforced; unique token QR opens the correct customer menu.
4. **Customer orders; Owner accepts**: Loud alert sound plays; "Table X: New Order" popup appears; accepting updates customer status live.
5. **Customer add-ons**: Add-on order arrives as popup; accepting merges into table bill and recalculates total.
6. **Reject flow**: Rejecting an order records reason and displays reason to customer.
7. **Bill generation & thermal receipt**: Sequential bill number, GST %, service charge, grand total, printable 80mm format, and WhatsApp link.
8. **Reports & CSV export**: Accurate daily order counters, revenue, and downloadable CSV reports.
9. **Admin marks payment**: Extends `paid_until` by 30 days and logs payment record in ledger.
10. **Automatic blocking**: When `paid_until` is set to yesterday, customer menu displays *"temporarily unavailable"*, orders are rejected by database, and owner sees expired banner.
11. **Anti-tamper protection**: Owners cannot modify subscription status, `paid_until`, or fees (PostgreSQL trigger blocks updates).
12. **Multi-tenancy isolation**: Zero data leaks between different restaurants.

---

## 🚢 Deploying to Vercel

1. Push your code to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **Import Project**.
3. Select your repository.
4. Add the Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_ADMIN_PHONE`
5. Click **Deploy**. Vercel will build and deploy the application.

---

## 🔒 Security Best Practices
- `SUPABASE_SERVICE_ROLE_KEY` is strictly confined to server-side routes (`src/app/api/admin/*`) and is never exported to client code.
- Row Level Security (RLS) is enabled on all 11 database tables.
- Customer order placement is handled via a `SECURITY DEFINER` routine that validates live restaurant status and table tokens before inserting orders.
- Rate limiting restricts orders to a maximum of 5 orders per 10 minutes per table session.
- Image compression runs client-side to minimize bandwidth and storage requirements.
