# v3.732.0 — Soin des boss sur les PV max (07/11/2026)

Demande de Seb (07/11) : « le soin des boss fait sur les PV max et non les PV restants ». Profil S1 du banc `tools/sim/bouclier-soin-bench.js`. Accord explicite de Seb pour `combat-engine.js`.

## Changé
- **Soin des boss** : 10 % des PV max, plafonné aux PV manquants (avant : 15 % des PV actuels). Même fréquence (5 rounds), suspension pendant les renforts de phase inchangée, Sépulcre inchangé. `BOSS_HEAL_PERCENT` 0,15 → 0,10, `resolveBossHeal`, `estimateCounterValue("healIncoming")`.
- Simulateur de round (`js/sim/combat-round-sim.js`) aligné ; le seuil « il se soigne plus vite que tu ne frappes » du pronostic suit la constante.
- Texte de l'état « Soin » : « Il récupère 10 % de ses PV max : une partie de ton travail est effacée. »

## Mesures (banc, 200 parties)
Jeu = profil S1 du banc (0 écart sur 180 parties tick par tick). Liche 98 / 100 / 93 %, Dragon 89 / 98 / 98 %, Silhouette 33 / 2 / 98 % (Chevalier / Rôdeur / Mage). La Silhouette reste un mur au premier essai pour le Rôdeur et le Chevalier (déjà le cas avant) : à l'étude.

## Contrôles
round-harness 6 999 OK, 0 échec (2 passes), dont la section [493] (17 contrôles) ; boot ; création du héros ; i18n 0 manquant, 0 orphelin ; parcours 235 OK (deux passes ; un échec intermittent sur une passe précédente, déjà vu sur P7).
