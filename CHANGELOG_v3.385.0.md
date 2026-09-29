# Aethervale v3.385.0 — Petites Aventures v2, lot PA2-4 (partie 1) : quatre accroches, moteur prêt pour la carte longue

Base : v3.384.0. Décisions de Seb du 29/09/2026 : **E1 A, E2 A, E3 A.**

**La deuxième carte de la Forêt (E1) attend son image.** Le moteur sait déjà lire une carte longue. Le tracé de `foret_2` se posera dès réception de l'illustration, en partie 2.

**Aucun fichier nouveau. Aucun fichier protégé touché.**

## 1. E2 — Trois nouvelles accroches

Elles sont tirées de la bible narrative (partie IV §4.5, bible B §5) et écrites dans la voix du narrateur : phrases courtes, pas de mots bannis, aucune intention prêtée à la braise. La Forêt en compte désormais quatre.

| Accroche | Titre et ouverture (écran de préparation) | Choix | Suite plus loin dans le run |
| --- | --- | --- | --- |
| **Maddoc** | « De l'autre côté du gouffre » | Lui donner la gourde (−1 gorgée) · L'aider à marcher (−20 Souffle) · Passer | **Aidé** : au premier combat de l'acte II ou III, « Une pierre siffle depuis les fourrés… », avec un ennemi de moins. **Passé** : à la destination, « Quelqu'un est passé avant toi… », avec −30 % d'or de destination. |
| **La pierre qui luit** | « Brannoc a envoyé deux hommes… » | Poser la main sur le trait (+40 Souffle) · Faire le tour (−10 Souffle) | **Main posée** : au nœud suivant, « Il y a un trait sur ta paume. Il ne part pas à l'eau. » Ensuite, +1 cran à tous les jets et +20 % de dégâts en combat jusqu'à la fin. |
| **Un feu sans fumée** | « Orwen a vu une lueur au fond du bois… » | La nourrir d'une ration (−1 ration) · Passer | **Nourri** : à la destination, « Ce que tu trouves ici pèse plus lourd… », avec +1 Sève et +25 % d'or de destination. **Passé** : au camp, « une braise que tu n'as pas allumée », qui donne la trouvaille Braise tenace. |

- Chaque accroche a sa ligne à la Clairière, selon la branche choisie.
- **Les échos** (la suite d'un choix, sans rappel de la cause) s'affichent en tête de la feuille du nœud concerné, dans un bandeau or en italique.
- Une branche qu'on ne peut pas payer est grisée, avec sa raison : plus de gourde, plus de ration, pas assez de Souffle.
- **Le moteur lit les accroches dans les données** (`pa2-content.js`) :
  - `cost` : un objet de besace, une ration ou du Souffle ; `gainBreath` : le Souffle gagné ;
  - les suites : `assist`, `destGold`, `destRare`, `mark` et `campGift` (celle-ci porte ses conditions).
  - Une prochaine accroche s'écrit sans toucher au code, tant qu'elle réutilise ces effets.
- Le chasseur garde son fonctionnement. Un run commencé avant cette version se termine normalement.

## 2. E3 — Le tirage

Jamais la même accroche deux fois de suite. La dernière accroche tirée est retenue dans le coffre d'expédition, déjà sauvegardé en entier.

## 3. E1 — Le moteur prêt pour la carte longue

- Un tracé peut déclarer ses rangées : `rows: { camp, seuil, dest }`. Les actes, la visibilité, les destinations et l'endroit de la rencontre (entre le départ et le camp) en découlent.
- Sans `rows`, la carte courte `foret_1` garde 3 / 7 / 9, sans aucun changement.
- La carte longue (1024 × 2048, 4 rangées par acte, environ 16 nœuds joués) n'aura besoin que de son tracé et de son image.

## 4. Anglais

- Les 37 nouveaux textes sont traduits : accroches, échos, coûts. Couverture : 3784 textes, 100 %, 0 orphelin.
- Le registre `data-fields.js` déclare aussi les échos (`PA2_HOOKS : *.echo.*`).

## 5. Équilibrage

Remesuré au banc. Le robot choisit la première branche disponible.

| Anneau | KO | Rations | Or par minute | Sève |
| --- | --- | --- | --- | --- |
| Sentier | 4 % | 0,78 | 41,7 | 2,34 |
| Périple | 17 % | 1,47 | 73,6 | 3,17 |

On reste sur les cibles de PA2-3.

## 6. Contrôles

- **round-harness.js : 3768 OK, 0 échec, sur 3 passages** ([85] neutralisée).
  - **[162]** (nouvelle, 21 contrôles) :
    - les quatre accroches existent ;
    - 80 départs, sans jamais deux fois la même accroche ;
    - Maddoc : coût de la gourde, pas d'aide à l'acte I, puis aide unique à l'acte II (un ennemi de moins, écho), branche fermée sans gourde, −30 % à la destination avec son écho ;
    - la pierre : +40 Souffle, +1 cran, +20 % de dégâts, écho au nœud suivant ;
    - le feu : coût d'une ration, +1 Sève et +25 %, Braise tenace au camp ;
    - les écrans de la rencontre et de l'écho ;
    - les actes selon les rangées du tracé.
  - [158] et [159] visent explicitement le chasseur. Les 300 runs au hasard choisissent une branche disponible, quelle que soit l'accroche.
- **campagne-harness : 38/38. parcours-harness P1 à P12 : 131 OK, 0 échec.**
- **boot-harness : 4 OK. hero-creation-harness : 44 OK.**
- **Captures Chromium** de la rencontre de Maddoc, de sa suite, puis de l'écho au combat de l'acte II (la meute réduite à un ennemi).

## Fichiers

- `js/systems/pa2-run.js`, `js/data/pa2-content.js`, `js/ui/pa2-view.js`, `css/04-panel-pa2.css`, `js/lang/en.js`, `js/lang/data-fields.js` ;
- `sw.js` (CACHE_VERSION 3.385.0), `js/core/constants.js` (GAME_VERSION 3.385.0) ;
- `round-harness.js`, `sim/pa2-bench.js`, `sim/campagne-harness.js`.
