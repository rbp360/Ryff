import Link from 'next/link';

export const metadata = {
  title: 'RYFF – Your Rig. Your News. A Bot with an Opinion.',
  description:
    'Reads 40+ premier guitar feeds, filters stories and Reverb deals to your rig, and delivers opinionated daily takes from Hank and Vee.',
};

export default function WelcomePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--tx)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Marketing Header */}
      <header
        style={{
          borderBottom: '1px solid var(--ln)',
          background: 'rgba(5,5,5,0.9)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1040px',
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ryff_pick.jpg" alt="RYFF Pick" style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover' }} />
            <span style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
              RYFF
            </span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link
              href="/digest"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--mu)',
                textDecoration: 'none',
              }}
            >
              Today&apos;s Radar
            </Link>
            <Link
              href="/login"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--tx)',
                padding: '6px 14px',
                border: '1px solid var(--ln)',
                borderRadius: '8px',
                textDecoration: 'none',
              }}
            >
              Sign In
            </Link>
            <Link
              href="/"
              style={{
                fontSize: '12px',
                fontWeight: 800,
                background: 'var(--ac)',
                color: '#000',
                padding: '7px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
              }}
            >
              Open App ›
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, width: '100%', maxWidth: '1040px', margin: '0 auto', padding: '56px 24px 80px' }}>
        {/* HERO SECTION */}
        <section style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-block',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ac)',
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.25)',
              padding: '4px 12px',
              borderRadius: '20px',
              marginBottom: '20px',
            }}
          >
            SongDeck Guitar Intelligence
          </div>

          <h1
            style={{
              fontSize: 'clamp(32px, 5.5vw, 54px)',
              fontWeight: 900,
              lineHeight: 1.05,
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              marginBottom: '18px',
              fontFamily: 'var(--font-display)',
            }}
          >
            Your Rig. Your News.
            <br />
            <span style={{ color: 'var(--ac)' }}>A Bot with an Opinion.</span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(15px, 2vw, 18px)',
              color: '#d1d1d1',
              lineHeight: 1.6,
              maxWidth: '660px',
              margin: '0 auto 28px',
            }}
          >
            RYFF reads 40+ guitar feeds, YouTube channels, and used marketplaces twice a day. It matches every story to the gear you own and want, then gives you the unvarnished truth.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <Link
              href="/"
              style={{
                fontSize: '14px',
                fontWeight: 800,
                background: 'var(--ac)',
                color: '#000',
                padding: '13px 28px',
                borderRadius: '10px',
                textDecoration: 'none',
              }}
            >
              Get Started Free ›
            </Link>
            <Link
              href="/digest"
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--tx)',
                padding: '13px 24px',
                borderRadius: '10px',
                border: '1px solid var(--ln)',
                background: 'var(--sf)',
                textDecoration: 'none',
              }}
            >
              Browse Today&apos;s Radar
            </Link>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--mu)', fontWeight: 600 }}>
            <span style={{ color: 'var(--ac2)', fontWeight: 800 }}>+ TWO-TAP GEAR LOGGING:</span> Speak or type repairs, restrings, and parts swaps in seconds.
          </p>

          {/* HERO BRANDING IMAGE */}
          <div style={{ marginTop: '36px', overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--ln)', boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 30px rgba(34,197,94,0.12)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ryff_main.jpg"
              alt="RYFF Main Banner"
              style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
            />
          </div>
        </section>

        {/* HERO INTERACTIVE PREVIEW CARD */}
        <section
          style={{
            marginTop: '48px',
            background: 'var(--sf)',
            border: '1px solid var(--ln)',
            borderRadius: 'var(--r)',
            padding: '24px',
            maxWidth: '760px',
            margin: '48px auto 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--ac)' }} />
            <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--mu)', letterSpacing: '0.06em' }}>
              Live Background Pipeline Activity
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              padding: '16px',
              background: '#090909',
              border: '1px solid var(--ln)',
              borderRadius: '10px',
              marginBottom: '16px',
            }}
          >
            <div>
              <div style={{ fontSize: '26px', fontWeight: 900 }}>47</div>
              <div style={{ fontSize: '11px', color: 'var(--mu)', fontWeight: 600 }}>Sources checked</div>
            </div>
            <div>
              <div style={{ fontSize: '26px', fontWeight: 900 }}>81</div>
              <div style={{ fontSize: '11px', color: 'var(--mu)', fontWeight: 600 }}>New stories ingested</div>
            </div>
            <div>
              <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--ac)' }}>3</div>
              <div style={{ fontSize: '11px', color: 'var(--mu)', fontWeight: 600 }}>Matched to your Rig Passport</div>
            </div>
          </div>

          {/* Hank's Takeaway Preview */}
          <div
            style={{
              background: '#0a0a0a',
              borderLeft: '3px solid var(--ac)',
              borderRadius: '0 8px 8px 0',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                minWidth: '40px',
                borderRadius: '50%',
                background: '#1a1a1a',
                border: '1px solid #333',
                display: 'grid',
                placeItems: 'center',
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--mu)',
              }}
            >
              Hank
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--mu)' }}>Hank&apos;s Daily Verdict</div>
              <p style={{ fontSize: '14px', fontWeight: 500, margin: '2px 0 0', lineHeight: 1.4 }}>
                &ldquo;Real tone comes from fingers and wood, not an engineer&apos;s expensive knobs. Your rig already does this.&rdquo;
              </p>
            </div>
          </div>
        </section>

        {/* 3-STEP PIPELINE: HOW IT WORKS */}
        <section style={{ marginTop: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <h2
              style={{
                fontSize: '13px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--ac)',
                marginBottom: '8px',
              }}
            >
              How It Works
            </h2>
            <h3 style={{ fontSize: '28px', fontWeight: 900, textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>
              From Feeds to Rig Intelligence in 3 Steps
            </h3>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '18px',
            }}
          >
            {/* Step 1 */}
            <div
              style={{
                background: 'var(--sf)',
                border: '1px solid var(--ln)',
                borderRadius: 'var(--r)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--ac)' }}>STEP 01</span>
                <h4 style={{ fontSize: '18px', fontWeight: 900, margin: '8px 0 10px', textTransform: 'uppercase' }}>
                  Build Your Rig Passport in 2 Taps
                </h4>
                <p style={{ fontSize: '13.5px', color: 'var(--mu)', lineHeight: 1.55 }}>
                  Speak or type your guitars, amps, pedals, and wants. Ryff monitors string age, valve maintenance, pickup swaps, and mod notes with 1-tap voice memos.
                </p>
              </div>
              <div style={{ marginTop: '20px', padding: '10px', background: '#0a0a0a', borderRadius: '8px', border: '1px solid var(--ln)', fontSize: '12px' }}>
                <span style={{ color: 'var(--ac)' }}>🎙️ Voice Memo:</span> &ldquo;Changed strings on my PRS with 10-46 Elixirs.&rdquo;
              </div>
            </div>

            {/* Step 2 */}
            <div
              style={{
                background: 'var(--sf)',
                border: '1px solid var(--ln)',
                borderRadius: 'var(--r)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--ac2)' }}>STEP 02</span>
                <h4 style={{ fontSize: '18px', fontWeight: 900, margin: '8px 0 10px', textTransform: 'uppercase' }}>
                  Smart Radar Reads the World
                </h4>
                <p style={{ fontSize: '13.5px', color: 'var(--mu)', lineHeight: 1.55 }}>
                  Ryff clusters breaking gear news across 40+ outlets, YouTube transcripts, and forums. It highlights stories matching your gear with <span style={{ color: 'var(--ac2)', fontWeight: 700 }}>Matches: [Your Gear]</span> tags.
                </p>
              </div>
              <div style={{ marginTop: '20px', padding: '10px', background: '#0a0a0a', borderRadius: '8px', border: '1px solid var(--ln)', fontSize: '12px' }}>
                <span style={{ color: 'var(--ac2)' }}>🎯 Matched:</span> Marshall DSL50 mod thread & Reverb price drops.
              </div>
            </div>

            {/* Step 3 */}
            <div
              style={{
                background: 'var(--sf)',
                border: '1px solid var(--ln)',
                borderRadius: 'var(--r)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--ac)' }}>STEP 03</span>
                <h4 style={{ fontSize: '18px', fontWeight: 900, margin: '8px 0 10px', textTransform: 'uppercase' }}>
                  Hank & Vee Clash in Backstage
                </h4>
                <p style={{ fontSize: '13.5px', color: 'var(--mu)', lineHeight: 1.55 }}>
                  Hank (the grumpy vintage luthier) and Vee (the modern modeller deal-hunter) debate the news so you get a second view. Jump in 1-on-1 to ask for direct advice.
                </p>
              </div>
              <div style={{ marginTop: '20px', padding: '10px', background: '#0a0a0a', borderRadius: '8px', border: '1px solid var(--ln)', fontSize: '12px' }}>
                <span style={{ color: 'var(--ac)' }}>⚡ 1-on-1:</span> Ask Hank if that used tube amp is worth buying.
              </div>
            </div>
          </div>
        </section>

        {/* MARKETPLACE & TRADER HIGHLIGHT */}
        <section
          style={{
            marginTop: '80px',
            background: 'var(--sf)',
            border: '1px solid var(--ln)',
            borderRadius: 'var(--r)',
            padding: '36px 28px',
          }}
        >
          <div style={{ maxWidth: '640px' }}>
            <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--ac)', textTransform: 'uppercase' }}>
              Used Marketplace Intelligence
            </span>
            <h3 style={{ fontSize: '26px', fontWeight: 900, margin: '8px 0 12px', textTransform: 'uppercase', fontFamily: 'var(--font-display)' }}>
              Never Overpay for Used Gear
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--mu)', lineHeight: 1.6, marginBottom: '20px' }}>
              Add instruments to your Wants list with a budget cap. Ryff automatically scans Reverb twice daily with geographic geo-filtering (UK Only, Ships to UK, US Only, Worldwide) and alerts you to price drops and days on market.
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ padding: '8px 14px', background: '#0a0a0a', border: '1px solid var(--ln)', borderRadius: '8px', fontSize: '12px' }}>
                <b>📉 True Price Drops</b> (was £629 · now £549)
              </div>
              <div style={{ padding: '8px 14px', background: '#0a0a0a', border: '1px solid var(--ln)', borderRadius: '8px', fontSize: '12px' }}>
                <b>⏱️ Days on Market</b> (negotiate with confidence)
              </div>
              <div style={{ padding: '8px 14px', background: '#0a0a0a', border: '1px solid var(--ln)', borderRadius: '8px', fontSize: '12px' }}>
                <b>📍 Geo-Filtered Shipping</b> (no customs surprises)
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA CALLOUT */}
        <section style={{ textAlign: 'center', marginTop: '80px', padding: '48px 24px', background: '#080808', border: '1px solid var(--ln)', borderRadius: 'var(--r)' }}>
          <h3 style={{ fontSize: '28px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '12px', fontFamily: 'var(--font-display)' }}>
            Ready to Cut Through the Noise?
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--mu)', maxWidth: '520px', margin: '0 auto 24px', lineHeight: 1.5 }}>
            Join guitarist beta testers. Build your Rig Passport, read tailored gear intelligence, and debate with Hank and Vee.
          </p>
          <Link
            href="/"
            style={{
              fontSize: '14px',
              fontWeight: 800,
              background: 'var(--ac)',
              color: '#000',
              padding: '14px 32px',
              borderRadius: '10px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Launch RYFF Free ›
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--ln)',
          padding: '24px 24px 32px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--mu)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '10px' }}>
          <Link href="/legal/privacy" style={{ color: 'var(--mu)', textDecoration: 'underline' }}>
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/legal/terms" style={{ color: 'var(--mu)', textDecoration: 'underline' }}>
            Terms of Service
          </Link>
          <span>•</span>
          <Link href="/legal/disclosure" style={{ color: 'var(--mu)', textDecoration: 'underline' }}>
            Affiliate Disclosure
          </Link>
        </div>
        <p style={{ margin: 0, fontSize: '11px', color: '#555' }}>
          Ryff is part of the SongDeck family. AI fictional personas. Not professional advice.
        </p>
      </footer>
    </div>
  );
}
