import { useState } from "react";

// Brand colours from logo
// Navy:   #1F4E78
// Amber:  #FFD700
// Green:  #2E5E4E
// Cream:  #7A8F79

export default function Marketing() {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Poppins', 'Inter', sans-serif" }}>

      {/* ── NAV ── */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-6">
        <span className="text-white text-2xl font-bold tracking-tight">WebbMuster</span>
        <a
          href="#access"
          style={{ borderColor: "#FFD700", color: "#FFD700" }}
          className="text-sm font-semibold border-2 rounded-full px-5 py-2 hover:bg-yellow-400/10 transition-all"
        >
          Request a demo
        </a>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-end pb-28 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1562802967-1c80450a2bd8?w=1800&q=80')",
          }}
        />
        {/* Deep navy gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, #1F4E78 0%, rgba(30,58,95,0.7) 50%, rgba(19,59,46,0.3) 100%)" }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-8">
          <p className="text-xs font-bold tracking-widest uppercase mb-6" style={{ color: "#FFD700" }}>
            Australian Red Meat Industry
          </p>
          <h1 className="text-white text-5xl md:text-6xl font-bold leading-tight mb-6 max-w-3xl">
            Intelligence, operations and decision making for the Australian red meat industry.
          </h1>
          <p className="text-white/70 text-xl mb-10">
            Built for processors. Powered by data.
          </p>
          <a
            href="#access"
            className="inline-block font-bold text-base px-8 py-4 rounded-full transition-all hover:scale-105"
            style={{ backgroundColor: "#FFD700", color: "#1F4E78", boxShadow: "0 0 20px rgba(245,208,0,0.5), 0 0 40px rgba(245,208,0,0.2)" }}
          >
            Request a chat or demo
          </a>
        </div>
      </section>

      {/* ── FOUR CAPABILITY CARDS ── */}
      <section className="py-24 px-8" style={{ backgroundColor: "#7A8F79" }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase mb-3 text-center" style={{ color: "#FFD700" }}>
            What Muster does
          </p>
          <h2 className="text-center text-3xl font-bold mb-12 text-white">
            Built for the kill floor. Connected to the paddock.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: "#FFD700" }}>
                <svg className="w-5 h-5" style={{ color: "#1F4E78" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: "#1F4E78" }}>Kill Scheduling and Coordination</h3>
              <p className="text-base leading-relaxed" style={{ color: "#666" }}>
                A live kill board for processors. Manage bookings, slot times, species, head count and transport in one place. Your ops team always knows what is arriving and when.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: "#FFD700" }}>
                <svg className="w-5 h-5" style={{ color: "#1F4E78" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: "#1F4E78" }}>Compliance and Traceability</h3>
              <p className="text-base leading-relaxed" style={{ color: "#666" }}>
                NVD status, PIC verification, NLIS checks and eNVD references tracked against every booking. Compliance documentation moves ahead of the mob — not behind it.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: "#FFD700" }}>
                <svg className="w-5 h-5" style={{ color: "#1F4E78" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: "#1F4E78" }}>Supply Forecasting</h3>
              <p className="text-base leading-relaxed" style={{ color: "#666" }}>
                Know what is coming before it is booked. Muster surfaces supply signals from across the producer network so your forward schedule reflects reality, not guesswork.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: "#FFD700" }}>
                <svg className="w-5 h-5" style={{ color: "#1F4E78" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: "#1F4E78" }}>AI Agents and Automation</h3>
              <p className="text-base leading-relaxed" style={{ color: "#666" }}>
                Muster runs intelligent agents across your operations. Morning briefings, compliance alerts, supply gap detection and booking recommendations — delivered before your team asks for them.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── BOLD STATEMENT ── */}
      <section className="relative py-36 px-8 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1554755209-85e44182e019?w=1800&q=80')" }}
        />
        <div className="absolute inset-0" style={{ backgroundColor: "rgba(30,58,95,0.8)" }} />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <p className="text-white text-4xl md:text-6xl font-bold leading-tight">
            Every animal. Every movement.
          </p>
          <p className="text-4xl md:text-6xl font-bold mt-2" style={{ color: "#FFD700" }}>
            Every data point.
          </p>
        </div>
      </section>

      {/* ── PRODUCER INTELLIGENCE ── */}
      <section className="py-24 px-8 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-bold tracking-widest uppercase mb-6" style={{ color: "#FFD700" }}>
            Producer Intelligence
          </p>
          <p className="text-2xl md:text-3xl font-light leading-relaxed" style={{ color: "#1F4E78" }}>
            Muster brings producers, feedlotters and grazers into the system. Everyone working together, from the paddock to the floor.
          </p>
        </div>
      </section>

      {/* ── HOW WE WORK ── */}
      <section className="py-24 px-8" style={{ backgroundColor: "#1F4E78" }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold tracking-widest uppercase mb-12 text-center" style={{ color: "#FFD700" }}>
            How we work
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {[
              { number: "01", title: "Connect", body: "Your supply chain in one place. Processors, feedlotters, producers and grazers all working from the same system." },
              { number: "02", title: "Coordinate", body: "Live scheduling, compliance and traceability. Every booking, every head, every document tracked in real time." },
              { number: "03", title: "Decide", body: "Better data. Sharper decisions. Know what is arriving, what it is worth, and what to do next before anyone else does." },
              { number: "04", title: "Learn", body: "Every season adds another layer. Muster gets smarter quietly, in the background so your operation does too." },
            ].map((step) => (
              <div key={step.number} className="text-center md:text-left">
                <p className="text-5xl font-bold mb-4" style={{ color: "rgba(245,208,0,0.25)" }}>{step.number}</p>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REQUEST ACCESS ── */}
      <section id="access" className="py-24 px-8" style={{ backgroundColor: "#7A8F79" }}>
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">Work with us.</h2>
          <p className="text-lg mb-10" style={{ color: "rgba(255,255,255,0.75)" }}>
            We are onboarding enterprise partners now. Tell us about your operation and we will be in touch within 24 hours.
          </p>

          {submitted ? (
            <div className="rounded-2xl p-8" style={{ backgroundColor: "rgba(242,135,5,0.1)", border: "1px solid rgba(242,135,5,0.3)" }}>
              <p className="text-lg font-semibold" style={{ color: "#1F4E78" }}>Thanks — we will be in touch shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-5 py-4 rounded-xl border text-base focus:outline-none bg-white"
                style={{ borderColor: "#ddd", color: "#1F4E78" }}
              />
              <input
                type="email"
                placeholder="Work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-4 rounded-xl border text-base focus:outline-none bg-white"
                style={{ borderColor: "#ddd", color: "#1F4E78" }}
              />
              <input
                type="text"
                placeholder="Organisation"
                value={org}
                onChange={(e) => setOrg(e.target.value)}
                className="w-full px-5 py-4 rounded-xl border text-base focus:outline-none bg-white"
                style={{ borderColor: "#ddd", color: "#1F4E78" }}
              />
              <button
                type="submit"
                className="w-full font-bold text-base px-8 py-4 rounded-full transition-all hover:scale-105 mt-2"
                style={{ backgroundColor: "#FFD700", color: "#1F4E78", boxShadow: "0 0 20px rgba(255,229,0,0.6)" }}
              >
                Request a chat or demo
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-8" style={{ backgroundColor: "#2E5E4E" }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-2xl font-bold text-white">WebbMuster</span>
          <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>webbmuster.com.au</span>
          <span className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>© 2026 Webb Muster Pty Ltd</span>
        </div>
      </footer>

    </div>
    </>
  );
}
