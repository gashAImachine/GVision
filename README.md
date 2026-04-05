# G-Vision — Operational Intelligence for Hotels

G-Vision transforms incident records into actionable intelligence for hotel operations teams. Real-time dashboards, room intelligence maps, and executive briefings — built for around-the-clock usage across every shift.

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **UI Components:** Shadcn/ui + Lucide React icons
- **Backend:** Next.js API Routes + Supabase
- **Database:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Hosting:** Vercel (frontend) + Supabase (backend)
- **Charts:** Recharts

## Getting Started

```bash
# Install dependencies
npm install

# Copy env and fill in your Supabase credentials
cp .env.local.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── api/              # API routes
│   ├── auth/             # Auth pages (login, callback)
│   └── dashboard/        # Dashboard pages
├── components/
│   ├── ui/               # Shadcn/ui components
│   ├── layout/           # Shell, sidebar, nav
│   └── dashboard/        # Dashboard-specific components
├── hooks/                # Custom React hooks
├── lib/
│   └── supabase/         # Supabase client (browser, server, middleware)
├── types/                # TypeScript type definitions
└── styles/               # Global styles
```

## License

Proprietary — All rights reserved.
