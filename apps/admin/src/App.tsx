const sections = [
  {
    title: "Account login",
    description: "Confirm login entry, token handling, and account identity checks are ready.",
    items: ["Login form", "Session token", "Account lookup"]
  },
  {
    title: "Server selection",
    description: "Prepare region and server choices before player profile creation starts.",
    items: ["Region list", "Server list", "Default server"]
  },
  {
    title: "Avatar naming",
    description: "Check nickname input, duplicate name response, and reserved word messaging.",
    items: ["Name input", "Duplicate check", "Blocked terms"]
  },
  {
    title: "Profile creation",
    description: "Track the final creation request, starter profile, and completion state.",
    items: ["Create request", "Starter profile", "Completion state"]
  }
];

const readiness = [
  {
    title: "Account login",
    status: "API ready",
    summary: "Registration, login, and session token checks are available.",
    checks: ["Register endpoint", "Login endpoint", "Session endpoint"]
  },
  {
    title: "Server selection",
    status: "API ready",
    summary: "Server list and recommended server fields are available.",
    checks: ["Server list", "Recommended server", "Status label"]
  },
  {
    title: "Avatar naming",
    status: "API ready",
    summary: "Avatar list and founder/company validation are available.",
    checks: ["Avatar list", "Founder name rule", "Company name rule"]
  },
  {
    title: "Profile creation",
    status: "API ready",
    summary: "Player profile creation is isolated per account and server.",
    checks: ["Create endpoint", "Duplicate guard", "Profile lookup"]
  }
];

export default function App() {
  return (
    <main className="admin-shell">
      <aside className="sidebar" aria-label="Admin navigation">
        <div className="brand">
          <span className="brand-mark">W</span>
          <div>
            <strong>Wenziyouxi</strong>
            <span>Admin console</span>
          </div>
        </div>

        <nav className="nav-list">
          {sections.map((section) => (
            <a href={`#${section.title.toLowerCase().replaceAll(" ", "-")}`} key={section.title}>
              {section.title}
            </a>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="page-label">Phase 1 readiness</p>
            <h1>Backend/admin launch checks</h1>
          </div>
          <button type="button">Review status</button>
        </header>

        <section className="readiness-panel" aria-label="Backend and admin readiness">
          <div className="panel-copy">
            <p className="page-label">Phase 1 API integrated</p>
            <h2>Account setup flow</h2>
            <p>
              A concise admin view for confirming registration, login, server choice, avatar
              selection, and profile creation readiness.
            </p>
          </div>

          <div className="readiness-grid">
            {readiness.map((item) => (
              <article className="readiness-card" key={item.title}>
                <div className="readiness-card-header">
                  <h3>{item.title}</h3>
                  <span>{item.status}</span>
                </div>
                <p>{item.summary}</p>
                <ul>
                  {item.checks.map((check) => (
                    <li key={check}>{check}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="flow-summary" aria-label="Readiness flow status">
          {readiness.map((item, index) => (
            <article className="flow-step" key={item.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2>{item.title}</h2>
                <p>{item.status}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="module-grid" aria-label="Admin modules">
          {sections.map((section) => (
            <article className="module-card" id={section.title.toLowerCase().replaceAll(" ", "-")} key={section.title}>
              <div>
                <h2>{section.title}</h2>
                <p>{section.description}</p>
              </div>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
