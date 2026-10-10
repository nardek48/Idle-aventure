# Aethervale v3.439.0 — Les ennemis normaux jouent leur coup spécial

Retour de Seb : les combats sont « un peu plats et courts ». Constat au banc : un combat normal dure 2 à 3 rounds, mais l'ennemi n'annonçait son coup spécial (charge, silence, bouclier) qu'au bout de 3 à 5 rounds. Il mourait presque toujours avant de le jouer.

## Ce qui change
- **Hors Forêt** (Désert, Ruines), le **premier** coup spécial d'un ennemi normal s'annonce dès le round 1 ou 2 (`combat-engine.js`, `NORMAL_FIRST_PATTERN_*`). Les coups suivants gardent 3 à 5 rounds.
- La Forêt, les boss et les élites ne changent pas (décision Seb : la Forêt reste un monde d'apprentissage, le reste suit quand les rations sont simples à produire).

## Mesure (campagne, vrais combats, 1 partie par classe, avant → après)
| Combats normaux | Avec un coup spécial | Rounds | PV perdus |
|---|---|---|---|
| Forêt | 2 → 3 % | 1,9 → 1,9 | 1,9 → 2,1 % |
| Désert | 22 → **72 %** | 3,1 → 3,1 | 1,7 → 1,4 % |
| Ruines | 34 → **59 %** | 3,5 → 2,6 | 3,6 → 1,6 % |

Durée de campagne, temps au camp et morts stables. Le coup spécial remplace la frappe du round : il ajoute un moment à lire et à contrer, pas de dégâts.

## Outils
- Robot de campagne : il mange ses rations au camp et cuisine avec son stock (`--attendre-camp` pour l'ancien comportement). Soin au camp 9,4 → 5,4 h par partie, durée de campagne 36 → 35 h : le temps gagné est repris par le plafond du jour de la carte.
- Robot de campagne : chaque combat relève le nombre de coups spéciaux annoncés (`pat`).
- Note de travail `docs/pistes-combat.md` (constat, pistes visuelles A/B/C, mesures).

## Contrôles
- `round-harness` : 4 122 OK, 0 échec (3 passes, après la v3.438.2) ; contrôle [213] ajouté.
- `boot-harness` 4 OK, `hero-creation-harness` 44 OK.
- Aucun fichier ajouté au jeu. Fichier protégé modifié avec l'accord de Seb : `js/systems/combat-engine.js`.
