# Worldwide foundation — milestone 1

## Isolation and rollback

- Production repository: `Weplay40k/Routine721`, branch `main`.
- PRIME snapshot: `1ba9ac6020fa45298ab3f8984cfc03cf6b57ec17`.
- Development branch: `worldwide-foundation-20260813`, created directly from that snapshot.
- Local working copy: this branch only. No production branch, deployment, or production database schema was changed.

## Audit

The durable engine is `profiles` → `players` → `games`/`matches` → synchronized player statistics. The `player_factions`, `players.primary_faction`, and `games.player_faction`/`opponent_faction` fields store display labels. The frontend had those labels and decorative marks hard-coded in `app-v2.js`, `record-battle-safe.js`, and `faction-live.js`.

All seven public tables have RLS enabled. The production schema is intentionally unchanged in this milestone. Existing Supabase security-advisor warnings (privileged RPC execution and leaked-password protection) are deferred to a dedicated security milestone.

## Change

`tabletop-content.js` is the content boundary. It exposes neutral terms—`game system`, `collection`, and `roster entry`—and the compatibility API `legacyFactionNames()`, `legacyLabels()`, `markFor(label)`, and `labelFor(label)`. It contains text labels and Unicode symbols only: no copied artwork, logos, or branding.

Existing persisted labels remain untouched. The player, match, battle-report, leaderboard, and W/L/D paths keep their PRIME behavior.

## Deferred

- A `game_systems` / `collections` database migration and data migration.
- Replacing stored legacy labels, UI branding, PWA/mobile, localization, and subscriptions.
- Production deployment or merge.
- Supabase branch creation, pending confirmation of its $0.01344/hour cost.

## Rollback

Discard `worldwide-foundation-20260813`; `main` remains at the PRIME snapshot above. The development branch can be recreated from that exact commit.
