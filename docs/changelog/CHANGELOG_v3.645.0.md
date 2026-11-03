# v3.645.0 — Les patrouilles de la Tour

Demande de Seb (03/11), après l'audit des ressources v3.637.0 : `PATROL_RATES` n'avait pas d'entrée `tower`, donc aucun étage libéré ne pouvait recevoir de patrouille.

## Données (`data/patrols.js`)
- **Taux** : 330 matières et 26 or par heure (Montagne 260 / 24).
  - Les zones de la Tour produisent 1,26 fois celles de la Montagne : les matières suivent ce rapport.
  - L'or reste sous la cible de la conception (au plus 10 % de l'or de la Taverne).
- **Secteurs** : les 6 étages, avec bois, pierre et fer chacun deux fois en ressource dominante (ce que demande le village de la Tour).
  - L'étage du sable : pierre / eau.
  - La rue qui tient : bois / pierre.
  - Les gisants debout : pierre / fer.
  - La veine du dedans : fer / pierre.
  - Les marches de craie : bois / fer.
  - Le palier sans murs : fer / bois.
- **Rations** : comme la Montagne (viande 15, pain 1).
- **Récits** : 3 courants et 1 rare pour Wenna, Maddoc et Edda, avec leur traduction anglaise. Ils sont à relire par Seb.
  - Sarkel reste au pied de la Tour (« je ne vends rien là-haut ») : ses retours passent par la phrase du narrateur.
  - Les phrases commencent par le nom du secteur, qui porte son article (« Les marches de craie. »).

## Mesure
- `patrouille-bench.js` (Montagne et Tour ajoutées) : or des patrouilles = 9,6 % de la Taverne dans la Tour (Montagne 8,8 %). La colonne matières de ce banc date d'avant la refonte des zones et ne sert plus de repère.
- `debouches-bench.js --monde=5` (4 passages par jour) : 15 176 matières par jour de patrouilles (Montagne 11 960), rien perdu au plafond, or par jour 40 922.

## Contrôles
- `node --check` sur les fichiers modifiés.
- `round-harness.js` : 6 090 OK, 0 échec, sur deux passes.
- `boot-harness.js` : 4 OK.
- `parcours-harness.js` : 212 OK, 0 échec.

## Fichiers
- Fichiers modifiés : `data/patrols.js`, `lang/en.js`, `ui/news-view.js`, `core/constants.js`, `sw.js`.
- Outils modifiés : `tools/sim/patrouille-bench.js`, `tools/sim/debouches-bench.js`.
- Aucun fichier protégé touché, aucun fichier ajouté.
