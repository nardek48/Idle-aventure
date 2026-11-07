# v3.741.0 — Journal de test : où part l'or (07/11/2026)

Piste 0 de l'étude or et Forge (`systemes/economie/Aethervale_Etude_Or_Forge_v0_1.md`), validée par Seb (07/11). Seb a précisé que les 74 k d'or dépensés à ruines_19 sont partis dans les niveaux et les sorts des compagnons.

## Ajouté (journal de test, `js/main/journal-test.js`)
- `entrainement` (id, nombre, or dépensé), `rang_technique` (id, or), `compagnon_niveau` (id, type, or), `compagnon_sort` (id, or) : une ligne à chaque achat qui coûte de l'or (enveloppes sur `buyUpgrade`, `SkillRanks.buy`, `CompanionManager.buyUpgrade`, `CompanionManager.buySkillRank`).

## À surveiller
- Deux contrôles de la section [496] (jeux du Grimoire : changer de jeu, Grimoire figé en sortie) ont échoué sur deux passes puis réussi sur quatre, sans changement du code concerné : échec intermittent à comprendre.

## Contrôles
round-harness 7 139 OK, 0 échec (2 passes) ; boot ; création du héros ; i18n 0 manquant, 0 orphelin ; parcours 235 OK.
