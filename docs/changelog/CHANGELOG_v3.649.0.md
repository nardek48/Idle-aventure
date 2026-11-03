# v3.649.0 — Journal : lignes, filtres, étapes d'Histoire en un bloc

Accord de Seb du 03/11, après l'atelier `atelier/journal.html` (option C), « je verrai si c'est ok en jeu ».

## Ce qui change
- Les événements tiennent dans **une seule carte**, une ligne par événement séparée d'un filet (avant : un petit cadre chacun).
- **Filtres** en pastilles, avec leur nombre : Tout · Histoire · Gains · Village · Combat (choix gardé pendant la session). La catégorie est lue à l'icône de tête de chaque ligne et aux phrases du jeu.
- **Une étape d'Histoire en un bloc** : son titre, son récit en italique, puis ses gains en pastilles (Aether, XP, récompense, niveau). Avant : 4 à 6 lignes éparpillées.
- **Livraisons d'un même moment réunies** : « Entrepôt : Pain +500 · Eau +500 · … » ; une même phrase dont seul le lieu change (« L'intendant livre de quoi bâtir (Mine, Scierie, Champs, Chasse) … chacun »).
- Les phrases sont reconnues à partir des textes du jeu traduits comme lui : en anglais aussi. Une ligne inconnue reste telle quelle.
- Toujours les 50 derniers événements ; le Bilan de la partie en tête ne change pas.
- Mesure (iPhone 390, fin de la Crypte) : 3,6 → 2,3 écrans.
- Une ligne dans « Quoi de neuf ».

## Fichiers
`js/ui/log-view.js` (`buildLogItems`, `setLogFilter`), `css/04-panel-log.css`, `js/ui/news-view.js`, `js/lang/en.js`.

## Contrôles
`round-harness` 0 échec (deux passes), nouveau bloc [436] (regroupements et filtre) ; `boot-harness`, `hero-creation-harness` ; audit i18n 100 %. Chromium : Journal réel, filtres Tout et Combat, aucune erreur.
