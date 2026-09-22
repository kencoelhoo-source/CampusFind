# CampusFind — Complete Architecture Reference

> **Purpose:** This document is the intended architecture reference for CampusFind.
>
> It must be kept synchronized with the implementation. When this document conflicts
> with executable code, database migrations, generated types, or deployment configuration,
> the executable implementation is authoritative until the discrepancy is resolved.
>
> AI agents and contributors must verify security-sensitive claims against the actual
> source files and Supabase migrations before modifying the system.
>
> **Project:** CampusFind — SFIT Lost & Found Portal  
> **Creator:** Ken Coelho  
> **Institution:** St. Francis Institute of Technology (SFIT), Mumbai  
> **Stack:** React 18 + TypeScript + Vite + Supabase + Vercel  
> **Last Updated:** September 2026

---

## Table of Contents

1. [System Overview & Core Principles](#1-system-overview--core-principles)
2. [Technology Stack (Full Inventory)](#2-technology-stack-full-inventory)
3. [Repository Directory Map](#3-repository-directory-map)
4. [Application Shell & Provider Tree](#4-application-shell--provider-tree)
5. [Routing Architecture](#5-routing-architecture)
6. [Authentication System (Multi-Layer SFIT Guard)](#6-authentication-system-multi-layer-sfit-guard)
7. [Database Schema (All Tables & Enums)](#7-database-schema-all-tables--enums)
8. [Row Level Security (RLS) Matrix](#8-row-level-security-rls-matrix)
9. [Postgres Stored Functions & Triggers](#9-postgres-stored-functions--triggers)
10. [Migration History](#10-migration-history)
11. [Data Fetching Architecture (itemsApi + RPCs)](#11-data-fetching-architecture-itemsapi--rpcs)
12. [In-Memory Search Engine](#12-in-memory-search-engine)
13. [Claim & Verification Workflow](#13-claim--verification-workflow)
14. [Notification System (In-App + Optional Email)](#14-notification-system-in-app--optional-email)
15. [Real-Time Architecture (Supabase Realtime)](#15-real-time-architecture-supabase-realtime)
16. [File Upload & Storage Architecture](#16-file-upload--storage-architecture)
17. [UI Component Architecture](#17-ui-component-architecture)
18. [Motion Design & Gesture Architecture](#18-motion-design--gesture-architecture)
19. [Contexts & Global State](#19-contexts--global-state)
20. [Hooks Catalog](#20-hooks-catalog)
21. [Constants & Design Tokens](#21-constants--design-tokens)
22. [Type System](#22-type-system)
23. [Testing Architecture](#23-testing-architecture)
24. [Deployment Architecture (Vercel)](#24-deployment-architecture-vercel)
25. [Environment Variables](#25-environment-variables)
26. [Zero-Dollar Cost Model](#26-zero-dollar-cost-model)
27. [Rate Limits & Abuse Prevention](#27-rate-limits--abuse-prevention)
28. [Dashboard Architecture (My Items / Claims / Inbox / Notifications)](#28-dashboard-architecture)
29. [Critical Rules for Maintainers & AI Agents](#29-critical-rules-for-maintainers--ai-agents)
30. [Known Patterns & Conventions](#30-known-patterns--conventions)

---

## Source-of-Truth Hierarchy

When sources disagree, use this order:

1. Production database schema and applied migrations
2. Current source code
3. Supabase configuration and deployment configuration
4. Generated database TypeScript types
5. Automated tests
6. `ARCHITECTURE.md`
7. `brain.md`
8. `README.md`

If documentation conflicts with code or migrations:
- Do not assume the documentation is correct.
- Record the discrepancy.
- Verify the behavior.
- Update the documentation after resolving it.

---

## 1. System Overview & Core Principles

CampusFind is a **campus-confined Lost & Found SPA** deployed at SFIT. The entire system runs within the free tiers of Supabase, Vercel, and Google Cloud. There are no paid external APIs.

### Core Principles (Non-Negotiable)

| Principle | Implementation |
|---|---|
| **$0/month forever** | Supabase Free, Vercel Hobby, GCP Free. No Algolia, Twilio, SendGrid, OpenAI. |
| **SFIT students only** | Domain guard at client, context, and Postgres trigger level. |
| **Privacy by default** | Poster emails never exposed. Claims are private. Contact info stripped from DB. |
| **No external search** | Custom in-memory TypeScript scorer with synonyms, stemming, Levenshtein fuzzy. |
| **Apple-grade UI** | SF Pro typography, glassmorphism, spring physics, SVG metaball effects. |

---

## 2. Technology Stack (Full Inventory)

### Core Framework

| Package | Version | Role |
|---|---|---|
| `react` / `react-dom` | `^18.3.1` | Core UI engine (React 19 features not currently implemented) |
| `vite` | `^5.4.19` | Build tool and dev server |
| `@vitejs/plugin-react-swc` | `^3.11.0` | Rust-based SWC compiler |
| `typescript` | `^5.8.3` | Type safety |

### UI & Styling

| Package | Version | Role |
|---|---|---|
| `tailwindcss` | `^3.3.3` | Utility-first CSS |
| `tailwindcss-animate` | `^1.0.7` | Keyframe animation helpers |
| `@tailwindcss/typography` | `^0.5.16` | Clean article typography |
| `lucide-react` | `^0.462.0` | Icon set |
| `clsx` + `tailwind-merge` | `^2.1.1` / `^2.6.0` | `cn()` class merger |
| `class-variance-authority` | `^0.7.1` | Component variant system (shadcn) |
| `framer-motion` | `^13.4.0` | Physics-based animations |
| `sonner` | `^1.7.4` | Toast notifications |
| `embla-carousel-react` | `^8.6.0` | Image carousel |
| `vaul` | `^0.9.9` | iOS-style drawer primitive |
| `next-themes` | `^0.3.0` | Theme context (light/dark) |

### Radix UI Primitives (used by shadcn/ui)

`@radix-ui/react-accordion`, `react-alert-dialog`, `react-aspect-ratio`, `react-avatar`, `react-checkbox`, `react-collapsible`, `react-context-menu`, `react-dialog`, `react-dropdown-menu`, `react-hover-card`, `react-label`, `react-menubar`, `react-navigation-menu`, `react-popover`, `react-progress`, `react-radio-group`, `react-scroll-area`, `react-select`, `react-separator`, `react-slider`, `react-slot`, `react-switch`, `react-tabs`, `react-toast`, `react-toggle`, `react-toggle-group`, `react-tooltip`

### Backend & State

| Package | Version | Role |
|---|---|---|
| `@supabase/supabase-js` | `^2.97.0` | Supabase client: DB, Auth, Storage, Realtime |
| `@tanstack/react-query` | `^5.83.0` | Server-state caching |
| `react-router-dom` | `^6.30.1` | Client-side SPA routing |
| `react-hook-form` + `@hookform/resolvers` | `^7.61.1` / `^3.10.0` | Form handling |
| `zod` | `^3.25.76` | Schema validation |
| `date-fns` | `^3.6.0` | Date formatting |

### Dev & Testing

| Package | Version | Role |
|---|---|---|
| `vitest` | `^3.2.4` | Unit test runner |
| `jsdom` | `^20.0.3` | Headless DOM for tests |
| `@testing-library/react` | `^16.0.0` | React component testing |
| `@testing-library/jest-dom` | `^6.6.0` | DOM matchers |
| `sharp` | `^0.35.4` | Image processing (build-time) |

---

## 3. Repository Directory Map

```
CampusFind/
├── .env                         # Local secrets (never committed)
├── .env.example                 # Template with placeholder values
├── .github/                     # GitHub Actions / CI (if any)
├── .agents/
│   ├── rules/
│   │   └── readme-update.md    # Rule: when to update README.md
│   └── skills/                  # Project-specific AI agent skills
├── index.html                   # HTML5 entry point, Google Fonts preconnect, meta tags
├── package.json                 # All dependencies and npm scripts
├── tailwind.config.ts           # Custom design tokens, colors, animation curves
├── vite.config.ts               # Bundler config, SWC, manual chunk splitting
├── vitest.config.ts             # Test environment (jsdom)
├── vercel.json                  # SPA rewrites, security headers (CSP, HSTS, etc.)
├── components.json              # shadcn/ui config (paths, style, etc.)
├── brain.md                     # Living technical codebase reference for AI agents
├── ARCHITECTURE.md              # This file — deep architecture reference
│
├── public/
│   ├── favicon.png
│   ├── placeholder.svg
│   └── robots.txt
│
├── src/
│   ├── main.tsx                 # React root: createRoot → <App />
│   ├── App.tsx                  # Provider tree + route shell + lazy imports
│   ├── index.css                # Design system: CSS variables, tokens, animations
│   ├── App.css                  # Legacy baseline CSS
│   ├── vite-env.d.ts            # VITE_* env type declarations
│   │
│   ├── assets/                  # Static images (hero-campus, hero-mobile, auth walls)
│   │
│   ├── constants/
│   │   └── index.ts             # CATEGORIES, LOCATIONS, STATUS_STYLES, CATEGORY_STYLES
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx      # Auth state, Google sign-in, SFIT domain rejection
│   │   ├── AuthPromptContext.tsx # Global modal trigger for unauthenticated actions
│   │   └── ThemeContext.tsx     # Dark/light theme with localStorage persistence
│   │
│   ├── data/
│   │   └── faqs.ts              # Static FAQ Q&A pairs
│   │
│   ├── features/items/          # Primary feature module
│   │   ├── types.ts             # ItemWithImage, RawItem, ItemFilters, ItemStatus
│   │   ├── components/
│   │   │   ├── ClaimModal.tsx   # Submit-claim dialog (15–500 char message)
│   │   │   ├── GooeySearchBar.tsx # SVG metaball search input
│   │   │   ├── ItemCard.tsx     # Item display (poster / list layouts)
│   │   │   └── SearchFilters.tsx # Status/category/location dropdowns
│   │   ├── services/
│   │   │   └── itemsApi.ts      # All public-board data fetching (via Postgres RPCs)
│   │   └── utils/
│   │       ├── search-engine.ts # In-memory ranking engine
│   │       ├── item-filters.ts  # URLSearchParams helpers
│   │       └── item-validation.ts # File/claim validation
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx       # Window resize mobile breakpoint (<768px)
│   │   ├── use-notification-realtime.ts # Supabase Realtime subscription
│   │   ├── use-sfit-email-lock.ts       # Runtime SFIT email lock feature flag
│   │   └── use-toast.ts         # Toast queue management
│   │
│   ├── integrations/supabase/
│   │   ├── client.ts            # Supabase JS client instantiation
│   │   └── types.ts             # Auto-generated TypeScript types from DB schema
│   │
│   ├── lib/
│   │   ├── email.ts             # isAllowedSfitEmail, isSfitEmailDomain, formatAuthError
│   │   ├── google-gis.ts        # GIS SDK loader, SHA-256 nonce generator
│   │   ├── notification-routing.ts # hrefForNotification — routes bell clicks correctly
│   │   └── utils.ts             # cn() = clsx + tailwind-merge
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── AuthPromptModal.tsx  # Modal for unauthenticated users trying to post/claim
│   │   │   ├── ErrorBoundary.tsx    # React error boundary with fallback UI
│   │   │   ├── GlowAction.tsx       # Pointer-tracked magnetic glow button
│   │   │   ├── Logo.tsx             # CampusFind typography logo link
│   │   │   ├── NetworkStatusNotifier.tsx # Offline/online toast notifier
│   │   │   ├── PageTransition.tsx   # Route fade transition + AuthCurtain
│   │   │   └── Skeletons.tsx        # PosterSkeleton, ListRowSkeleton, DashRowSkeleton, RouteSkeleton
│   │   ├── layout/
│   │   │   ├── Navbar.tsx           # Glassmorphic fixed header, unread badge
│   │   │   ├── MobileDock.tsx       # iOS-style floating bottom dock with gesture physics
│   │   │   ├── Footer.tsx           # Attribution and legal links
│   │   │   └── LegalLayout.tsx      # Wrapper for Privacy and Terms pages
│   │   └── ui/                      # ~50 shadcn/Radix components
│   │
│   ├── pages/
│   │   ├── Index.tsx            # Homepage: hero, live stats, categories, recent items, FAQ
│   │   ├── Items.tsx            # Browse: search engine, filters, grid/list toggle
│   │   ├── ItemDetail.tsx       # Detail: image gallery, metadata, claim CTA, related items
│   │   ├── PostItem.tsx         # Create listing: title, category, location, date, images
│   │   ├── Dashboard.tsx        # User console: My Items, My Claims, Inbox, Notifications
│   │   ├── Auth.tsx             # Login: Google GIS button, OAuth fallback, campus imagery
│   │   ├── FAQ.tsx              # Accordion FAQ list
│   │   ├── Privacy.tsx          # Privacy policy
│   │   ├── Terms.tsx            # Terms of use
│   │   └── NotFound.tsx         # 404 page
│   │
│   ├── services/
│   │   └── notifications.ts     # notifyUser() RPC wrapper, showDesktopNotification()
│   │
│   ├── test/
│   │   ├── email.test.ts        # SFIT domain validation tests
│   │   ├── item-filters.test.ts # URLSearchParams serialization tests
│   │   ├── item-validation.test.ts # Image/claim validation tests
│   │   ├── network-status.test.tsx # Network status component tests
│   │   ├── search-engine.test.ts   # Search scoring, synonyms, fuzzy tests
│   │   └── setup.ts            # jsdom setup, matchMedia mock
│   │
│   └── types/
│       └── database.ts          # DBItem, DBClaim, DBNotification, DashboardData
│
└── supabase/
    ├── config.toml              # Supabase local dev config
    ├── functions/
    │   └── notify-email/        # Optional Deno edge function (Resend integration)
    └── migrations/              # 19 sequential SQL migration files (see §10)
```

---

## 4. Application Shell & Provider Tree

`src/main.tsx` mounts `<App />` into `#root` using React 18's `createRoot`.

`src/App.tsx` wraps the entire app in this provider hierarchy (outer → inner):

```
<ErrorBoundary>               ← Catches React render errors
  <QueryClientProvider>       ← TanStack Query (staleTime: 2min, retries: 2, backoff: expo+jitter)
    <TooltipProvider>         ← Radix UI tooltip context
      <ThemeProvider>         ← Dark/light theme, localStorage persistence
        <AuthProvider>        ← Supabase session, Google sign-in, SFIT domain guard
          <Sonner />          ← Global toast renderer
          <NetworkStatusNotifier /> ← Offline/online detection toasts
          <BrowserRouter>
            <AuthPromptProvider> ← Global "sign in first" modal trigger
              <AppShell />    ← useNotificationRealtime(), Navbar, MobileDock, Routes, Footer
            </AuthPromptProvider>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
</ErrorBoundary>
```

**QueryClient default config:**
- `staleTime`: 2 minutes
- `retry`: up to 2 times, skip on 4xx client errors
- `retryDelay`: exponential backoff with jitter (`Math.min(1000 * 2^n, 25000) + random*800`)
- `networkMode`: `"online"` (pauses queries when offline)
- `refetchOnWindowFocus`: `true`

---

## 5. Routing Architecture

All routes are **lazy-loaded** via `React.lazy()` with a `<Suspense>` fallback of `<RouteSkeleton />`. No route is eagerly bundled.

| Path | Component | Auth Required |
|---|---|---|
| `/` | `Index.tsx` | No (public) |
| `/items` | `Items.tsx` | No (public) |
| `/items/:id` | `ItemDetail.tsx` | No (public) |
| `/post` | `PostItem.tsx` | Publicly routable — Auth enforced inside component |
| `/dashboard` | `Dashboard.tsx` | Publicly routable — Redirects unauthenticated users internally |
| `/auth` | `Auth.tsx` | No (shows nothing if already signed in) |
| `/faq` | `FAQ.tsx` | No |
| `/privacy` | `Privacy.tsx` | No |
| `/terms` | `Terms.tsx` | No |
| `*` | `NotFound.tsx` | No |

Navbar and MobileDock are hidden on `/auth`. Footer is hidden on `/` and `/auth` (Index has its own integrated footer area).

*Note: Route protection is component-level, not a route guard (e.g. `<Route element={<RequireAuth />}>`). The component-level checks are a UX boundary, while Supabase RLS enforces actual security.*

**Manual chunk splitting in `vite.config.ts`:**
- `react-vendor`: `react`, `react-dom`, `react-router-dom`
- `supabase`: `@supabase/supabase-js`
- `react-query`: `@tanstack/react-query`

---

## 6. Authentication System (Multi-Layer SFIT Guard)

Authentication is enforced at **three independent layers**:

### Layer 1: Client-Side (`src/lib/email.ts`)

- `isAllowedSfitEmail(email)` — checks if email passes domain validation
- When `sfit_email_lock` is `false` (default off): accepts any valid email format
- When `sfit_email_lock` is `true`: enforces `domain === 'student.sfit.ac.in' || 'sfit.ac.in'`
- `isSfitEmailDomain(email)` — always enforces SFIT domain regardless of lock
- The lock is fetched at startup via `supabase.rpc("get_sfit_email_lock")` and cached in-memory

### Layer 2: AuthContext (`src/contexts/AuthContext.tsx`)

- On every `onAuthStateChange` event, `rejectNonSfitSession()` is called
- If email fails `isAllowedSfitEmail`: session is rejected, `supabase.auth.signOut()` is called asynchronously (via `setTimeout` to avoid deadlock inside the auth callback)
- OAuth error parameters in URL hash/query (`?error_description=...`) are intercepted and translated into friendly toast messages
- The auth context also listens to `app_settings` table via Supabase Realtime — if the email lock setting changes, it re-evaluates the current session immediately

### Layer 3: Postgres Trigger (`check_signup_email_domain`)

```sql
-- Fires: BEFORE INSERT OR UPDATE OF email ON auth.users
-- Checks: domain in ('student.sfit.ac.in', 'sfit.ac.in')
-- On fail: RAISE EXCEPTION (triggers redirect to /auth with error in URL)
```

### Sign-In Flow

```
User clicks "Sign in with Google"
       │
       ▼
Try Google Identity Services (GIS)
  src/lib/google-gis.ts → loadGoogleGIS()
  → generates SHA-256 nonce
  → calls google.accounts.id.initialize()
  → prompt() → credential callback
  → supabase.auth.signInWithIdToken({ provider: 'google', token, nonce })
       │
       ▼ (if GIS fails or blocked)
Fallback: supabase.auth.signInWithOAuth({ provider: 'google' })
  → redirects to Google OAuth popup
  → returns to /auth with tokens in URL hash
       │
       ▼
AuthContext.onAuthStateChange fires
  → rejectNonSfitSession() validates email
  → if valid: session stored, user redirected
  → if invalid: signed out + toast error
```

### Runtime Email Lock

The `app_settings` table has a boolean `sfit_email_lock` column. When `true`, even accounts with technically valid emails (non-SFIT) are rejected. The lock can be toggled by `kencoelhoo@student.sfit.ac.in` from the Admin settings. Changes propagate via Supabase Realtime to all connected clients within seconds.

---

## 7. Database Schema (All Tables & Enums)

### Enums

```sql
CREATE TYPE item_status AS ENUM ('lost', 'found', 'claimed', 'returned');
CREATE TYPE item_category AS ENUM ('electronics', 'clothing', 'documents', 'keys', 'wallet', 'jewelry', 'books', 'other');
CREATE TYPE claim_status AS ENUM ('pending', 'approved', 'rejected', 'withdrawn');
CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');
```

### `public.profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` |
| `user_id` | UUID | UNIQUE, FK → `auth.users(id)` ON DELETE CASCADE |
| `full_name` | TEXT | Nullable, synced from Google metadata |
| `avatar_url` | TEXT | Nullable, Google profile pic URL |
| `department` | TEXT | Nullable |
| `year` | TEXT | Nullable (FE/SE/TE/BE) |
| `created_at` | TIMESTAMPTZ | `now()` |
| `updated_at` | TIMESTAMPTZ | `now()` |

Auto-created by `handle_new_user()` trigger on `auth.users` INSERT.

### `public.items`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE |
| `title` | TEXT | NOT NULL (min 3 chars via trigger) |
| `description` | TEXT | Nullable |
| `category` | `item_category` | NOT NULL, default `'other'` |
| `location` | TEXT | Nullable — where item was lost/found |
| `held_where` | TEXT | Nullable — `"with_me"` or `"at_desk"` |
| `held_at` | TEXT | Nullable — A campus location string (e.g. "SFIT Library", "Security Desk") |
| `status` | `item_status` | NOT NULL, default `'lost'` |
| `date_occurred` | DATE | Nullable |
| `deleted_at` | TIMESTAMPTZ | Nullable — soft-delete timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |

> `contact_email` column was permanently dropped in migration `20260909043000`. It no longer exists.

### `public.item_images`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `item_id` | UUID | NOT NULL, FK → `public.items(id)` ON DELETE CASCADE |
| `storage_path` | TEXT | NOT NULL — path in `item-images` Supabase bucket |
| `url` | TEXT | NOT NULL — public CDN URL |
| `created_at` | TIMESTAMPTZ | NOT NULL |

Folder structure: `${user_id}/${item_id}/${random_uuid}.${ext}`

### `public.claims`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `item_id` | UUID | NOT NULL, FK → `public.items(id)` ON DELETE CASCADE |
| `user_id` | UUID | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE |
| `message` | TEXT | NOT NULL, 15–500 chars (enforced by trigger) |
| `status` | `claim_status` | NOT NULL, default `'pending'` |
| `meeting_requested` | BOOLEAN | NOT NULL, default `false` |
| `meeting_details` | TEXT | Nullable, max 500 chars |
| `verification_question` | TEXT | Nullable |
| `verification_answer` | TEXT | Nullable |
| `appeal_message` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ | NOT NULL |

**Unique constraint:** `UNIQUE(item_id, user_id)` — one claim per user per item.

### `public.notifications`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE — recipient |
| `sender_id` | UUID | Nullable, FK → `auth.users(id)` ON DELETE SET NULL |
| `title` | TEXT | NOT NULL, max 200 chars |
| `message` | TEXT | NOT NULL, max 1000 chars |
| `read` | BOOLEAN | NOT NULL, default `false` |
| `kind` | TEXT | Nullable — type tag for routing (e.g. 'claim', 'match', 'return') |
| `related_item_id` | UUID | Nullable, FK → `public.items(id)` ON DELETE SET NULL |
| `related_claim_id` | UUID | Nullable, FK → `public.claims(id)` ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL |

### `public.user_roles`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE |
| `role` | `app_role` | NOT NULL |

**Unique constraint:** `UNIQUE(user_id, role)`

### `public.app_settings`

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | PK |
| `sfit_email_lock` | BOOLEAN | Runtime SFIT domain enforcement toggle |

---

## 8. Row Level Security (RLS) Matrix

RLS is **enabled on all tables**. The `anon` key can only do what policies explicitly allow.

### `profiles`

| Operation | Policy |
|---|---|
| SELECT | `USING (true)` — public (via `list_public_poster_names` RPC) |
| INSERT | `WITH CHECK (auth.uid() = user_id)` |
| UPDATE | `USING (auth.uid() = user_id)` |

### `items`

| Operation | Policy |
|---|---|
| SELECT (anon + authenticated) | Active items only: `deleted_at IS NULL` — via `list_public_items` RPC (SECURITY DEFINER, bypasses RLS) |
| INSERT | `auth.uid() = user_id` |
| UPDATE | `auth.uid() = user_id OR has_role(auth.uid(), 'admin')` |
| DELETE | Physical delete intercepted by `soft_delete_item` trigger → sets `deleted_at` |

### `item_images`

| Operation | Policy |
|---|---|
| SELECT | Active items only (item's `deleted_at IS NULL`) |
| INSERT | Item owner only + storage path matches `auth.uid()` |

### `claims`

| Operation | Policy |
|---|---|
| SELECT | Item owner sees claims on their items; claimant sees their own claims |
| INSERT | `auth.uid() = user_id AND status = 'pending' AND item is active AND item.user_id ≠ auth.uid()` |
| UPDATE | Item owner or admin — constrained by `enforce_claim_update` trigger |
| DELETE | Claimant can delete their own `pending` or `withdrawn` claim |

### `notifications`

| Operation | Policy |
|---|---|
| SELECT | `auth.uid() = user_id` |
| UPDATE | `auth.uid() = user_id` (mark read) |
| DELETE | `auth.uid() = user_id` |
| INSERT | **Only** via `create_notification()` SECURITY DEFINER function — direct insert blocked |

### `storage.objects` (`item-images` bucket)

| Operation | Policy |
|---|---|
| SELECT | Public — `bucket_id = 'item-images'` |
| INSERT | `auth.uid()::text = (storage.foldername(name))[1]` — own folder only |
| DELETE | Item owner only |

---

## 9. Postgres Stored Functions & Triggers

> 📌 **Intended:** Security-sensitive RPC and trigger functions are intended to use `SECURITY DEFINER` and `SET search_path = public` to prevent schema injection attacks. AI agents should verify this in migrations.

### `public.handle_new_user()` → Trigger: AFTER INSERT ON `auth.users`
Auto-creates a `profiles` row from Google user metadata (full_name, avatar_url).

### `public.check_signup_email_domain()` → Trigger: BEFORE INSERT OR UPDATE OF email ON `auth.users`
- ✅ **Verified in source:** Checks `app_settings.sfit_email_lock`.
- If lock is `false`, it returns `NEW` immediately (bypassing domain validation).
- If lock is `true`, it validates `@` count is exactly 1, extracts domain, and throws exception if domain ∉ `('student.sfit.ac.in', 'sfit.ac.in')`.

### `public.check_item_posting_rate_limit()` → Trigger: BEFORE INSERT ON `public.items`
- Counts items posted by `auth.uid()` in last 24 hours
- Throws exception if count ≥ 10

### `public.check_claim_submitting_rate_limit()` → Trigger: BEFORE INSERT ON `public.claims`
- Counts claims by `auth.uid()` in last 24 hours
- Throws exception if count ≥ 15

### `public.soft_delete_item()` → Trigger: BEFORE DELETE ON `public.items`
- Intercepts physical DELETE
- Sets `deleted_at = now()` instead
- Returns `NULL` to abort actual row deletion

### `public.enforce_claim_insert()` → Trigger: BEFORE INSERT ON `public.claims`
- Forces `status = 'pending'`, clears sensitive fields
- Validates message length: 15 ≤ length ≤ 500 chars
- Checks item is `status IN ('lost', 'found')` AND `deleted_at IS NULL` AND `user_id ≠ claimant`

### `public.enforce_claim_update()` → Trigger: BEFORE UPDATE ON `public.claims`
- Only item owner or admin can update
- Prohibits changing `user_id`, `item_id`, or `message`
- Prevents re-opening already-resolved (`approved`/`rejected`) claims
- Validates `meeting_details` ≤ 500 chars

### `public.after_claim_update_notify()` → Trigger: AFTER UPDATE ON `public.claims`
- ✅ **Verified in source:** Auto-rejects sibling claims when a claim's status is changed to `approved`.
- Dispatches notifications for accepted/rejected claims and meetup updates.

### `public.after_item_change_notify()` → Trigger: AFTER UPDATE ON `public.items`
- ✅ **Verified in source:** Auto-rejects all pending claims when an item is marked `returned` or `deleted_at` is set.
- Dispatches notifications to claimants about the item's resolution.

### `public.create_notification(...)` — SECURITY DEFINER RPC
Called only by authenticated clients. Parameters: `_user_id`, `_title`, `_message`, `_related_item_id`, `_related_claim_id`.
- Validates `auth.uid() IS NOT NULL`
- Validates `_user_id ≠ auth.uid()` (no self-notifications)
- Validates `_related_item_id` is not null and item is active
- Enforces relationship: sender must be either item owner or a claimant on that item
- Rate limit: max 20 notifications sent per hour per sender
- Returns inserted notification UUID

### `public.get_sfit_email_lock()` — RPC
Returns the current `sfit_email_lock` boolean from `app_settings`.

### `public.list_public_items()` — RPC (SECURITY DEFINER, bypasses RLS)
- ✅ **Verified in source:** Returns all non-deleted items (`deleted_at IS NULL`). Bypasses RLS to allow anonymous board browsing. Returns only safe, public fields (`id`, `title`, `description`, `category`, `location`, `held_where`, `held_at`, `status`, `date_occurred`, `created_at`, `user_id`). Does not return emails or notifications.

### `public.get_public_item(_id UUID)` — RPC
Returns a single item by ID if not deleted.

### `public.check_item_availability(_id UUID)` — RPC
Returns item status/title/category even for deleted items — used to render the `ItemResolutionNotice` gracefully.

### `public.list_public_item_images(_ids UUID[])` — RPC
Returns first image URL per item for a given array of item IDs.

### `public.list_public_poster_names(_ids UUID[])` — RPC
Returns full_name from profiles for an array of user IDs.

---

## 10. Migration History

All 19 migrations applied in order:

| File | Purpose |
|---|---|
| `20260220140005_...` | Initial schema: enums, profiles, items, claims, notifications, RLS |
| `20260220140020_...` | Notification insert policy fix |
| `20260412120000_claims_notifications_hardening` | Claims unique constraint, `create_notification` RPC |
| `20260617000000_security_hardening_and_linter_fixes` | Email triggers, rate limits, soft deletes |
| `20260909040000_launch_security_hardening` | `enforce_claim_insert/update`, storage RLS, contact email strip |
| `20260909043000_drop_contact_email` | Permanently drops `contact_email` column |
| `20260915120000_production_indexes_and_perf` | Indexes on items, claims, notifications for query performance |
| `20260915180000_claim_notification_delivery` | Full notification delivery system via triggers |
| `20260916090000_item_custody` | Adds `held_where`, `held_at` columns to items |
| `20260916110000_sfit_email_lock_setting` | `app_settings` table, `get_sfit_email_lock` RPC |
| `20260916130000_console_rls_hardening` | Dashboard query hardening |
| `20260916140000_anon_profile_read` | Allows anon to read profiles via RPC |
| `20260916150000_anon_can_read_board` | Allows anon board browsing |
| `20260916160000_linter_useful_fixes` | Linter-suggested security fixes |
| `20260916170000_fix_guest_board_select` | Guest board select permissions |
| `20260916180000_public_board_rpc` | `list_public_items`, `get_public_item` RPCs |
| `20260916190000_public_board_bypass_rls` | SECURITY DEFINER on board RPCs |
| `20260917000000_no_claim_at_desk` | Blocks claiming items with `held_at = 'desk'` |
| `20260920120000_claims_claimant_delete_and_status_check` | Allows claimant to delete pending/withdrawn claims; adds `withdrawn` status |

---

## 11. Data Fetching Architecture (itemsApi + RPCs)

All public data fetching goes through **Postgres RPC functions** (not direct table SELECT). This bypasses RLS for anonymous users without exposing sensitive data.

### `src/features/items/services/itemsApi.ts`

**`fetchRecentItems(limit = 8)`**
- Calls `list_public_items()` RPC
- Sorts by `created_at DESC`, takes first `limit`
- Hydrates: adds `image_url` (from `list_public_item_images`) and `poster_name` (from `list_public_poster_names`)

**`fetchBrowseItems(filters: ItemFilters)`**
- Calls `list_public_items()` RPC
- Filters in-memory: status, category, location
- Sorts by `created_at DESC`, takes 100 rows
- Hydrates with images + poster names
- If `filters.keyword` is non-empty: runs `rankItemsByQuery()` for in-memory scoring

> 🚧 **Architectural Flaw:** Premature candidate truncation in application-layer search
> - **Current behavior (✅ Verified):** Search scope = maximum 100 newest records. `LIMIT` happens *before* retrieval/ranking, hiding older valid matches.
> - **Recommended (Level 1):** Postgres indexed retrieval (`FTS` + `pg_trgm`) → top 100 candidates → simple relevance ranking → `LIMIT 20`. Pagination must happen *after* retrieval, not before.
> - **Future (Level 2):** Hybrid search combining Keyword retrieval (FTS) and Semantic retrieval (pgvector) → Reciprocal Rank Fusion (RRF) → ranking → top 20. (Similar to modern Airbnb/Pinterest retrieval architectures).

**`fetchHomeStats()`**
- Calls `list_public_items()` RPC
- Counts `lost` and `found` statuses
- Returns `{ total, lost, found }`

**`fetchItemDetail(id)`**
- Calls `get_public_item({ _id: id })`
- If not found: tries `check_item_availability({ _id: id })` for graceful resolution notice
- If found: parallel fetches `list_public_item_images`, `list_public_poster_names`, `list_public_items` (for related items, same category)
- Returns `{ item, meta, images, poster, relatedItems }`

**`hydratePublicItems(items: RawItem[])`** (internal)
- Deduplicates user IDs
- Parallel fetches images + poster names via RPCs
- Merges into `ItemWithImage[]`

### TanStack Query Keys

| Query Key Pattern | Data |
|---|---|
| `["recent-items"]` | Home page recent listings |
| `["browse-items", filters]` | Browse page listings |
| `["item", id]` | Single item detail |
| `["home-stats"]` | Lost/found counts on homepage |
| `["dashboard", userId]` | Full dashboard data |
| `["unread-notifications-count", userId]` | Bell badge count |

---

## 12. In-Memory Search Engine

**File:** `src/features/items/utils/search-engine.ts`

No external service. Runs entirely on the client's CPU.

### Pipeline

```
User query string
  ↓ normalizeText()    — lowercase, strip punctuation, normalize spaces
  ↓ tokenizeQuery()    — split, filter <2-char tokens, run stemToken()
  ↓ scoreItemMatch()   — score each item
  ↓ rankItemsByQuery() — filter score > 0, sort desc, tie-break by date
```

### Scoring Weights

| Signal | Points |
|---|---|
| Exact full phrase in title | +160 |
| Exact phrase in description | +100 |
| Exact phrase in location | +90 |
| Exact phrase in poster name | +85 |
| Exact phrase in category | +70 |
| Token in title | +45 |
| Stemmed title match | +40 |
| Token in location | +38 |
| Token in category | +30 |
| Token in poster name | +30 |
| Stemmed category match | +26 |
| Token in description | +26 |
| Stemmed poster match | +24 |
| Synonym expansion match | +24 |
| Stemmed description match | +22 |
| Fuzzy/Levenshtein match | +18 |
| All tokens matched (bonus) | +80 |
| 66%+ tokens matched | +35 |

### Synonym Families (Key Groups)

- **Electronics:** calc/casio → calculator, earbuds/airpods → earphones/headphones, laptop/macbook, phone/iphone/mobile, charger/adapter/cable
- **Documents:** id/card → identity/hallticket/lanyard/rfid, wallet → purse/pouch/money
- **Accessories:** keys/key/keychain, watch/smartwatch/casio, specs/glasses/spectacles
- **Campus Locations:** canteen → cafeteria/mess, library → lib/books, quad → quadrangle/ground, lab → computer/workshop
- **Books:** book/books/textbook/notes

### Fuzzy Matching

- Only for tokens ≥ 4 characters
- Max Levenshtein distance: 1 for tokens ≤5 chars, 2 for longer
- Skips if length difference exceeds max distance

---

## 13. Claim & Verification Workflow

### Flow

```
1. BROWSE: Claimant finds a listing they recognize
2. CLICK: "This is mine" / "I found this" → ClaimModal opens
3. SUBMIT: Claimant writes a verification message (15–500 chars)
   → enforce_claim_insert trigger validates + creates claim as 'pending'
   → Notification dispatched to item owner via create_notification()
4. REVIEW: Owner opens Dashboard → Inbox tab → sees claimant details
5. ACCEPT: Owner can enter meeting details + accept claim
   → claim.status = 'approved'
   → sibling claims auto-rejected (✅ **Verified:** via `after_claim_update_notify` trigger)
   → claimant notified
6. DECLINE: Owner rejects with optional reason
   → claim.status = 'rejected'
   → claimant notified
7. MARK RETURNED: Owner marks item as returned
   → item.status = 'returned'
   → listing removed from public board
```

### Constraints

- One claim per user per item (`UNIQUE(item_id, user_id)`)
- Cannot claim own items (`enforce_claim_insert`)
- Cannot claim items already `claimed` or `returned`
- Cannot claim soft-deleted items
- Status transitions: `pending` → `approved` | `rejected` | `withdrawn`; no reversal once resolved
- Claimant can delete (`withdrawn`) their own pending claim before owner reviews

---

## 14. Notification System (In-App + Optional Email)

### Responsibilities

- **Database (✅ Verified):** Authoritative creation of notification records (via `create_notification` RPC and Postgres triggers).
- **Frontend:** Reads notifications, marks them read, deletes user-owned notifications, and displays toasts/browser alerts.
- **Realtime:** Informs the client that data changed (no raw notification data sent to unauthorized users).
- **Edge Function (Optional):** Delivery to Resend API.
- **Email:** Non-critical secondary delivery channel. Failure here never blocks the underlying claim or handover action.

### In-App Notifications

All notifications go through `public.create_notification()` SECURITY DEFINER function — never direct client INSERT.

**Frontend dispatch:** `src/services/notifications.ts` → `notifyUser()` wraps the RPC call with type-safe arguments.

**Notification routing:** `src/lib/notification-routing.ts` → `hrefForNotification(notification)` maps `kind` field to the correct URL:
- `'claim'` → `/dashboard?tab=inbox`
- `'match'` → `/items/:related_item_id`
- `'return'` → `/items/:related_item_id`
- default → `/dashboard`

**Unread count:** `Navbar.tsx` uses TanStack Query with Supabase Realtime invalidation to show unread badge.

**Bulk actions:** Dashboard Notifications tab supports "Mark all read" and "Clear all" (soft delete from client).

### Optional Email Notifications

**`supabase/functions/notify-email/`** — Deno edge function.
- Triggered by a Postgres trigger on `notifications INSERT`
- Uses Resend API (`RESEND_API_KEY` Supabase secret)
- Only fires if `RESEND_FROM_EMAIL` and `SITE_URL` secrets are set
- In-app notifications work without this — email is purely additive

> 🚧 **AI-Matcher Edge Function:** A `supabase/functions/ai-matcher/` directory may exist in configuration, but it is explicitly disabled in `supabase/config.toml` and is not part of the active runtime architecture.

---

## 15. Real-Time Architecture (Supabase Realtime)

**Hook:** `src/hooks/use-notification-realtime.ts` — `useNotificationRealtime()`

Subscribed in `AppShell` (runs for entire session):

```typescript
supabase
  .channel(`notifications:${user.id}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    // Shows toast if tab is visible, desktop notification if hidden
    // Invalidates: unread-notifications-count, dashboard queries
  })
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'claims'
  }, () => {
    // Invalidates dashboard queries on any claim change
  })
```

**App Settings real-time** (in `AuthContext.tsx`):
- Subscribes to `postgres_changes` on `app_settings` for `UPDATE` events
- Re-evaluates current session if `sfit_email_lock` changes

---

## 16. File Upload & Storage Architecture

**Bucket:** `item-images` (Supabase Storage)

### Architectural Flaw: Unbounded user-generated object storage with client-dependent enforcement and no deterministic media lifecycle

Currently, limits (5 MB, MIME types, 5 files/item) are primarily enforced client-side (`item-validation.ts`). While the Supabase bucket configuration *can* enforce MIME and size limits, they are currently not configured with server-enforced file-type and size restrictions.

### Recommended Secure Upload Architecture

Instead of allowing the browser to determine upload constraints, the architecture should evolve to an AWS-style secure upload pattern:

```text
Browser
   │ "I want to upload 2 images"
   ↓
/api/upload-authorize (Edge Function)
   │
   ├── authenticated?
   ├── item belongs to user?
   ├── image count <= 5?
   ├── declared size <= limit?
   └── allowed MIME type?
          │
          ↓
   signed upload permission
          │
          ↓
   Supabase Storage (direct object storage)
```

### Event-Driven Image Processing & Delivery

Do not serve the original 5 MB JPEGs just because they are in Storage. The storage delivery architecture should separate the original content from generated assets using Supabase's image transformations and Smart CDN (cursor-based pagination for large buckets):

```text
Original Upload → Supabase Storage → Event Trigger (Processing)
                                        ↓
                                 Validate & Optimize
                                        ↓
                         Transformed Assets (Thumbnail/Card)
                                        ↓
                                    Smart CDN
                                        ↓
                                     Browser
```

### Deterministic Media Lifecycle

Currently, soft-deleting an item leaves the image files in storage. To prevent storage exhaustion, the object lifecycle must be decoupled from database row deletion:

```text
ACTIVE → SOFT DELETED → RETENTION PERIOD (e.g. 30 days) → BACKGROUND CLEANUP JOB → STORAGE API DELETE → PURGED
```

*Note: Database metadata deletion (`DELETE FROM items`) is not enough. You must actively delete via the Storage API or use an asynchronous reconciliation job.*

---

## 17. UI Component Architecture

### Component Hierarchy

```
src/components/
  common/
    ErrorBoundary.tsx        — Wraps entire app, catches render errors
    AuthPromptModal.tsx      — "Sign in to post" / "Sign in to claim" modal
    GlowAction.tsx           — Magnetic glow button with @property --mouse-angle tracking
    Logo.tsx                 — "CampusFind" logotype link
    NetworkStatusNotifier.tsx — navigator.onLine listener → toast
    PageTransition.tsx       — Route fade + AuthCurtain (full-screen wipe on sign-in/out)
    Skeletons.tsx            — PosterSkeleton (grid card), ListRowSkeleton, DashRowSkeleton, RouteSkeleton
  layout/
    Navbar.tsx               — Fixed top bar, theme toggle, unread notification badge (Supabase Realtime)
    MobileDock.tsx           — iOS floating bottom bar, drag physics, Spring snap
    Footer.tsx               — Links: FAQ, Privacy, Terms, About
    LegalLayout.tsx          — Clean wrapper for /privacy and /terms
  ui/
    (50+ shadcn/Radix components — button, dialog, card, badge, avatar, tabs, select, etc.)
```

### Design System Tokens (`src/index.css`)

All design tokens are CSS custom properties on `:root` / `.dark`:
- `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, etc.
- `--radius`: `0.5rem`
- Custom easing: `cubic-bezier(0.22, 1, 0.36, 1)` (Apple spring)
- Custom animations: fade-in, slide-up, scale-in, pulse-glow

### Tailwind Config (`tailwind.config.ts`)

Extended with:
- All CSS variable colors mapped to Tailwind tokens
- `container` centered with max-width `1400px`
- Custom animation keyframes

---

## 18. Motion Design & Gesture Architecture

### GooeySearchBar (`src/features/items/components/GooeySearchBar.tsx`)

SVG filter implementation:
```html
<filter id="gooey-filter">
  <feGaussianBlur stdDeviation="4.5" result="blur" />
  <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" />
</filter>
```
- The `feColorMatrix` raises alpha contrast, creating a "merge" effect between adjacent elements
- On mobile: runs an intro peek animation to show tactile potential
- Search bar is **right-pinned** — only width expands, no positional jump

### MobileDock (`src/components/layout/MobileDock.tsx`)

- Uses `refs` (not state) for gesture tracking to avoid React re-render jitter
- `translate3d()` for GPU-accelerated movement
- Squash-and-stretch: dock pill elongates on drag, springs back on release
- Spring curve: `cubic-bezier(0.22, 1, 0.36, 1)` — Apple's standard spring easing
- Monotonic translation (no mid-flight reversal hitching)

### GlowAction (`src/components/common/GlowAction.tsx`)

- Tracks `mousemove` on button, computes angle to center
- Uses `requestAnimationFrame` to set CSS `@property --mouse-angle`
- Gradient rotates to follow cursor, creating a "magnetic" glow border

### PageTransition + AuthCurtain (`src/components/common/PageTransition.tsx`)

- Route changes trigger a CSS fade transition
- Auth state changes (sign-in / sign-out) trigger an `AuthCurtain`: full-screen black wipe that covers the transition between authenticated and unauthenticated views

---

## 19. Contexts & Global State

| Context | File | What it provides |
|---|---|---|
| `AuthContext` | `contexts/AuthContext.tsx` | `user`, `session`, `loading`, `signInWithGoogle`, `signInWithGoogleIdToken`, `signOut` |
| `ThemeContext` | `contexts/ThemeContext.tsx` | `theme`, `setTheme` — `'light' \| 'dark' \| 'system'` |
| `AuthPromptContext` | `contexts/AuthPromptContext.tsx` | `showAuthPrompt()` — opens the "sign in first" modal |

---

## 20. Hooks Catalog

| Hook | File | Purpose |
|---|---|---|
| `useAuth()` | `contexts/AuthContext.tsx` | Access auth state |
| `useTheme()` | `contexts/ThemeContext.tsx` | Read/set theme |
| `useAuthPrompt()` | `contexts/AuthPromptContext.tsx` | Trigger auth modal |
| `useNotificationRealtime()` | `hooks/use-notification-realtime.ts` | Subscribe to notifications channel |
| `useIsMobile()` | `hooks/use-mobile.tsx` | Boolean, true if viewport < 768px |
| `useSfitEmailLock()` | `hooks/use-sfit-email-lock.ts` | Read the runtime email lock setting |
| `useToast()` | `hooks/use-toast.ts` | Programmatic toast queue |

---

## 21. Constants & Design Tokens

**`src/constants/index.ts`**

| Constant | Type | Description |
|---|---|---|
| `CATEGORIES` | readonly array | 8 item categories with `value`, `label`, `icon` (Lucide icon name) |
| `LOCATIONS` | readonly array | 14 SFIT campus locations |
| `STATUS_STYLES` | Record | Tailwind classes per status (`lost`, `found`, `claimed`, `returned`) |
| `CATEGORY_STYLES` | Record | Tailwind classes per category |

---

## 22. Type System

### Front-Facing Types (`src/types/database.ts`)

- `DBItem` — minimal item shape used in Dashboard
- `DBClaim` — claim with nested `items` and `profiles` joins
- `DBNotification` — notification with routing fields
- `DashboardData` — `{ myItems, myClaims, notifications, incomingClaims }`

### Feature Types (`src/features/items/types.ts`)

- `ItemStatus` — `'lost' | 'found' | 'claimed' | 'returned'`
- `ItemWithImage` — hydrated item with `image_url` and `poster_name`
- `RawItem` — raw item from Postgres RPC (no hydrated fields)
- `ItemFilters` — `{ keyword, status, category, location }`

### Generated Types (`src/integrations/supabase/types.ts`)

Auto-generated from Supabase schema. Covers all tables, views, enums, and RPCs. **Do not edit manually** — regenerate with `supabase gen types typescript`.

---

## 23. Testing Architecture

**Runner:** Vitest 3.x + jsdom  
**Config:** `vitest.config.ts` → `environment: 'jsdom'`, `setupFiles: ['src/test/setup.ts']`

### Test Files

| File | Covers |
|---|---|
| `email.test.ts` | `isAllowedSfitEmail`, `isSfitEmailDomain`, `formatAuthError`, email lock behavior |
| `item-filters.test.ts` | URLSearchParams serialization, round-trip filter parsing |
| `item-validation.test.ts` | File MIME/size checks, claim message length, deduplication |
| `search-engine.test.ts` | Scoring weights, synonym expansion, fuzzy matching, ranking order |
| `network-status.test.tsx` | NetworkStatusNotifier toast behavior |
| `setup.ts` | jsdom `matchMedia` mock |

### Run Commands

```bash
npm test           # vitest run (single pass)
npm run test:watch # vitest (watch mode)
```

---

## 24. Deployment Architecture (Vercel)

**Platform:** Vercel Hobby (free)

### `vercel.json`

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    { "key": "X-Frame-Options", "value": "DENY" },
    { "key": "X-Content-Type-Options", "value": "nosniff" },
    { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
    { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
    { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
    { "key": "Content-Security-Policy", "value": "..." }
  ]
}
```

**CSP allows:**
- Scripts: `'self' 'unsafe-inline'` + `https://apis.google.com` (GIS)
- Styles: `'self' 'unsafe-inline'` + Google Fonts
- Images: `'self' data: blob:` + Supabase CDN + Google profile pictures + Unsplash
- Connect: `'self'` + Supabase REST/Realtime WSS
- `frame-ancestors: 'none'` (blocks iframes)

**Vite build chunking:**
- `react-vendor`: `react`, `react-dom`, `react-router-dom`
- `supabase`: `@supabase/supabase-js`
- `react-query`: `@tanstack/react-query`

All other code is page-level lazy chunks.

---

## 25. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | `https://[project-ref].supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key (safe to expose — governed by RLS) |
| `VITE_GOOGLE_CLIENT_ID` | Yes | Google Cloud OAuth 2.0 Web Client ID |
| `RESEND_API_KEY` | Optional | Resend email API key (Supabase secret) |
| `RESEND_FROM_EMAIL` | Optional | From address for email notifications |
| `SITE_URL` | Optional | Production URL for email links |

> **Never put `service_role` key in the frontend.** The anon key is the only Supabase credential used client-side.

---

## 26. Zero-Dollar Cost Model

| Service | Free Tier Limit | CampusFind Usage |
|---|---|---|
| Supabase DB | 500 MB | Text records → < 1 MB for 10k listings |
| Supabase Storage | 1 GB | ⚠️ **Risk:** 500 items × 5 images × 300 KB average = ~750 MB. Uncompressed max size (12.5 GB) would exceed the free tier. |
| Supabase MAU | 50,000/month | SFIT has ~3,500 people → ~7% of limit |
| Supabase Edge Functions | 500,000 invocations | notify-email only (not required) |
| Vercel Bandwidth | 100 GB/month | SPA + images via Supabase CDN |
| Google Cloud (GIS/OAuth) | Free | No billing required for Web OAuth |
| Resend | 3,000 emails/month free | Optional; not needed for core function |

**Inactivity protection:** Supabase pauses projects after 7 days of zero traffic. Organic student usage prevents this during semesters. For breaks, a GitHub Action cron ping to the Supabase REST health endpoint prevents auto-pause.

**Storage Policy Recommendations (🚧 Planned):**
- Compress images before upload.
- Generate smaller WebP/AVIF derivatives.
- Enforce a total per-user storage quota.
- Delete abandoned upload files.
- Delete images when an item is permanently removed.
- Add an admin cleanup process.
- Track storage usage.

---

## 27. Rate Limits & Abuse Prevention

All limits enforced by Postgres triggers — not client-side:

| Action | Limit | Trigger |
|---|---|---|
| Post new item | 10 per 24 hours | `check_item_posting_rate_limit` |
| Submit claim | 15 per 24 hours | `check_claim_submitting_rate_limit` |
| Send notification | 20 per 1 hour | `create_notification` inline check |
| Claim message length | 15–500 chars | `enforce_claim_insert` |
| Meeting details length | ≤ 500 chars | `enforce_claim_update` |
| Images per item | 5 max | Client-side (`item-validation.ts`) |
| Image file size | 5 MB max | Client-side (⚠️ Needs verification: Server-side file-size enforcement) |
| Image MIME types | jpeg/png/webp only | Client-side (⚠️ Needs verification: Server-side MIME restrictions, SVG rejection) |

---

## 28. Dashboard Architecture

Dashboard (`src/pages/Dashboard.tsx`) is a single-file, multi-tab console. It is the largest file in the project (~77 KB).

### Tabs

| Tab | Key | Content |
|---|---|---|
| My Items | `my-items` | User's own listings with status controls, reopen, mark returned |
| My Claims | `my-claims` | Claims user submitted on others' items; segmented filter (All/Active/Resolved); clear/dismiss functionality |
| Inbox | `inbox` | Incoming claims on user's items; dual-panel triage queue (Apple Mail grade) |
| Notifications | `notifications` | All notifications; All/Unread toggle; bulk mark-read; bulk clear |

### Inbox Architecture (Apple Mail grade)

- Fixed-height dual-panel: left = claims queue, right = inspection console
- Both panels scroll independently (`overflow-y-auto`)
- Left panel: 56px header with count + segmented control
- Right panel: 56px header with claimant avatar + name + timestamp
- 3-card inspection console:
  - **Card 1:** Profile context (avatar initials, name, timestamp, item thumbnail, "View item" link)
  - **Card 2:** Verification proof (ShieldCheck icon, claim message in elevated quote well)
  - **Card 3:** Handover console (location input, Accept + Decline buttons with tactile press physics)

### My Claims Lifecycle Rail

3-stage progress bar: `Submitted` → `Review` → `Handover`
- 2px rounded horizontal indicators
- Status mapped: `pending` = Review stage, `approved` = Handover, `rejected/withdrawn` = terminated

### Claim Clearance

- Individual "Clear" on resolved/rejected claims
- Bulk "Clear resolved" in tab header
- `clearClaim()` attempts Supabase delete first, falls back to `localStorage` dismissal key (`campusfind_dismissed_claims_${userId}`)
- Dismissed IDs persist across sessions

---

## 29. Critical Rules for Maintainers & AI Agents

1. **Zero paid dependencies** — do not add Algolia, Typesense, Twilio, SendGrid, OpenAI, or any service that requires billing. Everything must stay within free tiers.

2. **Never weaken the email guard** — `isAllowedSfitEmail`, `isSfitEmailDomain`, and the `check_signup_email_domain` trigger are all required. Do not remove or disable any of them.

3. **Never expose poster emails** — the `contact_email` column is permanently dropped. Do not re-introduce email fields in items, and never return emails from public RPCs.

4. **All notifications via `create_notification()`** — never insert directly into the `notifications` table from the client. The RPC is the only authorized path.

5. **Item Soft deletes** — ✅ **Verified:** Items require soft deletion. The `soft_delete_item` trigger intercepts DELETE and sets `deleted_at`. However, **Claims** may be physically deleted by claimants (according to RLS), and **Notifications** may be physically deleted by users.

6. **Respect the design system** — use tokens from `index.css`, the `cn()` utility, and established component patterns. Apple spring curve: `cubic-bezier(0.22, 1, 0.36, 1)`.

7. **Update `brain.md` after significant changes** — the brain file is the living codebase reference. Update it when: new files are added, architecture changes, migration added, or behavior changes meaningfully.

8. **Update `README.md` per the rule in `.agents/rules/readme-update.md`** — check trigger conditions before deciding whether README needs updating.

9. **Always use parameterized Supabase queries** — never concatenate user input into `.eq()`, `.filter()`, or `.rpc()` calls.

10. **VITE_SUPABASE_PUBLISHABLE_KEY is public** — it's the anon key, governed by RLS. The `service_role` key must never appear in any frontend file or environment.

---

## 30. Known Patterns & Conventions

### `cn()` utility
```typescript
import { cn } from "@/lib/utils";
// cn(clsx(...), tailwind-merge) — use for all conditional className strings
```

### Data fetching pattern (TanStack Query)
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ["items", filters],
  queryFn: () => fetchBrowseItems(filters),
});
```

### Invalidating after mutations
```typescript
const qc = useQueryClient();
qc.invalidateQueries({ queryKey: ["dashboard", user.id] });
```

### Supabase RPC call pattern
```typescript
const { data, error } = await supabase.rpc("function_name", { param: value });
if (error) throw error;
```

### Auth guard pattern
```typescript
const { user } = useAuth();
const { showAuthPrompt } = useAuthPrompt();
// In click handler:
if (!user) { showAuthPrompt(); return; }
```

### Status badge pattern
```typescript
import { STATUS_STYLES } from "@/constants";
const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.lost;
// style.border, style.bg, style.text, style.label
```

### Adding a new location
1. Add string to `LOCATIONS` in `src/constants/index.ts`
2. Add relevant synonyms to `SYNONYMS` in `src/features/items/utils/search-engine.ts`

### Adding a new category
1. Add to `CATEGORIES` array in `src/constants/index.ts`
2. Add to `CATEGORY_STYLES` in `src/constants/index.ts`
3. Add value to Postgres enum: `ALTER TYPE public.item_category ADD VALUE 'new_value';`
4. Regenerate `src/integrations/supabase/types.ts`

### Writing a new migration
1. Create `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Wrap all functions in `SECURITY DEFINER SET search_path = public`
3. Test in Supabase SQL editor on staging first
4. Update `brain.md` migration history section

---

## 31. Known Architecture Debts (🚧 Planned Improvements)

1. **Premature Candidate Truncation in Application-Layer Search:** Search is capped at the 100 newest rows before fuzzy matching even begins. Must be moved to Postgres indexed search (FTS + pg_trgm) so LIMIT happens *after* retrieval and ranking.
2. **Unbounded User-Generated Object Storage:** Client-dependent enforcement with no deterministic media lifecycle. Needs an upload-authorization endpoint, event-driven processing, and a background cleanup job to purge soft-deleted media via the Storage API.
3. **Dashboard Monolith:** `Dashboard.tsx` is ~77KB covering 4 unrelated tabs. It should be split into per-tab components for maintainability.
4. **Home Page Inefficiency:** The home page currently makes 3 separate full-table RPC calls (`fetchRecentItems`, `fetchHomeStats`, and `fetchBrowseItems` all hit `list_public_items()` independently). A `SELECT count(*) FILTER(...)` for stats would be more efficient.
5. **CSP Enhancements:** The current CSP uses `'unsafe-inline'` for scripts, which defeats most XSS protection. It also allows `unsplash.com` which is unused. Nonces or hashes should be introduced.
6. **RLS Test Coverage:** Security-critical logic (RLS, rate limits, email domain gate) lives entirely in Postgres but lacks automated unit testing (pgTAP or equivalent).

---

*This document reflects the CampusFind codebase as of September 2026. Update this file alongside `brain.md` whenever significant architectural changes are made.*
