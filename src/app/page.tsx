import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="border-b border-white/10 px-6 py-4">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">GV</span>
            </div>
            <span className="text-lg font-semibold text-white">G-Vision</span>
          </div>
          <Link
            href="/auth/login"
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
          >
            Sign In
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            Operational Intelligence Platform
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight mb-6">
            Intelligence that works
            <br />
            <span className="text-brand-400">around the clock.</span>
          </h1>

          <p className="text-lg text-night-300 max-w-2xl mx-auto mb-10">
            G-Vision transforms incident records into actionable intelligence
            for hotel operations teams. Real-time dashboards, room intelligence
            maps, and executive briefings — built for duty managers who
            need answers, not spreadsheets.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/auth/login"
              className="px-6 py-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors glow-brand"
            >
              Get Started
            </Link>
            <a
              href="#features"
              className="px-6 py-3 rounded-lg border border-white/10 hover:border-white/20 text-night-300 hover:text-white font-medium transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-night-500">
          <p>&copy; {new Date().getFullYear()} G-Vision. All rights reserved.</p>
          <p>Built for hotel operations teams.</p>
        </div>
      </footer>
    </div>
  );
}
