import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-night-900 to-night-950">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 px-6 py-4 bg-night-900/80 backdrop-blur-md">
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

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative px-6 py-20 sm:py-32 overflow-hidden">
          {/* Background gradient accent */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-400/5 rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              Operational Intelligence Platform
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
              Intelligence that works
              <br />
              <span className="text-brand-400">around the clock.</span>
            </h1>

            <p className="text-lg sm:text-xl text-night-300 max-w-3xl mx-auto mb-12 leading-relaxed">
              Transform incident records into actionable intelligence. Real-time dashboards, room intelligence maps, and GM-ready briefings — built for hotel operations teams who need answers, not spreadsheets.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                href="/auth/login"
                className="px-8 py-4 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-colors glow-brand shadow-lg shadow-brand-500/20"
              >
                Get Started Free
              </Link>
              <a
                href="#demo"
                className="px-8 py-4 rounded-lg border border-white/20 hover:border-white/40 text-white hover:bg-white/5 font-semibold transition-colors"
              >
                Book a Demo
              </a>
            </div>
          </div>
        </section>

        {/* Social Proof Bar */}
        <section className="px-6 py-12 border-y border-white/10 bg-night-950/40">
          <div className="max-w-7xl mx-auto">
            <p className="text-center text-sm text-night-400 mb-6">
              Trusted by hotel operations teams across Australia
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12">
              <div className="text-night-500 text-sm font-medium">Hamilton Island</div>
              <div className="text-night-500 text-sm font-medium">Reef View Hotel</div>
              <div className="text-night-500 text-sm font-medium">[Your Property]</div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="px-6 py-20 sm:py-32">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Everything you need to run operations efficiently
              </h2>
              <p className="text-lg text-night-300 max-w-2xl mx-auto">
                Six powerful modules, built for the way hotel teams actually work
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="p-8 rounded-xl bg-night-800/40 border border-white/10 hover:border-brand-500/30 hover:bg-night-800/60 transition-all group">
                <div className="text-3xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-white mb-3">Real-Time Dashboard</h3>
                <p className="text-night-300 text-sm leading-relaxed">
                  KPI cards, trend analysis, and severity distribution at a glance. Know what&apos;s happening across your property in real time, so you can act fast.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-8 rounded-xl bg-night-800/40 border border-white/10 hover:border-brand-500/30 hover:bg-night-800/60 transition-all group">
                <div className="text-3xl mb-4">🗺️</div>
                <h3 className="text-xl font-semibold text-white mb-3">Room Intelligence Map</h3>
                <p className="text-night-300 text-sm leading-relaxed">
                  Interactive floor-by-floor heat maps showing incident hotspots. Click any room to see its complete history and identify patterns.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-8 rounded-xl bg-night-800/40 border border-white/10 hover:border-brand-500/30 hover:bg-night-800/60 transition-all group">
                <div className="text-3xl mb-4">🏗️</div>
                <h3 className="text-xl font-semibold text-white mb-3">Operations Centre</h3>
                <p className="text-night-300 text-sm leading-relaxed">
                  Task management, department assignments, and batch scheduling. Track every maintenance job from creation to completion.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-8 rounded-xl bg-night-800/40 border border-white/10 hover:border-brand-500/30 hover:bg-night-800/60 transition-all group">
                <div className="text-3xl mb-4">📧</div>
                <h3 className="text-xl font-semibold text-white mb-3">Daily Briefing</h3>
                <p className="text-night-300 text-sm leading-relaxed">
                  Auto-generated shift summaries with overnight incidents, overdue tasks, and upcoming work. Copy and send to your team in one click.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="p-8 rounded-xl bg-night-800/40 border border-white/10 hover:border-brand-500/30 hover:bg-night-800/60 transition-all group">
                <div className="text-3xl mb-4">📈</div>
                <h3 className="text-xl font-semibold text-white mb-3">Executive Reports</h3>
                <p className="text-night-300 text-sm leading-relaxed">
                  GM-ready briefings with root cause analysis, controllability breakdown, and year-on-year comparisons. The data you actually need.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="p-8 rounded-xl bg-night-800/40 border border-white/10 hover:border-brand-500/30 hover:bg-night-800/60 transition-all group">
                <div className="text-3xl mb-4">👥</div>
                <h3 className="text-xl font-semibold text-white mb-3">Department Portal</h3>
                <p className="text-night-300 text-sm leading-relaxed">
                  Per-department task boards with filtered views, bulk actions, and performance metrics. Empowering teams from day one.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="px-6 py-20 sm:py-32 border-t border-white/10 bg-night-950/40">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Get started in three steps
              </h2>
              <p className="text-lg text-night-300">
                No complex setup. No months of implementation. Go live in days.
              </p>
            </div>

            <div className="space-y-8">
              {/* Step 1 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-brand-500/20 border border-brand-500/40">
                    <span className="text-xl font-semibold text-brand-400">1</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">Import Your Data</h3>
                  <p className="text-night-300">
                    Upload incident records via CSV or log incidents directly into G-Vision. Historical data loads in minutes. New incidents sync in real time.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-brand-500/20 border border-brand-500/40">
                    <span className="text-xl font-semibold text-brand-400">2</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">G-Vision Classifies & Analyzes</h3>
                  <p className="text-night-300">
                    Automatic categorization, severity assessment, and root cause analysis. Your AI-powered ops analyst running 24/7. No manual tagging required.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-brand-500/20 border border-brand-500/40">
                    <span className="text-xl font-semibold text-brand-400">3</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">Get Actionable Intelligence</h3>
                  <p className="text-night-300">
                    Live dashboards, shift briefings, and executive reports. Alerts for critical incidents. Insights to reduce costs and improve guest experience. Act on real intelligence, not hunches.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section id="demo" className="px-6 py-20 sm:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Ready to transform your night operations?
            </h2>
            <p className="text-lg text-night-300 mb-10">
              Start with a free trial. No credit card required. Go live in days, not months.
            </p>
            <Link
              href="/auth/login"
              className="inline-block px-10 py-4 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold transition-colors glow-brand shadow-lg shadow-brand-500/20"
            >
              Get Started Free
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8 bg-night-950">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-night-500">
            <p>&copy; 2026 G-Vision. All rights reserved.</p>
            <p>Built for hotel operations teams.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
