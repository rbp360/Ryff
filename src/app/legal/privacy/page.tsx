import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Ryff',
  description: 'Ryff privacy policy, UK GDPR data handling, retention rules, and user rights.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-cyan-400" />
            <span className="font-extrabold tracking-tight text-white text-lg">RYFF</span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              Legal
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700 font-mono"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 pt-10 space-y-8">
        <div className="space-y-2 border-b border-slate-800 pb-6">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
            UK GDPR & Data Protection Notice
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-slate-400 text-xs font-mono">
            Last Updated: October 2026 • Effective for all Ryff Cadre & Public Users
          </p>
        </div>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white tracking-tight">1. Overview & Data Controller</h2>
          <p>
            Ryff (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Service&rdquo;) operates an autonomous gear debate platform and private 1:1 rig-aware assistant. We are committed to transparent, privacy-first data practices in accordance with the UK General Data Protection Regulation (UK GDPR) and Data Protection Act 2018.
          </p>
          <p>
            For any data protection inquiries, contact our data administrator at:{' '}
            <code className="text-cyan-400 font-mono">bedlamthebandbedlam@gmail.com</code>.
          </p>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white tracking-tight">2. What Data We Collect</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-300 pl-2">
            <li>
              <strong className="text-white">Account Information:</strong> Your email address, signup timestamp, adult confirmation (18+), and residency confirmation.
            </li>
            <li>
              <strong className="text-white">Rig &amp; Wishlist Data:</strong> Free-text entries of guitars, amplifiers, and pedals you own or want, including optional budget amounts.
            </li>
            <li>
              <strong className="text-white">Chat Messages:</strong> Messages you exchange privately with Hank or Vee, including token usage and metadata.
            </li>
            <li>
              <strong className="text-white">Technical Analytics:</strong> First-party event timestamps (e.g. sign in, episode viewed, deal clicked). We do not use third-party tracking or advertising cookies.
            </li>
          </ul>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white tracking-tight">3. How We Use Your Data</h2>
          <p>We process your data strictly to:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
            <li>Provide personalized conversational responses from Hank and Vee based on your gear rig.</li>
            <li>Match used marketplace gear listings (Reverb) to your specified want list.</li>
            <li>Enforce fair-usage cost caps and rate limits.</li>
            <li>Prevent abuse, prompt injection, and security violations.</li>
          </ul>
          <p className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-300">
            <strong>We never sell your data</strong>, nor do we share your personal rig details with advertisers or external data brokers.
          </p>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white tracking-tight">4. 90-Day Retention Schedule &amp; Deletion</h2>
          <p>
            To protect your privacy, all private chat message transcripts are retained for a maximum of <strong>90 days</strong>, after which they are automatically purged by our data retention engine.
          </p>
          <p>
            You may request complete account and data deletion at any time via our account deletion endpoint or by contacting us directly. Deletion instantly removes your user profile, rig items, message history, and usage logs.
          </p>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white tracking-tight">5. Cookies &amp; Tracking</h2>
          <p>
            Ryff uses only strictly necessary, encrypted HTTP-only session cookies to authenticate your sign-in session. We do not set third-party marketing, analytics, or behavioral tracking cookies.
          </p>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white tracking-tight">6. Your Rights</h2>
          <p>
            Under UK GDPR, you have the right to access, rectify, or erase personal data held about you, as well as the right to lodge a complaint with the UK Information Commissioner&apos;s Office (ICO).
          </p>
        </section>

        <footer className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2">
          <p>Ryff • Autonomous Feed Ingestion &amp; Character Debate System</p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <Link href="/legal/terms" className="hover:text-slate-300 underline">Terms of Service</Link>
            <span>•</span>
            <Link href="/legal/disclosure" className="hover:text-slate-300 underline">Affiliate Disclosure</Link>
            <span>•</span>
            <Link href="/" className="hover:text-slate-300 underline">Home</Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
