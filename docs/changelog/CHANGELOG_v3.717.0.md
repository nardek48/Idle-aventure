# v3.717.0 — Les paliers deviennent des scènes (06/11/2026)

Décision de Seb (06/11, option A) : les points 3 (paliers obligatoires) et 8 (émotions à Aeswyn) du compte rendu de conception du 05/11 sont fusionnés. Fichier protégé `story-quests.js` modifié avec son accord.

## Changé
- **Les 9 étapes « palier »** (desert_13, ruines_09, ruines_13, crypte_09, crypte_13, montagne_09, montagne_13, tour_10, tour_13) ne demandent plus de rareté, de Forge ni de reforge : elles se valident dès l'acceptation et deviennent des scènes (textes validés par Seb).
  - Exception : **desert_13** demande de reforger l'arme une fois (apprentissage de la reforge ; Forge 1 à construire).
  - Fenêtres renommées « Conseil de la Forge », reformulées en conseil, avec un point final sur le pronostic.
- **Pronostic « Avant de partir »** : à « Très difficile » et « Hors de portée », le conseil cite le repère de la zone (rareté conseillée, reforge de l'arme et Forge), tiré des constantes `STORY_PALIER_*` (`CombatForecast.zoneRepere`).
- **Grand Ouvrage** : le versement automatique ne garde plus de matières pour la Forge de l'Histoire (`storyForgeKeep` rend 0).
- **Robot de campagne** : il ne suit plus les paliers ; à desert_13, il construit la Forge 1 et reforge l'arme une fois.

## Mesure (campagne 4 parties par classe, `--combats --joueur`)
| | v3.716 | v3.717 |
|---|---|---|
| Chevalier | 57,6 h · 6 morts | 35,8 h · 21 morts |
| Rôdeur | 45,7 h · 6 morts | 34,5 h · 42 morts |
| Mage | 47,2 h · 20 morts | 34,1 h · 40 morts |

Les 12 parties vont au bout, sans blocage. Les morts se concentrent sur les fins de monde (tour_18 : 17, montagne_18/19/15 : 20) : le robot y arrive moins équipé. Le pronostic l'annonce au joueur.

## À signaler
- Icône `images/Icons/system/forecast.webp` absente (déjà manquante avant) : icône générique au dernier point des 9 fenêtres.

## Contrôles
- `round-harness` : 6 646 contrôles, 0 échec (2 passes), dont 13 nouveaux (section 479).
- boot, création du héros, i18n (0 manquant, 0 orphelin), parcours 232 OK.
