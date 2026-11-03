# v3.595.0 — Le camp habité ; les donjons depuis la carte

Retours de Seb du 31/10 sur la v3.594.0, et C1 et C2 du chantier « un camp qui évolue » (ton validé sur la Forêt et le Désert).

## Le camp habité (onglet « Le feu »)
- **Ce soir au camp** (C1) : une phrase du narrateur, tirée à chaque retour au Camp parmi celles du lieu et celles des compagnons restés au camp. Elle ne change pas tant qu'on reste sur le Camp.
- **Au coin du feu** (C2) : les compagnons restés au camp, en portraits autour du feu, comme dans l'atelier. Toucher l'un d'eux affiche ce qu'il dit ; le toucher encore le referme. Ceux qui partent au combat n'y sont pas.
- Textes : six mondes (le lieu et chaque compagnon arrivé à ce monde : Wenna, Maddoc, Edda, Ysolt, Sarkel), plus une phrase de repli par compagnon. 88 phrases, traduites en anglais.

## La carte
- Le bandeau du Camp n'ouvre plus la carte (retour Seb) : la Carte est dans la barre du bas et dans « Tu es ici ».
- Les Expéditions n'ont plus d'entrée « Carte » en pied.
- **Donjons** : un donjon ouvert se fait depuis la carte du monde sans voyager jusqu'à son monde (badge de la carte et fiche du monde sur PC). Le moteur le permettait déjà (il ne regarde que le monde le plus loin atteint) ; seul l'écran le bloquait. Aucun fichier protégé touché.

## Fichiers
- **Fichier ajouté** : `js/data/camp-soir.js` (les phrases), dans `index.html` et le précache de `sw.js`.
- `js/ui/camp-view.js` : `campFeuStoryHTML`, `campSoirPick`, `campSoirTap`.
- `js/ui/map-view.js` : entrée des donjons de tous les mondes atteints.
- `js/ui/expeditions-view.js` : entrée « Carte » retirée.
- `js/ui/screen-banner.js`, `css/00-kbtn.css` : lien du bandeau retiré.
- `css/04-panel-camp.css` : la phrase et le coin du feu.
- `js/lang/en.js` : 91 textes anglais, deux anciens retirés.
- Aucun fichier protégé, aucun nouvel état sauvegardé.

## Contrôles
`round-harness` 5 615 OK, 0 échec (deux passes ; nouvelle section [393], [392] mis à jour) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` 142 OK ; audit i18n 100 %, 0 orphelin ; `missing-icons` : 1 image attendue (l'entrée de donjon, déjà connue). Écrans vérifiés sous Chromium à 390 × 844 et 1440 × 900.
