const resources = [
  { label: "现金", value: "¥128,400" },
  { label: "声望", value: "42" },
  { label: "团队", value: "18人" },
  { label: "回合", value: "第 12 周" }
];

const actions = ["招聘", "研发", "谈判", "投放"];
const reports = [
  { label: "产品进度", value: "68%" },
  { label: "现金流压力", value: "中" },
  { label: "团队士气", value: "稳定" }
];
const navItems = ["公司", "市场", "项目", "人脉"];

function App() {
  return (
    <main className="app-shell">
      <header className="resource-bar" aria-label="资源概览">
        <div>
          <p className="caption">星火创业社</p>
          <h1>写字楼里的第一个百万用户</h1>
        </div>
        <dl className="resource-list">
          {resources.map((resource) => (
            <div className="resource-item" key={resource.label}>
              <dt>{resource.label}</dt>
              <dd>{resource.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section className="playfield" aria-label="经营场景">
        <aside className="action-rail" aria-label="主要行动">
          {actions.map((action) => (
            <button type="button" key={action}>
              {action}
            </button>
          ))}
        </aside>

        <section className="office-scene">
          <div className="window-grid" aria-hidden="true" />
          <div className="desk desk-left" />
          <div className="desk desk-center" />
          <div className="desk desk-right" />
          <div className="scene-note">
            <strong>办公室</strong>
            <span>团队正在冲刺 H5 首发版本</span>
          </div>
        </section>

        <aside className="status-panel" aria-label="本周状态">
          <p className="caption">经营状态</p>
          <h2>发布前夜</h2>
          <p>
            投资人下周到访，当前目标是在预算耗尽前完成核心玩法验证。
          </p>
          <dl>
            {reports.map((report) => (
              <div key={report.label}>
                <dt>{report.label}</dt>
                <dd>{report.value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </section>

      <nav className="bottom-nav" aria-label="底部导航">
        {navItems.map((item, index) => (
          <button className={index === 0 ? "active" : undefined} type="button" key={item}>
            {item}
          </button>
        ))}
      </nav>
    </main>
  );
}

export default App;
