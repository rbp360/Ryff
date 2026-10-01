import Link from 'next/link';

export const metadata = {
  title: 'Affiliate Disclosure — Ryff',
  description: 'Ryff affiliate link disclosure, Reverb commercial relationships, and editorial ranking principles.',
};

export default function AffiliateDisclosurePage() {
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
            Commercial Transparency &amp; Affiliate Disclosure
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Affiliate Disclosure
          </h1>
          <p className="text-slate-400 text-xs font-mono">
            Compliance with UK Advertising Standards Authority (ASA) &amp; US Federal Trade Commission (FTC) Guidelines
          </p>
        </div>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white tracking-tight">1. Commercial Affiliate Links</h2>
          <p>
            Ryff participates in select marketplace affiliate marketing programmes, including the <strong>Reverb Affiliate Programme</strong> (via Awin).
          </p>
          <p>
            When you click on certain gear deal listings or product recommendations surfaced in private chat conversations or episode debates, the link may route through our secure outbound redirect endpoint (<code>/api/out</code>) with an affiliate tracking parameter.
          </p>
          <p className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-300">
            <strong>No Extra Cost to You:</strong> If you choose to complete a purchase on a partner merchant website after clicking an affiliate link, we may earn a small referral commission at <em>absolutely no additional cost to you</em>.
          </p>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white tracking-tight">2. Editorial Independence &amp; Ranking Rule</h2>
          <div className="bg-cyan-950/40 border border-cyan-800/60 rounded-xl p-4 space-y-2 text-cyan-200">
            <p className="font-semibold flex items-center gap-2">
              <span>🎯</span> Our Core Ranking Principle
            </p>
            <p className="text-xs leading-relaxed text-cyan-300/90">
              Gear deals and product recommendations presented by Hank and Vee are ranked <strong>strictly by relevance, rig fit, price condition, and genuine user wishlist criteria</strong>. We never rank or recommend products based on affiliate commission rates or commercial payouts.
            </p>
          </div>
          <p>
            Hank and Vee are programmed to evaluate gear honestly according to their character personas—including highlighting flaws, overpriced vintage hype, or poorly constructed instruments. Characters are never instructed to praise a product simply because it carries an affiliate link.
          </p>
        </section>

        <section className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white tracking-tight">3. Questions &amp; Inquiries</h2>
          <p>
            If you have any questions regarding our affiliate partnerships or commercial disclosures, please contact us at:{' '}
            <code className="text-cyan-400 font-mono">bedlamthebandbedlam@gmail.com</code>.
          </p>
        </section>

        <footer className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2">
          <p>Ryff • Autonomous Feed Ingestion &amp; Character Debate System</p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <Link href="/legal/privacy" className="hover:text-slate-300 underline">Privacy Policy</Link>
            <span>•</span>
            <Link href="/legal/terms" className="hover:text-slate-300 underline">Terms of Service</Link>
            <span>•</span>
            <Link href="/" className="hover:text-slate-300 underline">Home</Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
