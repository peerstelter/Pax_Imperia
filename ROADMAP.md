# Pax Imperia — Claude Code Roadmap

## Stack

React + Vite, Tailwind CSS, vite-plugin-pwa/Workbox, Node.js/Express, SQLite, Nginx via docker-compose.

---

## Game Overview

A strategy game in which the objective is to expand your empire through three paths:

- **War** — conquer other realms through military force
- **Diplomacy** — unite realms peacefully through treaties and alliances
- **Intrigue** — manipulate kingdoms through espionage and covert operations

---

## Phase 1 — Foundation, Map & Infrastructure (Tasks 1–14)

- [x] **Task 1** — Monorepo structure: `/client` (React+Vite), `/server` (Express), `/shared` (types/constants), `docker-compose.yml`
- [x] **Task 2** — Vite PWA setup with Workbox, Tailwind, ESLint/Prettier
- [x] **Task 3** — SQLite schema: tables for `games`, `factions`, `provinces`, `armies`, `units`, `diplomatic_relations`, `intrigue_actions`, `turn_log`
- [x] **Task 4** — Express REST API skeleton: `/api/game`, `/api/faction`, `/api/province`, `/api/combat`, `/api/diplomacy`, `/api/intrigue`
- [x] **Task 5** — Map system: hexagonal or rectangular province grid, biome types (Steppe, Desert, Isles, Tundra, Default)
- [x] **Task 6** — Province renderer: React component, SVG or Canvas, color-coded by owner/biome
- [x] **Task 7** — Province data seeder: ~40 provinces, random biomes, starting factions (6 AI + 1 player)
- [x] **Task 8** — Map interaction: click province → info panel with owner, garrison, biome, strategic value
- [x] **Task 9** — Faction system: data model for name, color, government type, resources (gold, food, manpower)
- [x] **Task 10** — Turn engine: turn start, resource ticks, event queue, end-of-turn handler
- [x] **Task 11** — Fog of War: provinces outside own range hidden, revealed by troops/spies
- [x] **Task 12** — Minimap component for overview
- [x] **Task 13** — Save/load system: game state in SQLite, JSON export
- [x] **Task 14** — Docker setup: `docker-compose.yml` with client build, API container, Nginx proxy

---

## Phase 2 — War System (Tasks 15–30)

### Troop Counter Matrix

| Unit | Beats | Loses to |
|---|---|---|
| Cavalry | Archers | Polearms |
| Polearms | Cavalry | Heavy Infantry |
| Archers | Light Infantry | Cavalry |
| Heavy Infantry | Polearms | Light Infantry |
| Light Infantry | Heavy Infantry | Archers |

### Biome Variants

| Biome | Special Unit |
|---|---|
| Steppe | Horse Archers (Cavalry variant) |
| Eastern Desert | Sabre Light Infantry |
| Isles | Lochaber Poleaxe fighters |
| Tundra | Reindeer Cavalry |

### Siege Weapons

- **Ram** — breaks gates
- **Catapult** — damages walls
- **Siege Tower** — enables assault
- **Ladders** — melee troops can scale walls

### Tasks

- [x] **Task 15** — Troop types module: 5 types with full counter matrix, base stats (attack, defense, speed, morale)
- [x] **Task 16** — Biome unit variants as sub-classes with inherited stats and unique abilities
- [x] **Task 17** — Army builder: organize units into rows/formations (front line, second row, flanks)
- [x] **Task 18** — Siege weapons: Ram, Catapult, Siege Tower, Ladders — each with distinct mechanics
- [x] **Task 19** — Combat resolver: turn-based, counter bonus (+25% attack), formation modifiers, random factor ±10%
- [x] **Task 20** — Siege engine: wall strength mechanic, breach opening, defender sortie option
- [x] **Task 21** — Field battle mechanic: open terrain, terrain bonuses (forest, hills), ambush option
- [x] **Task 22** — War declaration & casus belli system (claim, revenge, expansion)
- [x] **Task 23** — Peace negotiations: annexation, tribute, vassalization, white peace
- [x] **Task 24** — Military alliance system: joint war entry logic, call-to-arms mechanic
- [x] **Task 25** — Recruitment: costs in gold + manpower, training time, province-specific units
- [x] **Task 26** — Logistics: supply lines, attrition on long campaigns, winter penalty in Tundra
- [x] **Task 27** — Battle report UI: round log, casualties, counter highlights, victory condition
- [x] **Task 28** — War goal tracker: progress display for "control X provinces"
- [x] **Task 29** — Military commanders: general units with stats (attack, defense, maneuver), mortality
- [x] **Task 30** — War exhaustion mechanic: lowers morale and recruitment rate after prolonged wars

---

## Phase 3 — Diplomacy (Tasks 31–43)

### Influence System

Opinion ranges from −100 to +100 per faction pair.

**Gain opinion by:** gifts, trade, helping in wars, diplomatic missions  
**Lose opinion by:** breaking treaties, aggressive expansion, supporting rivals

### Diplomatic Victory

Enough kingdoms vote to restore the empire under your rule (voting mechanic).

### Tasks

- [x] **Task 31** — Opinion system: numeric value −100 to +100 per faction pair, decay over time
- [x] **Task 32** — Diplomacy menu: overview of all factions with opinion, alliances, active treaties
- [x] **Task 33** — Alliances: defensive vs. offensive alliance, automatic war entry, dissolution with opinion penalty
- [x] **Task 34** — Marriage treaties: dynastic union, strong opinion boost, unlocks inheritance claims
- [x] **Task 35** — Trade agreements: passive gold income, opinion bonus, cancellable
- [x] **Task 36** — Vassalization: smaller factions voluntarily join, pay tribute, provide troops
- [x] **Task 37** — Non-aggression pacts: time-limited peace guarantee, opinion gain for compliance
- [x] **Task 38** — Diplomatic missions: active action, +opinion for gold, success probability based on relation
- [x] **Task 39** — Gift system: gold → opinion boost, diminishing returns
- [x] **Task 40** — Opinion events: treaty breaking, aggressive expansion (malus on all neighbors), war aid (bonus)
- [x] **Task 41** — Diplomatic victory: voting mechanic — X factions elect player as emperor
- [x] **Task 42** — Mediation offers: player can resolve AI conflicts → opinion from both parties
- [x] **Task 43** — Faction personalities: aggressive / expansionist / isolationist / trade-focused — influences AI decisions

---

## Phase 4 — Intrigue (Tasks 44–57)

### Intrigue Actions

- **Spies** — gather intelligence
- **Assassination** — remove enemy rulers or generals
- **Sabotage** — destroy armies, supplies, or fortifications
- **Bribery** — turn enemy generals or governors
- **Propaganda** — cause rebellions or unrest
- **Blackmail** — force leaders into agreements

### Shadow Network

Build covert influence inside other kingdoms:
- Bribe nobles
- Support pretenders to the throne
- Stage coups

### Intrigue Victory

You secretly control most kingdoms through puppets (75%+ shadow influence triggers puppet mechanic).

### Tasks

- [x] **Task 44** — Spy network: agent slots per province, discovery probability, network building costs time
- [x] **Task 45** — Intelligence actions framework: action → success probability → consequence (success/discovery/failure)
- [x] **Task 46** — Espionage: reveal enemy troop strength, resources, active intrigue operations
- [x] **Task 47** — Assassination: target enemy rulers or generals, high discovery risk, opinion penalty if traced
- [x] **Task 48** — Sabotage: weaken troops, destroy supply depots, damage fortress walls
- [x] **Task 49** — Bribery: turn enemy generals or governors to own side
- [x] **Task 50** — Propaganda: trigger rebellion in province, province enters "unrest" status temporarily
- [x] **Task 51** — Blackmail: force treaty or tribute, causes lasting opinion penalty
- [x] **Task 52** — Shadow influence bar: covert influence meter in enemy factions, grows through multiple intrigue actions
- [x] **Task 53** — Puppeteer mechanic: at 75%+ shadow influence → faction follows player directives in diplomacy
- [x] **Task 54** — Pretender support: trigger civil war in enemy kingdom, back own candidate
- [x] **Task 55** — Intrigue victory condition: player controls X factions covertly through puppets
- [x] **Task 56** — Counter-intelligence: own agents for defense, expose enemy networks, double agent option
- [x] **Task 57** — Intrigue log: chronicle of all revealed and suspected actions, with evidence chain system

---

## Phase 5 — AI, UI Polish & Victory (Tasks 58–72)

- [x] **Task 58** — AI decision loop: each turn every faction evaluates war/diplomacy/intrigue based on strength + personality
- [ ] **Task 59** — AI war strategy: attack when militarily superior, seek alliances when weaker
- [ ] **Task 60** — AI diplomacy strategy: opinion-based treaty offers, marriage politics, alliance-seeking against strongest player
- [ ] **Task 61** — AI intrigue strategy: weak factions sabotage strong ones via propaganda/bribery
- [ ] **Task 62** — Event system: random events (plague, famine, succession crisis) with decision options and consequences
- [ ] **Task 63** — Victory condition checker: war victory (X% provinces), diplomatic victory (emperor vote), intrigue victory (X puppets)
- [ ] **Task 64** — Main menu & game creation: difficulty, starting faction selection, map preview
- [ ] **Task 65** — In-game HUD: resource bar, turn info, notifications, action menu
- [ ] **Task 66** — Province detail panel: owner, biome, garrison, economy, diplomatic status, intrigue activity
- [ ] **Task 67** — Army management UI: formation editor with drag-and-drop, troop strengths, commander assignment
- [ ] **Task 68** — Diplomacy UI: negotiation dialog with offer/demand slots, opinion preview
- [ ] **Task 69** — Intrigue UI: agent map, action selection, risk assessment, network strength visualization
- [ ] **Task 70** — Tutorial system: guided first game with tooltips for all three paths
- [ ] **Task 71** — Responsive mobile layout: touch controls for map, bottom-sheet panels
- [ ] **Task 72** — End-to-end test run + balancing pass: counter bonuses, opinion values, AI aggressiveness, turn time

---

## Phase Summary

| Phase | Focus | Tasks | Status |
|---|---|---|---|
| 1 | Foundation, map, infrastructure | 1–14 | ✅ Complete |
| 2 | War system complete | 15–30 | ✅ Complete |
| 3 | Diplomacy complete | 31–43 | ✅ Complete |
| 4 | Intrigue complete | 44–57 | ✅ Complete |
| 5 | AI, UI, victory, polish | 58–72 | 🔄 In progress (1/15 done) |

**Total: 72 tasks across 5 phases**

---

## Notes for Claude Code

- Start each session by stating the current phase and the last completed task number.
- Define all `shared/` type definitions fully in Phase 1 — `Troop`, `Province`, `Faction`, `DiplomaticRelation`, `IntrigueAction`. These are the contract between client and server for all later phases.
- Keep the counter matrix as a constant in `shared/combat.ts` — both client (for UI hints) and server (for resolution) import from there.
- Biome variants extend base troop types — use inheritance so the combat resolver handles them without special cases.
- All win conditions are checked server-side at end of turn — never trust client-side victory claims.
