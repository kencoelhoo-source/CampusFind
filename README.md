# SFIT Lost & Found Portal 🕵️‍♂️🔍

> A modern, AI-powered campus portal for SFIT students to report, search, and reclaim lost items through a secure and community-driven flow.

Losing personal belongings on a busy college campus is a universally stressful experience. We built the **SFIT Lost & Found Portal** to solve this exact problem—giving our campus community a simple, modern, and unified platform to reconnect people with their belongings.

---

## ✨ Key Features

- **Real-time Reporting:** Instant posting of lost or found items with image uploads and location tags.
- **Smart Browsing:** Drop-down filters and search functionalities to quickly navigate a centralized feed of reported items by category, date, and status.
- **Secure Claim Verification:** A secure system where users can claim items they have lost. The finder can verify the claim through specific questions.
- **AI Matching (Experimental):** Integration with the **Gemini AI API** to automatically suggest potential matches between reported lost items and newly found items based on image and text analysis.
- **Premium User Interface:** Designed with a clean, "Apple-like" aesthetic featuring smooth micro-animations, glassmorphic effects, and responsive design.

## 🛠️ Built With

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite |
| **UI Components** | shadcn/ui, Tailwind CSS, Lucide Icons |
| **Backend & Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth (PKCE flow) |
| **Storage & Logic** | Supabase Storage & Edge Functions |
| **State & Forms** | React Query (TanStack Query), React Hook Form, Zod |
| **AI Integration** | Gemini API |

## 🚧 Challenges Faced
Building this application required solving several complex issues:
*   **Secure Claim Routing:** Designing a secure flow where a claimant and a finder can communicate without exposing sensitive personal contact information until a claim is explicitly approved. Building the complex database schema with the correct Supabase RLS policies required careful planning.
*   **UI Polish:** Achieving the minimalistic, premium aesthetic we wanted meant spending significant time fine-tuning micro-animations, glassmorphic effects, and typography.
*   **AI Integration:** Getting the Gemini API to accurately parse item descriptions and suggest reliable matches across different text inputs required several iterations of prompt engineering within our Edge Functions.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)
- A [Supabase](https://supabase.com/) project (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kencoelhoo-source/student-return-help.git
   cd student-return-help
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_PROJECT_ID=your_project_id
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   ```

4. **Run the database migrations**
   Apply the SQL migration files located in `supabase/migrations/` to your Supabase project via the SQL Editor in the Supabase Dashboard.

5. **Start the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

## 📁 Project Structure

```text
src/
├── components/       # Reusable UI components
├── lib/              # Supabase client, auth context, utilities
├── pages/            # Application pages (Home, Items, Dashboard, etc.)
└── App.tsx           # Root component with routing
```

## s License
This project is open source and available for educational purposes.

---
Built as a project for **St. Francis Institute of Technology (SFIT)**, Mumbai.
