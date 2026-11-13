# v3.780.0 — Simplification : les caravanes sont retirées (13/11/2026)

Décision de Seb (12/11, option A), lot 6 et dernier de la simplification avant l'Alpha. Les caravanes pesaient 0,2 % de l'or d'une partie. **Accord de Seb pour `js/data/story-quests.js`** (ruines_04, crypte_04, deux tutoriels). Aucun autre fichier protégé modifié, aucun changement de sauvegarde.

## Ce qui change
- **Étapes du marché** (`story-quests.js`, accord) :
  - ruines_04 « On n'y vend rien. Pas encore. » demande de livrer 150 Blé et 100 Pierre ;
  - crypte_04 « Les morts n'achètent pas » demande de livrer 200 Blé ;
  - la livraison se fait depuis la carte d'étape (bouton « Livrer au Marché »), avec l'offrande générique déjà en place (`offeringUi.where = "story"`, compteur `marketDelivered`) ;
  - mêmes ids, mêmes récompenses (or, Pierres errantes, Cires de sépulcre), dialogues et tutoriels réécrits ;
  - une sauvegarde dont la caravane avait déjà fait l'étape reste validée (ancien drapeau lu).
- **Tutoriels** de la Montagne et de la Tour : le point sur le marché et la caravane est retiré.
- **`systems/caravan-system.js`** ne garde que `CaravanManager.settleRetired()`, appelé au démarrage (`main/boot.js`) : une caravane encore en route dans une vieille sauvegarde est livrée tout de suite (or, matériau rare, objet), et l'étape du marché qu'elle servait compte comme faite.
- **Écrans** :
  - plus de ligne ni de feuille « Caravane » dans Campement › Expéditions ;
  - plus de caravane sur les cartes vivantes, ni de rubrique « Caravanes » à l'écran de retour ;
  - la tuile de la Halle n'affiche plus « De retour ».
- **Halle marchande** : elle ne porte plus que l'échoppe (description et effet par niveau réécrits).
- **Taverne** : sa description ne cite plus la caravane.
- **Jalon des Ruines** : « Une caravane rentrée » devient « Cinq contrats livrés à la Taverne ». La fiche « Les caravanes » est retirée.
- **Provenances de l'Entrepôt** corrigées : plus de caravane, plus de « +2 par Marque » (Marques retirées en v3.777.0), plus de Labyrinthe (retiré en v3.775.0).
- **Grand Ouvrage** : le bonus d'or ne cite plus les caravanes.
- **Journal de test** : n'enveloppe plus les caravanes.
- **Fiche « La compétence d'un compagnon »** : elle ne compare plus aux rangs des sorts du héros (automatiques depuis la v3.779.0).
- **Traductions** : 31 textes nouveaux ou corrigés, 59 orphelins retirés.

## Fichiers
- `js/ui/caravan-view.js` **n'est plus chargé** (`index.html`) **ni précaché** (`sw.js`). Le fichier reste sur le disque ; il sera supprimé à la version suivante, une fois ce `sw.js` publié.
- Aucun fichier ajouté.
- `tools/sim/debouches-bench.js` (banc des débouchés, v3.480.0) lit encore les caravanes : il est obsolète.

## Mesure (robot, 3 parties complètes, `--combats --joueur`)
- 0 mort et aucun mur pour le Chevalier, le Rôdeur et le Mage.
- ruines_04 est faite à 5,7 / 6,5 / 6,0 h, crypte_04 à 9,7 / 10,8 / 10,1 h.
- Fin de la Tour à 21,7 / 31,8 / 36,0 h. L'écart vient de l'attente connue à tour_07.
- Le robot ne bâtit la Taverne qu'aux Ruines et livre peu de contrats : le jalon « Cinq contrats » ne tombe chez lui qu'à la Tour. Un joueur qui livre les contrats du tableau l'atteint dans son monde.

## Contrôles
- `round-harness` 7129 OK, 0 échec, sur 2 passes.
  - [191] devient le contrôle du retrait (solde au chargement, fichiers, textes, carte, écran de retour).
  - [203] livre vraiment la marchandise de ruines_04 depuis la carte d'étape.
  - [240] vérifie l'offrande de crypte_04.
  - Les sections propres aux caravanes sont retirées : [192], [250], [301], [363], [368], [405], [406].
- boot 4 OK ; création du héros 46 OK ; parcours complet 237 OK (fiche Caravane retirée de la liste) ; i18n 100 %, 0 orphelin.
- Quoi de neuf : une ligne (FR + EN).
