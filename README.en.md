# Startup Tycoon H5

[简体中文](README.md) | English

`startup-tycoon-h5` is a self-developed business simulation text game source project. It includes a vertical H5 player client, an admin dashboard, a Node.js API server, Prisma/MySQL data models, seed data, product design documents, and concept images for learning, research, and secondary development.

Players act as startup founders and make business decisions around employees, projects, products, cash flow, funding, loans, market competition, guilds, events, leaderboards, and cross-server gameplay. This is not a frontend-only demo or a generic reskin template. It is a full-stack simulation game project with a database-backed backend and admin operations.

## Quick Links

| Goal | Entry |
| --- | --- |
| Quick start | See [Quick Start](#quick-start) |
| Player client source | `apps/client` |
| Admin dashboard source | `apps/admin` |
| API server source | `apps/api` |
| Database schema | `apps/api/prisma/schema.prisma` |
| Seed data | `apps/api/prisma/seed.ts` |
| Concept and UI images | `img` |
| Game UI assets | `apps/client/public/game-ui` |
| Product design docs | `docs/development-plan.md` |
| Monetization design | `docs/monetization-design.md` |
| Retention design | `docs/retention-design.md` |
| Activity design | `docs/activity-design.md` |
| Production readiness notes | `docs/production-readiness.md` |

## Common Commands

```bash
npm install
npm run db:generate -w @wenziyouxi/api
npm run db:push -w @wenziyouxi/api
npm run db:seed -w @wenziyouxi/api
npm run dev
```

Default local URLs:

- Player client: `http://127.0.0.1:5173`
- Admin dashboard: `http://127.0.0.1:5174`
- API server: `http://127.0.0.1:3001`

## Screenshots and Concept Images

### Home UI

![Home UI](img/ui-preview.png)

### Finance

![Finance](img/caiwu.png)

### Product R&D

![Product R&D](img/chanpin-yanfa.png)

### Market Competition

![Market Competition](img/shangzhan-jingzheng.png)

### Cross-Server Concept

![Cross-Server Concept](img/kuafujixian.png)

## Highlights

- Self-developed startup simulation gameplay, not a generic RPG reskin.
- Full-stack source code: player client, admin dashboard, API server, database schema, and seed data.
- Gameplay systems cover employees, projects, products, finance, funding, loans, market competition, guilds, seasons, activities, leaderboards, and cross-server gameplay.
- Product design documents are included for monetization, retention, activities, production readiness, UI rules, and development planning.
- Concept images, home UI references, feature entry images, employee portraits, and cross-server assets are included.
- Admin tools cover player management, compensation, configuration, activities, audit logs, analytics, and operation alerts.

## Feature Overview

### Account and Character Flow

The project includes player registration, login, session checks, server selection, avatar selection, founder naming, company naming, company profile creation, initial resources, and VIP3 starter benefits. Player profiles are stored in MySQL.

### Vertical H5 Player Client

The player client provides a vertical mobile game layout with a top resource bar, side feature entries, bottom navigation, company state, main tasks, and manager reminders. The visual direction uses a dark business game style with glass panels and gold accents. Some feature pages and the cross-server page still need to be rebuilt to fully match the concept art.

### Business Simulation

The company system includes level, experience, valuation, cash, monthly income, monthly expense, debt, risk status, customer satisfaction, employee satisfaction, reputation, action power, business clock, and finance reports. These values affect funding, loans, projects, market competition, tasks, and random business events.

### Employees

The employee system includes employee configs, recruitment, roster, roles, levels, salary, pressure, loyalty, growth potential, management, negotiation, execution, training, collection, employee events, and business effects. Employees influence project delivery, funding, market competition, and risk.

### Projects, Products, and Markets

Project delivery includes costs, cycles, success rates, rewards, failure penalties, and employee assignment. Product R&D includes users, retention, pay rate, ARPPU, acquisition cost, server cost, technical debt, progress, and refactoring. Market competition includes market tracks, industry heat, policy risk, player share, competitor share, pressure indicators, patent risk, and competitor actions.

### Finance, Funding, and Loans

Finance includes daily settlement, monthly settlement, income, expense, net cash flow, ending cash, total debt, debt ratio, and risk tips. Funding includes investors, rounds, ticket size, valuation, equity dilution, success rate, board pressure, terms, legal review, paused disbursement, and follow-on funding. Loans include applications, credit rating, principal, interest, installment repayment, overdue periods, penalties, early repayment, crisis loans, and bridge loans.

### Tasks and Manager Events

The project includes main tasks, daily tasks, side tasks, task progress, rewards, company experience, knowledge unlocks, random business tasks, manager todo items, deferred handling, expiration, action power costs, and category rotation. Random tasks can use risk insurance, market intelligence, finance advisor cards, and season pass extra tasks.

### Monetization and Inventory

The project includes platform coin wallet, ledgers, shop products, purchases, first purchase, VIP levels, VIP daily gifts, privileges, growth fund, season pass, daily business packs, purchase limits, inventory, item ledgers, action drinks, season experience tickets, risk insurance, market intelligence, and finance advisor cards. Real payment callbacks, signature verification, and automatic delivery are not included yet.

### Activities, Seasons, Rankings, and Scenarios

The project includes seasons, season tasks, season points, pass purchase, limited-time activities, activity registration, progress, rewards, temporary leaderboards, activity shop, activity config drafts, review, publish, settlement, leaderboard snapshots, titles, achievements, knowledge base, and business scenarios.

### Guilds and Cross-Server Gameplay

Guilds include joining, applications, members, roles, help requests, tasks, contributions, tech upgrades, collaboration projects, logs, leaderboards, and rewards. Cross-server gameplay includes server groups, registration, personal arena, attempts, recovery, rewards, settlement, guild registration, and guild settlement. The cross-server UI still needs further work to match the concept art.

### Mail, Chat, and Admin Dashboard

Mail includes player mail, rewards, compensation, and unread counts. Chat includes channels and admin keyword management. Admin tools include login, player search, ban/unban, wallet adjustment, VIP adjustment, title grant/revoke, mail compensation, config center, activity drafts, activity review/publish, cross-server groups, cross-server rules, guild management, knowledge management, chat keywords, analytics, economy alerts, operation alerts, and audit logs.

## Known Limitations

- The cross-server page has not been fully rebuilt according to the concept art yet.
- Some frontend feature pages still use native/basic styling and need to be redesigned to match the concept UI.
- Real payment integration is not included. The current payment flow only reserves external order records.
- Redis configuration is reserved, but production-grade cache, queues, rate limits, and scheduled operation jobs can still be extended.
- Admin permissions are closer to a single super-admin model. Multi-role RBAC can be added later.
- Content pools can still be expanded, including employee events, funding/loan random tasks, season activities, business scenarios, and knowledge cards.
- Production deployment, monitoring, backups, load testing, compliance, privacy policy, and user agreements must be completed before a real launch.

## Tech Stack

Environment:

- Node.js 20+
- npm workspaces
- TypeScript
- MySQL 8+
- Redis 7+, currently reserved for future extension
- Git

Frontend:

- React 19
- React DOM 19
- Vite 7
- ESLint

Backend:

- Node.js HTTP Server
- Prisma 6
- MySQL
- tsx
- Node test runner

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```powershell
Copy-Item .env.example .env
```

On macOS / Linux:

```bash
cp .env.example .env
```

3. Update `.env`:

```env
DATABASE_URL=mysql://root:password@127.0.0.1:3306/wenziyouxi
JWT_SECRET=replace-with-local-secret
ADMIN_PASSWORD=replace-with-local-admin-password
```

4. Create the MySQL database:

```sql
CREATE DATABASE wenziyouxi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

5. Initialize Prisma and seed data:

```bash
npm run db:generate -w @wenziyouxi/api
npm run db:push -w @wenziyouxi/api
npm run db:seed -w @wenziyouxi/api
```

6. Start development services:

```bash
npm run dev
```

## Database

The project uses MySQL + Prisma. The full schema is in `apps/api/prisma/schema.prisma`, and seed data is in `apps/api/prisma/seed.ts`. The repository does not include production databases, real user data, real order data, payment secrets, or production admin passwords.

Core model groups:

| Group | Main Models |
| --- | --- |
| Accounts and admin | `Account`, `AccountSession`, `AdminUser`, `AdminSession`, `AdminAuditLog` |
| Servers and player profiles | `GameServer`, `AvatarOption`, `PlayerProfile` |
| Business simulation | `CompanyFinanceReport`, `TaskConfig`, `PlayerTaskProgress`, `RandomTaskConfig`, `PlayerRandomTask` |
| Employees, projects, products, markets | `EmployeeConfig`, `PlayerEmployee`, `ProjectConfig`, `PlayerProject`, `ProductConfig`, `PlayerProduct`, `MarketTrackConfig`, `PlayerMarketState`, `CompetitorActionConfig`, `PlayerCompetitorAction` |
| Finance, funding, loans | `LoanConfig`, `PlayerLoan`, `InvestorConfig`, `PlayerFunding`, `PlayerPlatformWallet`, `PlatformCoinLedger` |
| Shop, VIP, inventory | `ShopProductConfig`, `PlayerShopPurchase`, `VipLevelConfig`, `PlayerVipDailyGift`, `ItemConfig`, `PlayerInventoryItem`, `PlayerItemLedger` |
| Seasons, activities, leaderboards | `SeasonConfig`, `SeasonTaskConfig`, `ActivityConfig`, `ActivityConfigDraft`, `ActivityShopItemConfig`, `LeaderboardSnapshot`, `LeaderboardRewardDelivery` |
| Guilds and cross-server | `Guild`, `GuildMember`, `GuildTaskConfig`, `GuildTechConfig`, `GuildHelpRequest`, `CrossServerGroup`, `CrossServerSignup`, `CrossServerGuildSignup`, `PlayerCrossServerArenaState` |
| Events, mail, chat, knowledge | `EventConfig`, `PlayerEvent`, `KnowledgeCategory`, `KnowledgeEntry`, `PlayerKnowledgeUnlock`, `AdminMailCompensation` |

## Project Structure

```text
startup-tycoon-h5/
├── apps/
│   ├── client/              # H5 player client
│   │   ├── src/             # React frontend source
│   │   ├── public/game-ui/  # Game UI, employee portraits, cross-server assets
│   │   └── test/            # Client tests
│   ├── admin/               # Admin dashboard
│   │   ├── src/             # Admin React source
│   │   └── test/            # Admin tests
│   └── api/                 # API server
│       ├── src/             # Backend logic and HTTP routes
│       ├── prisma/          # Prisma schema and seed data
│       └── test/            # API tests
├── packages/
│   └── shared/              # Shared types
├── docs/                    # Product, retention, monetization, activity, release docs
├── img/                     # Concept images and UI references
├── .env.example             # Local env example
├── package.json             # npm workspaces root config
└── README.md
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start all workspace development services |
| `npm run dev:client` | Start only the player client |
| `npm run dev:admin` | Start only the admin dashboard |
| `npm run dev:api` | Start only the API server |
| `npm run build` | Build all workspaces |
| `npm run typecheck` | Run TypeScript checks |
| `npm run lint` | Run ESLint checks |
| `npm run test` | Run tests |
| `npm run db:generate -w @wenziyouxi/api` | Generate Prisma Client |
| `npm run db:push -w @wenziyouxi/api` | Sync database schema |
| `npm run db:seed -w @wenziyouxi/api` | Seed initial game data |

## Secondary Development Path

1. Start the local environment and verify the player client, admin dashboard, and API server.
2. Try the main player flow: register, select server, create company, recruit employees, progress projects, and handle manager todos.
3. Explore the admin dashboard: player search, wallet/VIP, mail compensation, activity config, and audit logs.
4. Read the database models: start with `PlayerProfile`, `EmployeeConfig`, `TaskConfig`, `ShopProductConfig`, `Guild`, `SeasonConfig`, and `ActivityConfig`.
5. To change gameplay, start with `apps/api/prisma/seed.ts` and the related backend logic.
6. To change UI, start with `img` and `apps/client/public/game-ui`.
7. For production launch, add payments, deployment, monitoring, backups, logs, role-based permissions, compliance, and legal documents.

## License

MIT License is recommended. Before publishing as an open-source project, add a root `LICENSE` file with the final copyright owner.

## Contact

The repository root includes contact and support QR codes:

- WeChat: `wx.jpg`
- Donation/support: `zhanshang.png`

If you build a derivative project, reskin, commercial deployment, or custom version from this project, you can contact the author through WeChat.
