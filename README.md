# ⚔️ Pax Imperia

> *Expand your empire — through war, diplomacy, or shadow.*

A turn-based browser strategy game in which you rebuild a fractured empire across 40 provinces. Choose your path: crush enemies on the battlefield, unite realms through treaties and marriage, or pull strings from the shadows until kings are your puppets.

---

## 🗺️ Overview

Pax Imperia is a medieval grand strategy game playable entirely in the browser as a Progressive Web App. You lead one faction among five, each with its own personality, starting position, and ambitions. The game ends when one player achieves a **Victory Condition** — and there are three very different ways to get there.

| Victory Path | Condition |
|---|---|
| ⚔️ **War** | Control the majority of all provinces |
| 🤝 **Diplomacy** | Win the Imperial Election — enough kingdoms vote for you |
| 🕵️ **Intrigue** | Control most kingdoms as hidden puppets |

---

## 🎮 Features

### Three Paths to Dominance

**War**
- 5 core troop types with a full counter-matrix (Cavalry, Polearms, Archers, Heavy Infantry, Light Infantry)
- Siege warfare with Rams, Catapults, Siege Towers, and scaling ladders
- Formation system: arrange troops in rows (front line, second rank, flanks)
- Field battles with terrain modifiers, ambush options, and commander abilities
- Supply lines, exhaustion, and war weariness mechanics

**Diplomacy**
- Opinion system (−100 to +100) per faction pair, shaped by every action you take
- Alliances, marriage treaties, trade agreements, non-aggression pacts, vassalage
- Diplomatic missions, gifts, and mediation between rival kingdoms
- Imperial Election mechanic: accumulate enough allies to be crowned emperor

**Intrigue**
- Build a shadow network of agents inside enemy kingdoms
- Actions: Spy, Assassinate, Sabotage, Bribe, Propaganda, Blackmail
- Shadow Influence meter — reach 75% in a kingdom to turn it into a puppet
- Support pretenders, stage coups, trigger civil wars
- Counter-espionage and evidence chain system

### Regional Troop Variants
Different biomes unlock unique unit types that reflect their geography:

| Biome | Special Unit |
|---|---|
| Steppe | Horse Archers |
| Eastern Desert | Sabre Light Infantry |
| Isles | Lochaber Poleaxe fighters |
| Tundra | Reindeer Cavalry |

### World & Map
- ~40 provinces across 5 biomes
- Fog of War — unknown territory stays dark until scouted
- Province detail panel: owner, garrison, economy, diplomatic status, intrigue activity
- Strategic cities as high-value conquest targets

### AI Factions
Each AI faction has a personality that drives its decisions:
- **Aggressive** — attacks when it smells weakness
- **Expansionist** — builds vassal networks and trade routes
- **Isolationist** — defends hard, rarely initiates
- **Merchant** — pursues economic dominance and alliances

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| PWA | vite-plugin-pwa / Workbox |
| Backend | Node.js + Express |
| Database | SQLite |
| Proxy | Nginx |
| Deployment | Docker + docker-compose |

---

## 🚀 Getting Started

### Prerequisites
- Docker + Docker Compose
- Node.js 20+

### Development

```bash
# Clone the repository
git clone https://github.com/peerstelter/pax_imperia.git
cd pax-imperia

# Install dependencies
npm install --workspaces

# Start development servers
npm run dev
```

Client runs on `http://localhost:5173`, API on `http://localhost:3000`.

### Production (Docker)

```bash
docker-compose up --build
```

App available at `http://localhost:80`.

---

## 📁 Project Structure

```
pax-imperia/
├── client/               # React + Vite frontend
│   ├── src/
│   │   ├── components/   # UI components (Map, HUD, Panels)
│   │   ├── engine/       # Game logic (combat, turns, events)
│   │   ├── stores/       # State management
│   │   └── pages/        # Views (Menu, Game, Victory)
├── server/               # Express API
│   ├── routes/           # /api/game, /api/combat, /api/diplomacy, /api/intrigue
│   ├── db/               # SQLite schema + migrations
│   └── engine/           # Server-side game logic
├── shared/               # Shared TypeScript types
│   └── types.ts          # Faction, Province, Army, Unit, DiplomaticRelation
├── docker-compose.yml
└── nginx.conf
```

---

## 🗂️ Shared Types

The `shared/types.ts` file is the contract between client and server. Define these in Phase 1 before building any system.

```ts
type Biome        = 'default' | 'steppe' | 'desert' | 'isles' | 'tundra'
type TroopType    = 'cavalry' | 'polearms' | 'archers' | 'heavy_infantry' | 'light_infantry'
type Diplomacy    = 'alliance' | 'marriage' | 'trade' | 'vassalage' | 'non_aggression'
type Intrigue     = 'spy' | 'assassinate' | 'sabotage' | 'bribe' | 'propaganda' | 'blackmail'
type VictoryPath  = 'war' | 'diplomacy' | 'intrigue'

interface Faction            { id: string; name: string; color: string; gold: number; manpower: number; personality: string }
interface Province           { id: string; name: string; ownerId: string; biome: Biome; garrison: number; fortLevel: number }
interface Army               { id: string; factionId: string; provinceId: string; units: Unit[]; commanderId?: string }
interface Unit               { type: TroopType; variant?: string; count: number; morale: number }
interface DiplomaticRelation { factionA: string; factionB: string; opinion: number; treaties: Diplomacy[] }
```

---

## ⚔️ Combat System

### Counter Matrix

```
Cavalry        ──beats──▶  Archers          ──loses to──▶  Polearms
Polearms       ──beats──▶  Cavalry          ──loses to──▶  Heavy Infantry
Archers        ──beats──▶  Light Infantry   ──loses to──▶  Cavalry
Heavy Infantry ──beats──▶  Polearms         ──loses to──▶  Light Infantry
Light Infantry ──beats──▶  Heavy Infantry   ──loses to──▶  Archers
```

Counter bonus: **+25% attack damage** when using the favored matchup.

### Siege Weapons

| Weapon | Effect |
|---|---|
| Ram | Breaks gates, bypasses fort level |
| Catapult | Reduces wall strength over time |
| Siege Tower | Enables direct assault on walls |
| Ladders | Any melee infantry can attempt to scale |

---

## 🤝 Diplomacy System

Opinion starts at 0 and changes based on actions. AI factions make decisions based on opinion thresholds:

- **< −50** → likely to declare war
- **−50 to +20** → neutral, trading possible
- **> +50** → alliance candidates
- **> +80** → vassalage or election vote possible

---

## 🕵️ Intrigue System

Every intrigue action follows:

```
Action → Success chance (agent strength × network depth) → Outcome
                                                          ├── Success
                                                          ├── Failure (nothing happens)
                                                          └── Discovered (opinion hit, agent lost)
```

Shadow Influence accumulates per kingdom. At **75%** the kingdom becomes a puppet and follows your diplomatic lead.

---

## 📋 Roadmap

See [`ROADMAP.md`](./ROADMAP.md) for the full 72-task Claude Code build plan across 5 phases.

| Phase | Scope | Tasks |
|---|---|---|
| 1 | Foundation, map, infrastructure | 1–14 |
| 2 | Full war system | 15–30 |
| 3 | Full diplomacy system | 31–43 |
| 4 | Full intrigue system | 44–57 |
| 5 | AI, UI polish, victory | 58–72 |

---

## 📜 License

**Proprietary — Copyright © 2026 Peer Stelter. All rights reserved.**

This software and all associated files are the exclusive intellectual property of Peer Stelter. No use, reproduction, distribution, or modification is permitted without explicit prior written permission from the copyright holder.

See [`LICENSE.md`](./LICENSE.md) for full terms.

---

*Pax Imperia — there is no peace, only the illusion of it.*
