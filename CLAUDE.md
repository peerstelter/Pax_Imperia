# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Session Start Protocol

At the start of every session:
1. Read `ROADMAP.md` to identify the current phase and last completed task.
2. State the current phase and last completed task number before doing any work.
3. Pick up from the next uncompleted task.

After every task: mark it done in `ROADMAP.md`, commit, and push to GitHub.

---

## Commands

These commands will work once Phase 1 scaffolding is in place:

```bash
npm install --workspaces   # Install all workspace dependencies
npm run dev                # Start client (:5173) + API (:3000) concurrently
docker-compose up --build  # Production build via Nginx proxy (:80)
```

Testing (Vitest for client, Jest for server — set up in Task 2):
```bash
npm run test               # Run all workspace tests
npm run test --workspace=client
npm run test --workspace=server
```

Lint/format (ESLint + Prettier — configured in Task 2):
```bash
npm run lint
npm run format
```

---

## Architecture

**Monorepo** with three npm workspaces:

| Workspace | Purpose |
|---|---|
| `client/` | React 18 + Vite PWA frontend |
| `server/` | Node.js + Express REST API with SQLite |
| `shared/` | TypeScript types and constants shared between both |

**The `shared/` workspace is the contract between client and server.** Define all types there in Phase 1 before building any system. Key files:
- `shared/types.ts` — all domain types (`Faction`, `Province`, `Army`, `Unit`, `DiplomaticRelation`, `IntrigueAction`)
- `shared/combat.ts` — the troop counter matrix constant, imported by both client (UI hints) and server (combat resolution)

**Core type contracts:**
```ts
type Biome        = 'default' | 'steppe' | 'desert' | 'isles' | 'tundra'
type TroopType    = 'cavalry' | 'polearms' | 'archers' | 'heavy_infantry' | 'light_infantry'
type Diplomacy    = 'alliance' | 'marriage' | 'trade' | 'vassalage' | 'non_aggression'
type Intrigue     = 'spy' | 'assassinate' | 'sabotage' | 'bribe' | 'propaganda' | 'blackmail'
type VictoryPath  = 'war' | 'diplomacy' | 'intrigue'
```

**Server routes:** `/api/game`, `/api/faction`, `/api/province`, `/api/combat`, `/api/diplomacy`, `/api/intrigue`

**SQLite tables:** `games`, `factions`, `provinces`, `armies`, `units`, `diplomatic_relations`, `intrigue_actions`, `turn_log`

---

## Key Design Rules

- **Biome variants extend base troop types via inheritance** — the combat resolver must handle them without special cases.
- **All victory condition checks happen server-side at end of turn** — never trust client-side victory claims.
- **Counter bonus is +25% attack damage** when using the favored troop matchup.
- **Shadow Influence at 75%+** triggers the puppet mechanic for intrigue victory.
- **Opinion range is −100 to +100** per faction pair; AI war threshold is < −50, alliance threshold is > +50.

---

## Counter Matrix (reference)

| Unit | Beats | Loses to |
|---|---|---|
| Cavalry | Archers | Polearms |
| Polearms | Cavalry | Heavy Infantry |
| Archers | Light Infantry | Cavalry |
| Heavy Infantry | Polearms | Light Infantry |
| Light Infantry | Heavy Infantry | Archers |
