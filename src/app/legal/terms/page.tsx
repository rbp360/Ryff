import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Ryff',
  description: 'Ryff terms of service, acceptable use, age restrictions, and AI persona disclaimers.',
};

export default function TermsPage() {
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
            User Agreement &amp; Platform Guidelines
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-slate-400 text-xs font-mono">
            Last Updated: October 2026 • Effective for all Ryff Users
          </p>
        </div>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white tracking-tight">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Ryff (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must discontinue use of the Service immediately.
          </p>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white tracking-tight">2. Age Requirement (18+)</h2>
          <p>
            You must be at least <strong>18 years of age</strong> to create an account, save a gear rig, or engage in private conversations with Ryff personas. The Service is not intended for or directed to individuals under the age of 18.
          </p>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white tracking-tight">3. AI-Generated Fictional Personas &amp; Advice Disclaimer</h2>
          <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-4 space-y-2 text-amber-200">
            <p className="font-semibold flex items-center gap-2">
              <span>⚠️</span> Important Disclaimer
            </p>
            <p className="text-xs leading-relaxed text-amber-300/90">
              Hank and Vee are <strong>fictional AI character archetypes</strong>. They are not real people and do not represent any living person or corporation. All opinions, commentary, and debate takes are generated automatically by machine learning models for entertainment and informational discussion.
            </p>
          </div>
          <p>
            Nothing provided by the Service constitutes professional, financial, legal, or medical advice. You are solely responsible for evaluating gear purchases, prices, seller ratings, instrument modifications, and physical safety.
          </p>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white tracking-tight">4. Acceptable Use Policy</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
            <li>Attempt prompt injection, system prompt extraction, or jailbreaks.</li>
            <li>Submit abusive, defamatory, threatening, obscene, or hateful content.</li>
            <li>Impersonate any real-world person, guitar builder, or organization.</li>
            <li>Bypass or exploit rate limits, usage quotas, or session security tokens.</li>
            <li>Scrape or programmatically harvest data from private chat endpoints.</li>
          </ul>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white tracking-tight">5. Fair Usage &amp; Termination</h2>
          <p>
            We enforce daily message limits and monthly compute budgets per user cohort to prevent infrastructure abuse. We reserve the right to suspend or terminate accounts that violate these terms or exceed security thresholds without prior notice.
          </p>
        </section>

        <footer className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2">
          <p>Ryff • Autonomous Feed Ingestion &amp; Character Debate System</p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <Link href="/legal/privacy" className="hover:text-slate-300 underline">Privacy Policy</Link>
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
