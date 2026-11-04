# v3.656.0 — Le festin

Chantier « blé, viande et eau » (constat de l'audit v3.473.0). **Option D validée par Seb (04/11)** ; atelier `atelier/festin.html`, **placement A** (une carte sous « Ce matin au camp »). Choix de Seb : 3 sorties dans tous les cas, l'eau gardée dans le prix.

## Constat
- **Blé et viande** :
  - ne servaient qu'aux rations, à quelques préparations de l'Apothicaire, aux contrats de Taverne et aux caravanes ;
  - aucun bâtiment, aucune reforge, aucun entraînement n'en demande ;
  - au robot, ils restent vers 80 % du plafond dès la Crypte (1 800 / 2 250) ;
  - à la Tour, les zones en produisent environ 47 000 par jour réel.
- **L'eau** sert déjà (parcelles, Apothicaire, outres) : elle reste rare jusqu'aux Ruines.

## Le festin
- **Où** : au Camp, onglet « Le feu », une carte « Le festin » sous la phrase du jour.
- **Effet** : +10 % de dégâts et +10 % de PV max pour tout le groupe (héros et compagnons), pendant **3 sorties**, même si la nuit tombe entre-temps. L'exploration libre ne compte pas et ne profite pas du festin (même règle que les potions à bonus).
- **Un à la fois.** Le bandeau du Camp porte une pastille « Festin · n » tant qu'il dure.
- **Prix par monde** (25 % / 25 % / 10 % de l'Entrepôt au niveau maximal du monde) :

  | Monde | Blé | Viande | Eau |
  | --- | --- | --- | --- |
  | Forêt | 300 | 300 | 125 |
  | Désert | 500 | 500 | 200 |
  | Ruines | 550 | 550 | 225 |
  | Crypte | 1 000 | 1 000 | 400 |
  | Montagne | 1 500 | 1 500 | 600 |
  | Tour | 2 000 | 2 000 | 800 |

- **Prix affiché avec le stock** entre parenthèses ; une ressource qui manque passe en rouge et le bouton dit ce qui manque.
- **Icône** `images/Icons/camp/festin.webp` à générer (ajoutée à « Images à générer ») : l'icône générique s'affiche en attendant. `campfire.webp` n'est pas reprise (image en double).

## Code (aucun fichier protégé)
- `systems/camp-system.js` : `FeastManager` (prix, préparation, effet vivant en sortie, décompte), `FEAST_COST_BY_WORLD`.
- **État** : `worldDay.feast` (sorties restantes), dans le jour de jeu déjà sauvegardé en entier. Aucun champ ajouté à `save-system.js`.
- **Accroches existantes** :
  - dégâts du héros : `VeinSystem.bladeMult` ;
  - PV du héros : `TalentManager.getStatBonuses` ;
  - compagnons : `TalentManager.companionHpMult` et `companionDamageMult` ;
  - décompte : `WorldDays.onSortieEnd`.
- `ui/camp-view.js` : `campFeastHTML`. `ui/screen-banner.js` : pastille du bandeau. CSS sur les jetons de la palette.
- `lang/en.js` : 14 textes.

## Mesure (robot `--joueur`, reprise à l'entrée de la Montagne jusqu'à la fin de la Tour, `FESTIN=1` = un festin dès que possible, 48 contrôles et 0 échec pour chaque partie)

| | Festins | Montagne + Tour | Morts | Silhouette (PV restants) |
| --- | --- | --- | --- | --- |
| Chevalier | 0 → 5 | 26,2 → 20,5 h | 2 → 4 | 42 → 61 % |
| Rôdeur | 0 → 12 | 26,0 → 20,5 h | 7 → 2 | 11 → 58 % |
| Mage | 0 → 11 | 25,7 → 25,1 h | 3 → 0 | 84 → 92 % |

Le festin aide nettement sans tout écraser. Les écarts d'une partie à l'autre restent grands : à juger en jeu.

## Robot réparé
`campagne-harness.js` lisait les actions du Grimoire dans la liste déroulante, retirée en v3.654.0. Toutes les campagnes s'arrêtaient au premier entretien.
- Il lit maintenant les tuiles : `grimoireActionOptions`, les badges « Contre » et « Effet » valant l'ancien ⚡.
- Campagne complète du Chevalier : 122 OK, 0 échec, 34,4 h.

## Contrôles
- `node --check` sur les fichiers modifiés.
- `round-harness.js` : 6 133 OK, 0 échec, sur deux passes. Section [439] ajoutée, 14 contrôles :
  - prix, stock manquant, préparation, un seul à la fois ;
  - effet dormant au camp, vivant en sortie, absent en exploration libre ;
  - décompte, sauvegarde dans `worldDay`, fin après 3 sorties ;
  - carte sous la phrase du jour, avec le vrai chemin de l'icône.
- `boot-harness.js` : 4 OK. Audit i18n : 0 orphelin.
- `parcours-harness.js` : 212 OK, 0 échec. Un premier passage relevait les pastilles de prix en crème plein comme des « cartes sans texture » (P14) ; elles sont passées en fond translucide, comme les petites pastilles du jeu.
- **Chromium à 390 px, sauvegarde de fin de Montagne** :
  - la carte est sous « Ce matin au camp », rien ne déborde ;
  - en cours, la pastille « Festin · 2 » est sur le bandeau.

## Fichiers
- Fichiers modifiés : `systems/camp-system.js`, `systems/world-day-system.js`, `systems/vein-system.js`, `systems/talent-system.js`, `ui/camp-view.js`, `ui/screen-banner.js`, `css/04-panel-camp.css`, `css/00-kbtn.css`, `ui/news-view.js`, `lang/en.js`, `core/constants.js`, `sw.js`.
- Outils : `campagne-harness.js` (réparation, `FESTIN=1`), `round-harness.js`. Atelier : « Images à générer » (+1), feuille de route (+ « Élites à niveaux », à cadrer).
- Aucun fichier protégé touché, aucun fichier ajouté.
