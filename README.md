# CampusFind - SFIT Lost & Found Portal

A web-based portal for SFIT students to report, search, and reclaim lost or found items through a secure and structured verification system.

CampusFind provides a central platform for the campus community to list misplaced items, browse active listings, and verify ownership through a private claim flow.

## Core Features

*   **User Authentication**: Secure signup and login integrated with user profiles.
*   **Item Listing**: Report lost or found items with titles, descriptions, specific locations, dates, and multiple image uploads.
*   **Advanced Search & Filter**: Filter listings by status (lost, found, claimed, returned), category, and location, or search by text keywords.
*   **Secure Claim Verification**: Claim items by submitting proof of ownership. The listing creator can review claims, ask custom verification questions, suggest in-person meeting details, approve/reject claims, and process appeals.
*   **Real-time Alerts**: In-app notifications to track active claims, claim updates, and meeting details.
*   **Responsive UI**: Optimized for mobile and desktop screens using a clean, modern interface.

## Tech Stack

*   **Frontend**: React, TypeScript, Vite
*   **Styling & Components**: Tailwind CSS, shadcn/ui, Lucide Icons
*   **Backend & Database**: Supabase (PostgreSQL database, authentication, and file storage)
*   **State & Form Validation**: TanStack Query (React Query), React Hook Form, Zod

## Getting Started

### Prerequisites

*   Node.js v18 or higher
*   npm (installed with Node.js)
*   A Supabase project instance

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/kencoelhoo-source/CampusFind.git
    cd campusfind
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the root directory:
    ```env
    VITE_SUPABASE_PROJECT_ID=your_supabase_project_id
    VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
    VITE_SUPABASE_URL=https://your-project-id.supabase.co
    ```

4.  **Set up Database Schema**
    Execute the SQL files located in the `supabase/migrations/` directory within your Supabase project's SQL Editor to set up the tables, Row Level Security (RLS) policies, and triggers.

5.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Open `http://localhost:8080` in your web browser.

## Project Structure

```text
src/
├── components/       # Reusable UI components (Navbar, ItemCard, SearchFilters, etc.)
├── hooks/            # Custom react hooks (theme, mobile detection, toast alerts)
├── integrations/     # Supabase connection client and schema types
├── lib/              # Core functions (auth contexts, validation rules, constants, state helpers)
├── pages/            # Application pages (Auth, Dashboard, Index, ItemDetail, Items, PostItem)
└── main.tsx          # App entry point
```

## License

This project is open source and available for educational purposes.

---
Built as a project for **St. Francis Institute of Technology (SFIT)**, Mumbai.
