const workflow = [
  ["01", "Shape your organisation", "Create a shared workspace and organise people into the units, departments or crews they already work with."],
  ["02", "Assign without the puzzle", "Distribute recurring tasks fairly and keep ownership, timing and responsibilities clear."],
  ["03", "Move work forward", "Publish one reliable work plan and keep everyone informed from the same place."],
];

export function LandingPage({ onNavigate }) {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <a className="brand-lockup" href="#top" aria-label="Rosterly home"><span className="brand-mark">R</span><span>Rosterly</span></a>
        <nav aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#for-teams">For teams</a></nav>
        <div className="nav-actions"><button className="text-button" onClick={() => onNavigate("login")}>Sign in</button><button className="button button-dark" onClick={() => onNavigate("team")}>Start your team <span>↗</span></button></div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <div className="hero-kicker"><span className="pulse-dot" /> Built for teams that share the work</div>
            <h1>Less time assigning.<br /><em>More work moving.</em></h1>
            <p>Rosterly gives organisations one thoughtful place to structure teams, distribute recurring tasks fairly and keep every work cycle moving smoothly.</p>
            <div className="hero-actions"><button className="button button-primary" onClick={() => onNavigate("team")}>Create your workspace <span>→</span></button><button className="button button-light" onClick={() => onNavigate("signup")}>Join an existing team</button></div>
            <div className="hero-note"><span>✓</span> Free to start <span>·</span> No card required <span>·</span> Set up in minutes</div>
          </div>

          <div className="hero-visual" aria-label="Team task dashboard preview">
            <div className="preview-window">
              <div className="preview-sidebar"><span className="mini-logo">R</span><i /><i /><i /><i /></div>
              <div className="preview-content">
                <div className="preview-top"><div><small>MONDAY, 17 AUGUST</small><strong>Good morning, Jordan.</strong></div><span className="preview-avatar">JO</span></div>
                <div className="preview-banner"><div><small>NEXT WORK CYCLE</small><strong>Weekly operations</strong><span>9:00 AM · Main workspace</span></div><b>4 days</b></div>
                <div className="preview-grid">
                  <div className="preview-card large"><div className="preview-label">TODAY'S TEAM</div><div className="preview-person"><span>AM</span><p><strong>Amara Okafor</strong><small>Operations</small></p><b>Lead</b></div><div className="preview-person"><span>DK</span><p><strong>David King</strong><small>Customer support</small></p><b>Ready</b></div><div className="preview-person"><span>TN</span><p><strong>Tolu Nnaji</strong><small>Field team</small></p><b>Ready</b></div></div>
                  <div className="preview-card"><div className="preview-label">TASK COVERAGE</div><div className="donut"><span>92<small>%</small></span></div><p className="centered">11 of 12 tasks assigned</p></div>
                </div>
              </div>
            </div>
            <div className="floating-card float-one"><span className="float-icon">✓</span><p><strong>Work plan published</strong><small>12 members notified</small></p></div>
            <div className="floating-card float-two"><p><small>FAIR ROTATION</small><strong>Everyone gets a turn.</strong></p><span>∿</span></div>
          </div>
        </section>

        <section className="trust-strip"><span>Made for every coordinated team</span><div><b>Operations</b><b>Healthcare</b><b>Events</b><b>Field teams</b><b>Support</b></div></section>

        <section className="workflow-section" id="how-it-works">
          <div className="section-heading"><p className="eyebrow">A simpler rhythm</p><h2>From scattered instructions to<br />one clear plan.</h2></div>
          <div className="workflow-grid">{workflow.map(([number, title, copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
        </section>

        <section className="cta-section" id="for-teams"><div><p className="eyebrow">Ready for what is next</p><h2>Your team deserves a clearer workday.</h2><p>Start a workspace, organise your units and make the next work plan your easiest one yet.</p></div><button className="button button-primary" onClick={() => onNavigate("team")}>Start your team <span>→</span></button></section>
      </main>
      <footer><div className="brand-lockup"><span className="brand-mark">R</span><span>Rosterly</span></div><p>Built to help people share responsibility and work well, together.</p><button className="text-button" onClick={() => onNavigate("login")}>Team sign in →</button></footer>
    </div>
  );
}
