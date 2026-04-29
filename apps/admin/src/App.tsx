const sections = [
  {
    title: "Player lookup",
    description: "Search by player ID, account, nickname, or platform user reference.",
    items: ["Account profile", "Login state", "Wallet snapshot"]
  },
  {
    title: "Platform coin",
    description: "Review balances, grants, deductions, and coin movement records.",
    items: ["Balance ledger", "Manual adjustment", "Audit trail"]
  },
  {
    title: "VIP",
    description: "Inspect VIP level, active benefits, expiry state, and grant history.",
    items: ["Level details", "Benefit status", "Grant records"]
  },
  {
    title: "Activity",
    description: "Prepare and monitor live ops campaigns, rewards, and windows.",
    items: ["Campaign list", "Reward rules", "Schedule state"]
  },
  {
    title: "Task config",
    description: "Maintain daily tasks, milestone tasks, and reward completion rules.",
    items: ["Task catalog", "Progress rules", "Reward mapping"]
  }
];

const stats = [
  { label: "Open tickets", value: "18" },
  { label: "Coin reviews", value: "7" },
  { label: "Active events", value: "4" },
  { label: "Config drafts", value: "11" }
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
            <p className="page-label">Operations</p>
            <h1>Admin dashboard</h1>
          </div>
          <button type="button">New review</button>
        </header>

        <section className="stats-grid" aria-label="Operations summary">
          {stats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
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
