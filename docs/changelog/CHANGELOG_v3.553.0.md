# v3.553.0 — Grand écran, option A : l'habillage de la maquette

Accord de Seb du 29/10 (« ok pour A »), après la comparaison maquette / jeu. Format large seulement (PC, tablette en paysage) : **le téléphone ne change pas** (même police, même bandeau).

## Ce qui change sur grand écran
- **Polices de la maquette** : Cinzel pour les titres (titre des pages, sections, feuilles, nom du héros, bandeau, Chronique, nom de l'ennemi en combat) ; Alegreya italique pour le récit des étapes d'Histoire. Elles sont servies par le jeu (dossier `fonts/`, licence libre OFL) : rien ne passe par Google, la PWA marche hors ligne.
- **Coque d'un seul tenant** : fond de pierre moussue sombre ; le menu de gauche et la Chronique sont collés aux bords, sur toute la hauteur, séparés par un filet d'or. Le décor du monde ne passe plus entre les colonnes.
- **Bandeau** :
  - le nom et la classe du héros à côté du portrait ;
  - au centre, le titre de l'écran ouvert : « Campement d'Aeswyn », le chapitre en cours (Quêtes), « Le village » et ses bâtiments de production, le héros, son niveau et sa Mémoire, « Carte du monde » et les mondes ouverts ; ailleurs, le monde et l'étape d'Histoire comme avant ;
  - un bouton **Entrepôt ›** au bout des ressources (Village › Entrepôt).

## Ce qui ne change pas encore
Le contenu des pages reste celui du téléphone, élargi (option B : Quêtes, Carte, Village, Camp, Héros, un écran par version) ; l'arène pleine largeur avec équipe en ligne relève de l'option C.

## Code
- **Fichiers ajoutés** : `fonts/cinzel-latin-700-normal.woff2`, `fonts/alegreya-latin-400-normal.woff2`, `fonts/alegreya-latin-400-italic.woff2` (61 Ko en tout, précachés dans `sw.js`), avec leurs licences `fonts/OFL-Cinzel.txt` et `fonts/OFL-Alegreya.txt`.
- `css/10-grand-ecran.css` : section « option A ».
- `js/ui/hud-view.js` : nom et classe, titre selon l'écran (`hudWhere`), bouton Entrepôt (`hudOpenWarehouse`), bandeau mis à jour dès qu'on change d'écran.
- `js/lang/en.js` : textes anglais. Aucun fichier JS ou CSS ajouté, aucun fichier protégé.

## Contrôles
`round-harness` 5 458 OK, 0 échec (deux passes, section [369] ajoutée) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK. Comparaison au pixel avec la maquette à 1440 × 900 (Camp, Quêtes, Héros).
