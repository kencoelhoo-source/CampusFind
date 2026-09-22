# CampusFind — Master Technical Architecture & Codebase Brain (`brain.md`)
> **Internal Technical Reference & Zero-Cost Operations Manual**  
> **Project**: CampusFind (SFIT Lost & Found Portal)  
> **Maintainer / Creator**: Ken Coelho  
> **Target Institution**: St. Francis Institute of Technology (SFIT), Mumbai  
> **Production Status**: Production-Ready / Continuous Deployment on Vercel  
> **Cost Profile**: **Strictly $0.00 / month (100% Free Forever Tier Architecture)**  
> **Last Updated**: September 2026
>
> **Companion Files**:  
> - `ARCHITECTURE.md` — Deep-dive architecture reference for AI agents & contributors (30 sections, every subsystem documented)  
> - `.agents/rules/readme-update.md` — Rule: when and how to update `README.md` after codebase changes  
> - `README.md` — Public-facing project documentation (no AI checker / AI readiness section)

---

## 1. Executive Summary & Core Philosophy

**CampusFind** is an open-source, campus-confined Lost & Found web portal engineered specifically for St. Francis Institute of Technology (SFIT), Mumbai. Its primary objective is solving misplaced belongings on campus through a modern, high-trust, friction-free verification workflow.

### Architectural Tenets
1. **Zero-Dollar Operational Cost ($0 / month)**: As a student project, all infrastructure must operate permanently within the generous free tiers of modern cloud providers (Vercel Hobby, Supabase Free Tier, Google Cloud Platform Free Tier). No paid third-party APIs (no Algolia, no Twilio, no SendGrid, no OpenAI billings).
2. **SFIT Perimeter Security**: Only authenticated users with official SFIT Google accounts (`@student.sfit.ac.in` and `@sfit.ac.in`) can sign in, post items, submit claims, or receive alerts. External Gmail or lookalike domains are blocked at both client, context, and database trigger levels.
3. **Privacy by Default**: Public listings intentionally redact poster emails and direct personal numbers. Only the poster's display name and item details are public. Claims and verification exchanges remain strictly private 1:1 between finder and claimant.
4. **Instant In-Memory Precision Search**: Avoid costly external search services. The portal uses a specialized in-memory scoring engine (`search-engine.ts`) with custom campus-specific synonyms, base stemmer, typo tolerance (Levenshtein distance), and cross-field token relevance scoring.
5. **Apple-Grade Visual & Motion Aesthetic**: Designed with an ultra-polished Apple-inspired UI — SF Pro typography, refined glassmorphic surfaces (`backdrop-filter`), smooth spring curves (`cubic-bezier(0.22, 1, 0.36, 1)`), fluid gesture-driven mobile dock with live physics, and custom SVG gooey metaball search bar.

---

## 2. Zero-Cost ($0/Month) Student Strategy & Free Tier Limits

Every component of CampusFind is deliberately designed so that Ken will **never be billed**. Below is the exhaustive audit of every external service, its free limits, and how the codebase stays safely inside them:

### 2.1 Supabase (Backend, Postgres, Auth, Storage) — Free Tier Quotas
* **Database Size**: **500 MB** included free.
  * *Codebase defense*: Text records for items, claims, and notifications are lightweight (kilobytes). Soft deletes are implemented, and contact emails are stripped. 500 MB easily holds over 250,000 active listings.
* **File Storage (Supabase Storage)**: **1 GB** free.
  * *Codebase defense*: Strict client-side validation in `item-validation.ts` limits photos to **5 MB max**, accepts only JPG, PNG, and WebP, caps images at **5 photos per item**, and deduplicates files by content signature before upload. Furthermore, when an item is deleted, its images are removed from the bucket.
* **Monthly Active Users (MAU)**: **50,000 MAU** included free.
  * *Campus reality*: SFIT has ~3,000–4,000 students and faculty total. The entire college body at peak activity consumes less than 8% of the free MAU allowance.
* **Edge Functions & Egress**: **500,000 Edge invocations** and **2 GB egress bandwidth** monthly.
  * *Codebase defense*: Edge functions are disabled in `supabase/config.toml` (`ai-matcher enabled = false`). Notifications are created entirely inside Postgres via an RPC stored function (`create_notification`), keeping database egress near zero.
* **Preventing Database Inactivity Pause**:
  * Free Supabase projects pause after 7 consecutive days of zero traffic. Because CampusFind is actively used by students, organic traffic keeps it alive. For extended semester breaks, any simple scheduled ping (e.g. GitHub Action cron hitting the public Supabase REST health endpoint) prevents auto-pausing.

### 2.2 Hosting & Edge Delivery — Vercel (Hobby Tier)
* **Cost**: **$0.00**
* **Bandwidth Allowance**: **100 GB / month**
* **Builds**: 6,000 build minutes / month.
* **Features Used**:
  * SPA rewrite rules (`vercel.json`) routing all routes `/(.*)` to `/index.html`.
  * Edge HTTP security headers configured in `vercel.json` (HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Strict Permissions-Policy).
  * Fast Rollup asset hashing and Brotli/Gzip compression out of the box.

### 2.3 Authentication — Google Identity Services & OAuth 2.0
* **Cost**: **$0.00** forever via Google Cloud Console.
* **Usage**: Web Client ID created in Google Cloud Platform requires no paid subscription or billing account.
* **FedCM Ready**: Configured with `use_fedcm_for_prompt: true` to prevent future third-party cookie deprecation breakages in Chrome.

### 2.4 Search & Notification Overhead
* **Search Cost**: **$0.00**. No Algolia, Elasticsearch, or Typesense server to pay for. Runs 100% on the client CPU using TypeScript algorithms.
* **Email & SMS Cost**: **$0.00**. No Twilio, Resend, or SendGrid keys. Notifications are real-time, in-app notifications stored in Postgres and polled via TanStack React Query.

---

## 3. Technology Stack & Dependency Inventory

### Core Framework & Build Tools
| Dependency | Version | Purpose |
|---|---|---|
| `react` / `react-dom` | `^18.3.1` | Core UI engine, React 18 concurrent features |
| `vite` | `^5.4.19` | Next-generation frontend tooling and rapid HMR dev server |
| `@vitejs/plugin-react-swc` | `^3.11.0` | Rust-based SWC compiler for near-instant JSX/TS compilation |
| `typescript` | `^5.8.3` | Type safety and autocompletion across frontend and database models |
| `vitest` | `^3.2.4` | High-speed unit test runner compatible with Vite configuration |
| `jsdom` | `^20.0.3` | Headless DOM environment for automated testing |

### UI, Styling & Motion
| Dependency | Version | Purpose |
|---|---|---|
| `tailwindcss` | `^3.3.3` | Utility-first CSS framework configured with Apple design tokens |
| `tailwindcss-animate` | `^1.0.7` | Pre-configured keyframe animations (accordion, fade, scale, slide) |
| `@tailwindcss/typography` | `^0.5.16` | Clean typography rendering for legal and FAQ articles |
| `lucide-react` | `^0.462.0` | Modern, clean vector icon set |
| `clsx` + `tailwind-merge` | `^2.1.1` / `^2.6.0` | Intelligent conditional className joining (`cn()` utility) |
| `class-variance-authority` | `^0.7.1` | Component variant styling pattern (used by shadcn components) |
| `sonner` | `^1.7.4` | Sleek toast alert system |
| `embla-carousel-react` | `^8.6.0` | Lightweight, touch-friendly carousel engine |
| `vaul` | `^0.9.9` | iOS-style drawer primitive |

### Radix UI Primitives (shadcn/ui Foundation)
* `@radix-ui/react-accordion`, `react-alert-dialog`, `react-avatar`, `react-checkbox`, `react-dialog`, `react-dropdown-menu`, `react-popover`, `react-select`, `react-separator`, `react-tabs`, `react-tooltip`, `react-slot`, `react-switch`, `react-scroll-area`
* Provide fully accessible, unstyled, WAI-ARIA compliant foundational widgets customized via `index.css`.

### Backend & State Management
| Dependency | Version | Purpose |
|---|---|---|
| `@supabase/supabase-js` | `^2.97.0` | Supabase JavaScript client for DB queries, Auth, and Storage |
| `@tanstack/react-query` | `^5.83.0` | Server-state caching, automatic cache invalidation, background refetching |
| `react-router-dom` | `^6.30.1` | Client-side routing with hash and query param synchronization |
| `react-hook-form` + `@hookform/resolvers` | `^7.61.1` / `^3.10.0` | Form handling with high performance and zero re-renders |
| `zod` | `^3.25.76` | Schema declaration and validation |
| `date-fns` | `^3.6.0` | Date manipulation and display formatting |

---

## 4. Complete Codebase Directory & File Catalog

```
CampusFind/
├── .env.example                     # Sample environment variable template
├── components.json                  # shadcn/ui configuration metadata
├── eslint.config.js                 # ESLint flat configuration
├── index.html                       # HTML5 entry with preconnected Google Fonts & metadata
├── package.json                     # Project manifest, scripts, and dependencies
├── postcss.config.js                # PostCSS setup with Tailwind & Autoprefixer
├── tailwind.config.ts               # Custom design system tokens, colors, easing curves
├── tsconfig.json                    # Base TypeScript compiler configuration
├── tsconfig.app.json                # TypeScript compiler config for frontend source
├── tsconfig.node.json               # TypeScript compiler config for Vite build scripts
├── vercel.json                      # Vercel deployment headers and routing rewrite rules
├── vite.config.ts                   # Vite bundler, SWC plugin, and manual chunking rules
├── vitest.config.ts                 # Vitest testing configuration with jsdom
│
├── public/                          # Public static assets
│   ├── favicon.png                  # Application browser icon
│   ├── placeholder.svg              # Fallback vector placeholder
│   └── robots.txt                   # Web spider instructions
│
├── src/
│   ├── main.tsx                     # React root mount (`createRoot`)
│   ├── App.tsx                      # App shell, providers, route definitions with lazy loading
│   ├── App.css                      # Legacy baseline CSS
│   ├── index.css                    # Design system foundation: tokens, variables, classes, animations
│   ├── vite-env.d.ts                # TypeScript declarations for Vite client and environment variables
│   │
│   ├── assets/                      # Static branding and background assets
│   │   ├── hero-campus.jpg          # Desktop hero background image
│   │   ├── hero-mobile.jpg          # Mobile-optimized hero banner
│   │   ├── c4829165-...png          # Desktop Auth background wallpaper (SFIT campus seal)
│   │   ├── 940888dc-...png          # Mobile Auth background wallpaper
│   │   └── ...                      # Theme and CTA illustration graphics
│   │
│   ├── constants/
│   │   └── index.ts                 # CATEGORIES, LOCATIONS, STATUS_STYLES, CATEGORY_STYLES
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx          # Supabase auth session, Google login, domain guard, signOut
│   │   └── ThemeContext.tsx         # Dark / Light theme provider with persistence
│   │
│   ├── data/
│   │   └── faqs.ts                  # Static question-and-answer pairs for the FAQ section
│   │
│   ├── features/
│   │   └── items/
│   │       ├── types.ts             # ItemWithImage, RawItem, ItemFilters, ItemStatus types
│   │       ├── components/
│   │       │   ├── ClaimModal.tsx   # Dialog to submit claims / message owner
│   │       │   ├── GooeySearchBar.tsx # Interactive search bar with SVG metaball physics
│   │       │   ├── ItemCard.tsx     # Item presentation card (poster and list layouts)
│   │       │   └── SearchFilters.tsx# Search inputs, status/category/location dropdowns
│   │       ├── services/
│   │       │   └── itemsApi.ts      # Data fetching: fetchRecentItems, fetchBrowseItems, fetchHomeStats, fetchItemDetail, hydrateItems
│   │       └── utils/
│   │           ├── item-filters.ts  # URLSearchParams serialization and parsing helpers
│   │           ├── item-validation.ts # File size/type validation, deduplication, claim text checks
│   │           └── search-engine.ts # In-memory search scoring engine (synonyms, stemming, Levenshtein)
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx           # Window resize media listener for mobile breakpoint (< 768px)
│   │   └── use-toast.ts             # Hook managing toast notification queues
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts            # Supabase JS client instantiation with environment credentials
│   │       └── types.ts             # TypeScript definitions matching Postgres schema (tables, enums, RPCs)
│   │
│   ├── lib/
│   │   ├── email.ts                 # Allowed SFIT email domains check (`isAllowedSfitEmail`)
│   │   ├── google-gis.ts            # Google Identity Services SDK dynamic loader & SHA-256 nonce generator
│   │   ├── utils.ts                 # Tailwind class merger (`cn()`)
│   │   └── [re-exports]             # Backward-compatible barrels for modular paths
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── GlowAction.tsx       # Pointer-tracked magnetic glow button using `@property --mouse-angle`
│   │   │   ├── Logo.tsx             # CampusFind typography logo link
│   │   │   ├── NavLink.tsx          # Router NavLink wrapper with active state styling
│   │   │   ├── PageTransition.tsx   # Smooth route fade transition and auth change curtain
│   │   │   └── Skeletons.tsx        # Ghost loading placeholders (PosterSkeleton, ListRowSkeleton, DashRowSkeleton)
│   │   ├── layout/
│   │   │   ├── Navbar.tsx           # Fixed glassmorphic navigation header with unread notification badge
│   │   │   ├── MobileDock.tsx       # Floating iOS-style bottom dock with interactive gesture physics
│   │   │   ├── Footer.tsx           # Page footer with institutional attribution and legal links
│   │   │   └── LegalLayout.tsx      # Clean container layout for Privacy and Terms pages
│   │   └── ui/                      # 50 shadcn/ui and Radix UI components (button, dialog, card, etc.)
│   │
│   ├── pages/
│   │   ├── Index.tsx                # Homepage: Hero, live stats, categories, recent items, CTA, FAQ
│   │   ├── Items.tsx                # Browse catalog: Full search engine, filters, grid/list view
│   │   ├── ItemDetail.tsx           # Detail view: Multi-image gallery, metadata, claim trigger, related items
│   │   ├── PostItem.tsx             # Create post form: Title, category, location, date, multi-image upload
│   │   ├── Dashboard.tsx            # User console: Posted items, My claims, Incoming claims, Notifications
│   │   ├── Auth.tsx                 # Login view: Google Identity Services / OAuth buttons, campus imagery
│   │   ├── FAQ.tsx                  # FAQ accordion list
│   │   ├── Privacy.tsx              # CampusFind privacy policy
│   │   ├── Terms.tsx                # Terms of use and community guidelines
│   │   └── NotFound.tsx             # 404 page
│   │
│   ├── services/
│   │   └── notifications.ts         # User notification RPC dispatch (`notifyUser`)
│   │
│   ├── test/
│   │   ├── email.test.ts            # Unit tests for SFIT domain validation & session rejection
│   │   ├── item-filters.test.ts     # Unit tests for search query parameter serialization
│   │   ├── item-validation.test.ts  # Unit tests for image types, size constraints, and claim lengths
│   │   ├── search-engine.test.ts    # Unit tests for ranking, synonyms, stemming, and fuzzy typo matching
│   │   └── setup.ts                 # Vitest jsdom setup and `matchMedia` mock
│   │
│   └── types/
│       └── database.ts              # Front-facing DB interfaces (DBItem, DBClaim, DBNotification, DashboardData)
│
└── supabase/
    ├── config.toml                  # Supabase local configuration and edge function flags
    └── migrations/                  # Sequential PostgreSQL migrations
        ├── 20260220140005_...sql    # Initial schema: enums, profiles, items, claims, notifications, RLS
        ├── 20260220140020_...sql    # Notification insert policy fix
        ├── 20260412120000_...sql    # Claims & notifications hardening (unique constraints, RPC function)
        ├── 20260617000000_...sql    # Security hardening: email triggers, rate limits, soft deletes
        ├── 20260909040000_...sql    # Launch hardening: claim insert/update triggers, storage folder RLS
        └── 20260909043000_...sql    # Drop contact_email column to prevent data leakage
```

---

## 5. Deep-Dive Subsystem Mechanics

### 5.1 Authentication & SFIT College Guard
The portal enforces a strict, multi-layer boundary allowing only legitimate SFIT students and faculty:

```
[User Browser]
      │
      ▼
1. Google Sign-In (GIS or OAuth Popup)
      │
      ▼
2. Client-Side Check (`isAllowedSfitEmail` in src/lib/email.ts)
   - Checks domain === 'student.sfit.ac.in' || 'sfit.ac.in'
   - If invalid: rejects session, clears token from URL, triggers supabase.auth.signOut()
      │
      ▼
3. Database Trigger (`check_signup_email_domain` in Postgres)
   - Executes BEFORE INSERT OR UPDATE OF email ON auth.users
   - Rejects non-SFIT domains at the database level with a SQL exception
```

* **Google Identity Services (GIS)**: `src/lib/google-gis.ts` dynamically injects `https://accounts.google.com/gsi/client`, creates a SHA-256 hashed cryptographic nonce, and calls `supabase.auth.signInWithIdToken()`.
* **OAuth Fallback**: If GIS is unavailable or blocked, falls back to `supabase.auth.signInWithOAuth({ provider: 'google' })`.
* **OAuth Error Interceptor**: In `AuthContext.tsx`, URL hash and search query errors (such as trigger rejections from Postgres) are intercepted and translated into user-friendly toast messages.

### 5.2 In-Memory Campus Search Engine (`src/features/items/utils/search-engine.ts`)
Instead of paid search SaaS services, CampusFind executes an intelligent in-memory relevance scoring algorithm:
1. **Stopword Stripping**: Removes noise terms (`a`, `an`, `the`, `in`, `on`, `at`, `near`, `found`, etc.).
2. **Text Normalization & Stemming**: Normalizes casing and punctuation; strips simple suffixes (`-ies` -> `-y`, `-es` -> root, `-s` -> root).
3. **Campus Synonym & Alias Expansion**:
   * `calc` / `casio` -> `calculator`, `fx991`, `scientific`
   * `earbuds` / `airpods` -> `earphones`, `headphones`, `tws`, `boat`, `noise`
   * `id` / `card` -> `identity`, `hallticket`, `lanyard`, `rfid`
   * `wallet` -> `purse`, `pouch`, `money`, `cash`
   * `canteen` -> `cafeteria`, `mess`, `food`, `snack`
   * `quad` -> `quadrangle`, `ground`
4. **Levenshtein Distance Fuzzy Match**: Matches misspelled words with length-dependent edit distance (e.g. `canten` matches `canteen`, `calcultor` matches `calculator`).
5. **Weighted Attribute Scoring**:
   * Exact full-phrase in Title: **+160**
   * Exact phrase in Description: **+100**
   * Exact phrase in Location: **+90**
   * Exact phrase in Poster Name: **+85**
   * Direct token match in Title: **+45**
   * Location match: **+38**
   * Poster name match: **+30**
   * Description detail match: **+26**
   * Synonym expansion match: **+24**
   * Typo/fuzzy match: **+18**
   * **All-Tokens Matched Multiplier**: If 100% of the query tokens appear across the item's fields, an extra **+80 bonus** is awarded.
6. **Recency Tie-Breaking**: Tied items are ordered newest first.

### 5.3 Claim & Verification Workflow
The claim mechanism replaces public contact details with a structured private negotiation:
1. **Submission**: Claimant submits a message describing verifying details (e.g., lock screen wallpaper, engraving, contents of bag) between 15 and 500 characters.
2. **Database Constraint**: `claims_item_user_unique` prevents duplicate claims for the same item by the same user.
3. **Trigger Enforcement (`enforce_claim_insert`)**:
   * Status is forced to `pending`.
   * Users cannot claim their own items.
   * Items marked with `deleted_at` or statuses other than `lost`/`found` cannot receive claims.
4. **Owner Review**: The owner receives an in-app notification and views the claim in `Dashboard.tsx`. They can **Accept** (triggering mutual campus meetup coordination) or **Decline**.

### 5.4 In-App Notification System (`src/services/notifications.ts`)
* Notifications are stored in the PostgreSQL `notifications` table.
* Dispatched exclusively via the stored SQL function `create_notification()`:
  * Verifies sender is authenticated (`auth.uid() IS NOT NULL`).
  * Enforces that sender and recipient are either item owner or claimant on a valid item.
  * Rate-limited: Maximum **20 notifications per hour** per user to prevent harassment or spam.
* Frontend polling in `Navbar.tsx` queries unread count every 15 seconds (`refetchInterval: 15000`) and displays a red badge with an animated pulse.

### 5.5 Multi-Image Upload & Storage Architecture
* Handled in `src/pages/PostItem.tsx`.
* Maximum **5 images** per post.
* Images are saved into Supabase Storage bucket `item-images`.
* Folder path schema: `${user_id}/${item_id}/${random_uuid}.${ext}`.
* Row Level Security on `storage.objects` strictly ensures users can only write inside their own `${auth.uid()}/` folder.
* Image URLs are saved in the `item_images` database table, linked via foreign key to `items(id) ON DELETE CASCADE`.

### 5.6 Motion Design & Gesture Architecture
* **MobileDock (`src/components/layout/MobileDock.tsx`)**:
  * Decoupled from standard re-renders using active refs and `translate3d()`.
  * Single monotonic translation without mid-flight hitching.
  * Dynamic SVG/CSS pill deformation: elongates on drag/travel (squash & stretch) and cushions smoothly on destination snap using `cubic-bezier(0.22, 1, 0.36, 1)`.
* **GooeySearchBar (`src/features/items/components/GooeySearchBar.tsx`)**:
  * Utilizes an inline SVG filter definition (`feGaussianBlur` stdDeviation 4.5 + `feColorMatrix` alpha contrast threshold) to create fluid liquid metaballs when expanding the search button on hover/focus.
  * On mobile touch screens, runs an intro peek animation to introduce the tactile feel without requiring hover.
* **GlowAction (`src/components/common/GlowAction.tsx`)**:
  * Tracks cursor coordinates relative to button center and interpolates mouse angle via CSS `@property --mouse-angle` inside `requestAnimationFrame`.

---

## 6. PostgreSQL Database Schema & Security Matrix

### 6.1 Tables & Columns

#### `profiles`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, default `gen_random_uuid()` | Profile record identifier |
| `user_id` | UUID | UNIQUE, REFERENCES `auth.users(id)` ON DELETE CASCADE | Linked Supabase user |
| `full_name` | TEXT | NULLABLE | User display name (synced from Google metadata) |
| `avatar_url` | TEXT | NULLABLE | Google profile picture URL |
| `department` | TEXT | NULLABLE | Academic department |
| `year` | TEXT | NULLABLE | Year of study (FE, SE, TE, BE) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | Last modification timestamp |

#### `items`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, default `gen_random_uuid()` | Item identifier |
| `user_id` | UUID | NOT NULL, REFERENCES `auth.users(id)` ON DELETE CASCADE | Poster's user ID |
| `title` | TEXT | NOT NULL | Item title (min 3 chars) |
| `description` | TEXT | NULLABLE | Description with visual details |
| `category` | `item_category` | NOT NULL, default `'other'` | Enum: electronics, clothing, documents, keys, wallet, jewelry, books, other |
| `location` | TEXT | NULLABLE | Campus landmark where found/lost |
| `status` | `item_status` | NOT NULL, default `'lost'` | Enum: lost, found, claimed, returned |
| `date_occurred` | DATE | NULLABLE | Date when lost or found |
| `deleted_at` | TIMESTAMPTZ | NULLABLE, default `NULL` | Soft delete timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` | Last update timestamp |

#### `item_images`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, default `gen_random_uuid()` | Image record ID |
| `item_id` | UUID | NOT NULL, REFERENCES `public.items(id)` ON DELETE CASCADE | Parent item |
| `storage_path` | TEXT | NOT NULL | Storage path in `item-images` bucket |
| `url` | TEXT | NOT NULL | Public CDN URL |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | Upload timestamp |

#### `claims`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, default `gen_random_uuid()` | Claim record ID |
| `item_id` | UUID | NOT NULL, REFERENCES `public.items(id)` ON DELETE CASCADE | Target item |
| `user_id` | UUID | NOT NULL, REFERENCES `auth.users(id)` ON DELETE CASCADE | Claimant user ID |
| `message` | TEXT | NOT NULL | Proof / verification message (15–500 chars) |
| `status` | `claim_status` | NOT NULL, default `'pending'` | Enum: pending, approved, rejected |
| `meeting_requested`| BOOLEAN | NOT NULL, default `false` | In-person meeting requested flag |
| `meeting_details` | TEXT | NULLABLE | Campus meetup instructions |
| `verification_question` | TEXT | NULLABLE | Optional verification query |
| `verification_answer` | TEXT | NULLABLE | Optional verification response |
| `appeal_message` | TEXT | NULLABLE | Dispute appeal message |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | Claim timestamp |
* *Constraint*: `UNIQUE(item_id, user_id)` (one claim per user per item).

#### `notifications`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, default `gen_random_uuid()` | Notification ID |
| `user_id` | UUID | NOT NULL, REFERENCES `auth.users(id)` ON DELETE CASCADE | Recipient user ID |
| `sender_id` | UUID | NULLABLE, REFERENCES `auth.users(id)` ON DELETE SET NULL | Author user ID |
| `title` | TEXT | NOT NULL | Notification title |
| `message` | TEXT | NOT NULL | Notification body |
| `read` | BOOLEAN | NOT NULL, default `false` | Read status |
| `related_item_id` | UUID | NULLABLE, REFERENCES `public.items(id)` ON DELETE SET NULL | Related item |
| `related_claim_id`| UUID | NULLABLE, REFERENCES `public.claims(id)` ON DELETE SET NULL | Related claim |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` | Dispatch timestamp |

#### `user_roles`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, default `gen_random_uuid()` | Role record ID |
| `user_id` | UUID | NOT NULL, REFERENCES `auth.users(id)` ON DELETE CASCADE | User ID |
| `role` | `app_role` | NOT NULL | Enum: admin, moderator, user |
* *Constraint*: `UNIQUE(user_id, role)`.

---

### 6.2 Stored Functions & Triggers

1. `public.handle_new_user()`
   * Fired on: `AFTER INSERT ON auth.users`
   * Logic: Auto-creates a corresponding row in `public.profiles` populated with Google user metadata.
2. `public.check_signup_email_domain()`
   * Fired on: `BEFORE INSERT OR UPDATE OF email ON auth.users`
   * Logic: Parses domain after `@`. Throws exception if not in `('student.sfit.ac.in', 'sfit.ac.in')`.
3. `public.check_item_posting_rate_limit()`
   * Fired on: `BEFORE INSERT ON public.items`
   * Logic: Ensures user has not posted more than 10 items in the preceding 24 hours.
4. `public.check_claim_submitting_rate_limit()`
   * Fired on: `BEFORE INSERT ON public.claims`
   * Logic: Ensures user has not submitted more than 15 claims in the preceding 24 hours.
5. `public.soft_delete_item()`
   * Fired on: `BEFORE DELETE ON public.items`
   * Logic: Intercepts physical deletion, updates `deleted_at = now()`, and returns `NULL` to abort physical row purge.
6. `public.enforce_claim_insert()`
   * Fired on: `BEFORE INSERT ON public.claims`
   * Logic: Enforces `status = 'pending'`, validates message length (15–500 chars), and checks that the item is active and does NOT belong to the claimant.
7. `public.enforce_claim_update()`
   * Fired on: `BEFORE UPDATE ON public.claims`
   * Logic: Prohibits altering claim `user_id`, `item_id`, or `message`. Prevents changing status once approved or rejected.
8. `public.create_notification(...)`
   * Execution: `SECURITY DEFINER` function callable only by `authenticated`.
   * Logic: Validates that sender and receiver are legitimate parties on the given item/claim, checks sender 1-hour rate limit (max 20), and inserts the notification.

---

### 6.3 Row Level Security (RLS) Policies Overview

* **`profiles`**:
  * `SELECT`: Publicly accessible (`USING (true)`).
  * `INSERT` / `UPDATE`: Only own user ID (`auth.uid() = user_id`).
* **`items`**:
  * `SELECT`: Anyone can view active items (`deleted_at IS NULL`).
  * `INSERT`: Authenticated users for own ID (`auth.uid() = user_id`).
  * `UPDATE` / `DELETE`: Item owner or admin (`auth.uid() = user_id OR has_role(auth.uid(), 'admin')`).
* **`item_images`**:
  * `SELECT`: Active item images only (item must not be soft-deleted).
  * `INSERT`: Only item owners can upload images for their items.
* **`claims`**:
  * `SELECT`: Item owners can view claims on their items; claimants can view their own claims.
  * `INSERT`: Authenticated users creating pending claims on items they do not own.
  * `UPDATE`: Item owner or admin resolving claims.
* **`notifications`**:
  * `SELECT` / `UPDATE` / `DELETE`: Only the recipient (`auth.uid() = user_id`).
  * `INSERT`: Handled strictly through `create_notification()` stored procedure.
* **`storage.objects` (`item-images` bucket)**:
  * `SELECT`: Public access.
  * `INSERT`: Only authenticated users uploading to their own user folder (`auth.uid()::text = (storage.foldername(name))[1]`).

---

## 7. Environment Configuration & Deployment Setup

### 7.1 Environment Variables
These variables must be populated in `.env` for local development and in the **Vercel Project Settings > Environment Variables** for production:

```env
# Supabase Project URL (Found in Supabase Dashboard > Project Settings > API)
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co

# Supabase Anonymous/Publishable Key (Safe for browser client)
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>

# Optional: Google Cloud OAuth 2.0 Web Client ID for Google Identity Services
VITE_GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
```

> **Security Rule**: `VITE_SUPABASE_PUBLISHABLE_KEY` is a public anon key governed entirely by PostgreSQL Row-Level Security policies. Never expose or insert the Supabase `service_role` secret anywhere in this frontend repository.

### 7.2 Local Development Commands
All commands run using standard npm/bun scripts:

```bash
# Install dependencies
npm install

# Start local development server (runs on 127.0.0.1:8080)
npm run dev

# Run automated unit tests with Vitest
npm run test

# Run Vitest in interactive watch mode
npm run test:watch

# Execute ESLint checks
npm run lint

# Compile production bundle
npm run build
```

---

## 8. Development & Maintenance Playbook

### 8.1 Adding a New Category or Location
1. Open `src/constants/index.ts`.
2. To add a category:
   * Add to the `CATEGORIES` array: `{ value: "new_category", label: "New Category", icon: "LucideIconName" }`.
   * Add styling colors to `CATEGORY_STYLES` in `src/constants/index.ts`.
   * Update the Postgres enum: Execute `ALTER TYPE public.item_category ADD VALUE 'new_category';` in Supabase SQL editor.
   * Re-generate or update `src/integrations/supabase/types.ts`.
3. To add a location:
   * Add the campus building/zone string to `LOCATIONS` in `src/constants/index.ts`.
   * Add any relevant synonyms to the `SYNONYMS` table in `src/features/items/utils/search-engine.ts`.

### 8.2 Safe Database Migration Workflow
1. Write a new timestamped `.sql` file in `supabase/migrations/` (e.g. `20261001000000_new_feature.sql`).
2. Always wrap triggers and functions in `SECURITY DEFINER` and set explicit `SET search_path = public` to prevent schema hijack vulnerabilities.
3. Test migration in the Supabase SQL editor on a staging project before applying to production.
4. Export updated database schema types to `src/integrations/supabase/types.ts`.

### 8.3 Bundle Size Optimization
* Code-splitting is enforced in `src/App.tsx` via `React.lazy()` and `Suspense` for all pages.
* `vite.config.ts` configures `manualChunks`:
  * `react-vendor`: `react`, `react-dom`, `react-router-dom`
  * `supabase`: `@supabase/supabase-js`
  * `react-query`: `@tanstack/react-query`

---

## 9. Summary for Future AI Agents & Maintainers
When modifying or extending CampusFind:
* **Do NOT introduce paid dependencies or cloud APIs**. Everything must run on the free tier of Supabase, Vercel, and GCP.
* **Preserve the SFIT email wall**. Never weaken email validation in `email.ts` or bypass database triggers.
* **Keep listings private**. Never expose poster emails or phone numbers on public browse views.
* **Maintain the custom search engine**. When adding campus terminology, enhance `SYNONYMS` in `search-engine.ts` and test with `src/test/search-engine.test.ts`.
* **Respect the design system**. Use the established Apple aesthetic, tokens in `index.css`, custom easing curves (`cubic-bezier(0.22, 1, 0.36, 1)`), and standard component patterns.

---

## 10. Recent Architectural Upgrades & Changelog (September 2026)

### 10.1 Custody & Item Lifecycle Integrity
- **`item-custody.ts` & `ItemCard.tsx`**:
  - Gated all physical custody labels strictly to `status === "found"`.
  - Resilient fallback for `returned` items to correctly output "Resolved · [Location]" if the item was originally lost (no `held_where`).
- **`Dashboard.tsx`**:
  - Stale custody clearance: `setItemStatus` wipes `held_where` and `held_at` when status transitions to `lost`.
  - Selected `held_where` and `held_at` in `fetchDashboardData` to preserve original listing type.
  - Updated status badge: correctly labels resolved lost items as "Resolved" rather than "Returned".
  - Reopening logic: automatically reopens as "lost" or "found" matching its original posting type to prevent data corruption.
- **`itemsApi.ts`**:
  - Removed arbitrary filter exclusion of `returned` items when `filters.status === "all"`, restoring user expectation that "All status" displays the entire board.

### 10.2 Auth Modal & Primary CTA Elevation
- **`AuthPromptModal.tsx` & `PostItem.tsx`**:
  - **Hover Border Jump Elimination**: Replaced opacity-based transitions with solid opaque fills (`hover:bg-neutral-800` in light mode, `hover:bg-[#ebebee]` in dark mode) and added hardware-accelerated transforms (`transform-gpu isolate overflow-hidden`), preventing subpixel border jitter.
  - **Apple Dark Mode Palette**: Replaced stark white button with Apple dark elevated fill (`#2c2c30` with `border-white/[0.12]`, transitioning to `#38383e` on hover), eliminating glare while cleanly framing the 4-color Google "G" emblem.
  - **Zero Pills & Zero Dots**: Replaced capsule domain wrappers with clean, restrained typography.

### 10.3 Dashboard — My Claims 2-Column Responsive Layout
- Replaced the single-column stretched view with a responsive 2-column gallery (`grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5`), eliminating dead space on laptop displays while maintaining native touch sizing on mobile.
- Enriched `DBClaim` with item thumbnails (`item_images` query join) and location tags.
- Integrated Apple 3-stage lifecycle progress rail (`Submitted` ── `Review` ── `Handover`) with 2px rounded horizontal indicators and pure typographic labels.

### 10.4 Dashboard — Alerts (`notifications`) Architectural Overhaul
- **Header & Filtering**: Introduced segmented toggle (`All` vs `Unread`), bulk actions ("Mark all read", "Clear all"), and live unread indicator badge.
- **Dismissible Desktop Alert Banner**: Native Safari/macOS styled banner with naked `Bell` vector icon, clear value proposition, and discrete dismiss.
- **`NotificationCard` Elevation**: Multi-column 2-column layout, tracked category kicker (`CLAIM UPDATE`, `HANDOVER`), dynamic relative timestamps (`5m ago`, `2h ago`), and typographic `NEW` tag.
- **`EmptyState` Polish**: Stripped artificial circular icon wrappers for naked, optically balanced vector icons.

### 10.5 Dashboard — Inbox (`incoming`) Full Redesign: Interactive Triage Queue (Apple Mail / Notes Grade)
- **Eliminated Repetitive Templates & Layout Jitter**: Replaced unstable auto-height wrappers with a rock-solid dual-panel frame (`h-[580px] lg:h-[620px]`). Both panels scroll independently (`overflow-y-auto`), ensuring that clicking any queue item never alters the parent container's height or triggers browser scrollbar flashing.
- **Continuous 56px Top Header Baseline**:
  - Both the left Queue panel and right Inspection panel share an identical `h-14` (56px) header height and border-b (`border-black/[0.08] dark:border-white/[0.08]`), establishing a single unbroken horizontal divider across laptop viewports.
  - **Left Header**: Displays item count and an Apple segmented control.
  - **Right Header**: Displays claimant avatar initials (`getInitials`), full name, and timestamp on desktop; displays a 100% borderless iOS `< Claims` navigation chevron on mobile.
- **True Concentric Segmented Slider (`rounded-[8px]` + `rounded-[6px]`)**:
  - Replaced the distorted capsule geometry with mathematically concentric radii: outer track `rounded-[8px]` with `p-[2.5px]` inset (`bg-black/[0.05] dark:bg-white/[0.08]`, zero harsh borders); sliding thumb `rounded-[6px]` (`8px - 2.5px ≈ 6px`) with soft Apple shadow (`shadow-[0_1px_2.5px_rgba(0,0,0,0.1)]`).
  - Corner curvature remains equidistant across every subpixel.
- **Glyph Protection & Zero Text Clipping**:
  - Fixed Windows DirectWrite glyph clipping on font boundaries (such as the letter "o" in "Coelho") by enforcing `min-w-0 pr-2 block` on queue items and allowing natural wrapping on inspection headers.
- **3-Card Inspection Console Architecture (Google Squircle Geometry × Apple Minimalism)**:
  - Replaced the loose floating items and giant bottom void with three structured, beautifully rounded Google-style surface cards (`rounded-2xl`, 16px corner radius, `bg-neutral-50/70 dark:bg-[#1c1c1f]`, `border-neutral-200/80 dark:border-white/[0.08]`):
    - **Card 1 (Profile & Item Context)**: 40px initials avatar, full claimant name, filing timestamp, hairline divider, 44px item thumbnail, and interactive "View item ↗" button.
    - **Card 2 (Verification Proof)**: ShieldCheck vector icon, uppercase category kicker, and an elevated inner quote well (`rounded-xl bg-white dark:bg-[#141416] p-4`).
    - **Card 3 (Handover Console & Actions)**: Handover location field with strict `pl-10` padding (eliminating icon overlap), guidance subtitle, and dual balanced action buttons (`h-10 rounded-xl`, `active:scale-[0.98]` tactile press physics).
- **Absolute Glyph / Icon Buffer Fix**:
  - Replaced the non-standard `pl-8.5` with standard `pl-10` (40px) against `left-3.5` (14px) and `w-4` (16px), guaranteeing a clean 10px optical buffer between the `MapPin` icon and input placeholder text.
- **Micro-interactions & Tactile Feedback**:
  - Buttons feature `active:scale-[0.98]` spring depression and 150ms border/background transitions.
  - Interactive pill links feature subtle hover lift and click feedback.

### 10.6 Claims Clearance & Apple-Grade Listing Resolution Architecture (September 2026)
- **Dashboard Claims Clearance & Lifecycle Filter**:
  - Introduced segmented filter (`All`, `Active`, `Resolved`) in Dashboard → My Claims, allowing users to separate ongoing handovers from concluded cases.
  - Dual-layer persistence: `clearClaim` and `clearAllResolvedClaims` attempt remote Supabase deletion (`claims FOR DELETE`) while synchronizing to persistent client storage (`campusfind_dismissed_claims_${userId}`), guaranteeing instant UI clearance and cross-session persistence with undo capability.
  - Added individual "Clear" action button on every resolved, withdrawn, or declined claim card in `MyClaimCard`.
  - Added bulk "Clear resolved" action in the Claims tab header when finished claims exist.
  - Enriched item navigation links with React Router route state (`state={{ fromClaim: claim, itemTitle, itemStatus }}`), ensuring zero-latency context passing even if the underlying database row was soft-deleted.
- **Apple-Grade Item Resolution Showcase (`ItemResolutionNotice.tsx`)**:
  - Replaced the unstyled `Item not found.` void with a dedicated Apple-inspired resolution presentation.
  - Gracefully discriminates between distinct post lifecycles:
    - **Removed / Concluded**: Clear explanation that the post was removed by the author, contextual claim memo with proof notes/handover state, and direct "Clear claim from my history" shortcut.
    - **Returned / Reunited**: Celebratory Apple success badge with `CheckCircle2` indicating successful campus recovery.
    - **Claimed / Handover**: In-progress status banner with `Clock` highlighting campus collection in flight.
    - **Listing Unavailable**: Minimalist Apple empty state with clean SF Pro typography and navigation back to active listings.
  - Prominent Apple status banners integrated above active item details when marked `returned` or `claimed`.

### 10.7 V3 Architecture: Keyset Pagination, Soft-Deletion Lifecycle & Security Hardening (September 2026)
- **Deterministic Keyset Pagination (`browse_public_items` & `search_public_items`)**:
  - Implemented keyset cursors (`p_before_created_at`, `p_before_id`, `p_before_score`) in PostgreSQL RPCs to eliminate slow `OFFSET / LIMIT` pagination on large datasets.
  - Frontend upgraded to TanStack Query `useInfiniteQuery` in `Items.tsx` with chunk size of 20 items.
  - Apple-grade "Load more items" button with tactile loading indicator and "You've reached the end of the board" completion notice.
- **Backend-Driven Media Lifecycle & Soft-Deletions**:
  - Safe soft-delete pattern: Frontend `Dashboard.tsx` performs `UPDATE items SET deleted_at = now()` instead of raw SQL `DELETE` or client-side storage removal.
  - Active listings automatically exclude soft-deleted rows via `.is("deleted_at", null)`.
  - Database trigger `tr_enqueue_deleted_item_media` fires `AFTER UPDATE` on `public.items`, automatically enqueuing media paths into `public.media_cleanup_queue` with a 30-day safety retention grace period.
  - Edge Function `purge-expired-media` uses `FOR UPDATE SKIP LOCKED` batch claiming to delete orphaned files from `item-images` Supabase storage bucket without race conditions.
  - Zero-cost automated daily trigger via GitHub Actions workflow `.github/workflows/cleanup-media.yml`.
- **Database Security Hardening & Linter Compliance**:
  - `pg_trgm` extension isolated in `extensions` schema, with `search_public_items` explicitly configured with `SET search_path = public, extensions;` for runtime stability.
  - Public read RPCs converted from `SECURITY DEFINER` to `SECURITY INVOKER`, honoring standard RLS policies.
  - Internal functions (`claim_media_cleanup_jobs`, `create_notification`, `enqueue_deleted_item_media`) have `EXECUTE` revoked from `PUBLIC`, `anon`, and `authenticated`.
  - `media_cleanup_queue` secured with an explicit default-deny RLS policy (`USING (false)`), satisfying Supabase linter rule `0008_rls_enabled_no_policy` while permitting service-role key access.


