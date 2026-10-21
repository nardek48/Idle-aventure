# Aethervale v3.457.5 — Textes faux ou périmés

Lot 4 de l'audit du 20/10. Ces corrections sont factuelles : elles mettent les textes d'accord avec ce que le jeu fait. Les quatre réécritures narratives (Codex du Chaos, Codex de la Mémoire, objectif de forest_15, Codex « Ce qui attend au sommet ») sont soumises à Seb à part. Elles ne sont pas dans cette version.

## Ce qui est corrigé (français et anglais)
- **« Récolter » non traduit** (P12) : en anglais, le bouton « Harvest » redevenait « Récolter » au bout d'une seconde. Le texte passe maintenant par la traduction, et le bouton n'est réécrit que si son contenu change.
- **Aides qui contredisaient l'écran** (P13) :
  - **Tutoriel du Campement** (erreurs factuelles seulement, la règle d'onboarding est respectée) :
    - la barre de vie est « en haut » de l'écran, pas en bas ;
    - le badge est « Histoire », pas « Principale » ;
    - il faut « Accepter, puis Partir ».
  - **Tutoriel de la Mémoire** : changer d'avis coûte de l'or, pas de l'Aether.
  - **Fiche de la Halle** : l'échoppe s'installe à la Halle.
  - **Fiche de l'Entrepôt** : les matières brutes ont un plafond, elles aussi.
  - **Fiche de la Palissade** : elle agit sur chaque carte vivante, pas seulement la Forêt.
  - **Grimoire** : l'Exaltation d'une élite fait compter sa nature triple, pas double.
- **Élites rejouables** (P16) : le panneau disait « Sans ration ». Il dit maintenant que chaque combat rejoué prend ses vivres, ceux affichés juste en dessous : une Petite ration pour l'Arbre-mère, une Ration moyenne pour le Dard.
- **Caravanes** (P17) : la feuille annonce le nombre de caravanes qui peuvent vraiment partir, au plus une par marché ouvert. Elle ajoute « La Halle en permet plus : chaque nouveau marché ouvert ajoutera une caravane. » La fiche de la Halle dit « jusqu'à {n} caravanes, une par marché ».
- **Frein des élites rejouables** (P18) : le panneau dit maintenant « Le frein retombe à minuit, dans 3h 12m. »
- **Donjons** (P19) : « Sorties aujourd'hui » devient « Sorties restantes ». Les sorties suivent une fenêtre de 24 h, pas le jour civil.
- **Journal** (P21) :
  - le message d'accueil disait « Tape l'ennemi pour commencer ». Il dit maintenant « Bienvenue à Aeswyn. Ta première mission t'attend au Campement. » ;
  - l'initiative n'est plus notée pour l'ennemi de fond, hors de tout combat.
- **Provenance de la Sève et du Verre des dunes** (C7) : leur fiche dit enfin d'où ils viennent. La description de la Sève ne parle plus seulement de Petite Aventure.
  - **Sève** : l'Arbre-mère (+2 par victoire), la Tanière (+2 par Marque), les Petites Aventures de la Forêt, la caravane longue.
  - **Verre des dunes** : la Cité engloutie, les Petites Aventures du Désert, la caravane longue.
- **« Rôdeur du Chaos »** (C11) : la majuscule est maintenant la même que pour les deux autres variantes.
- **« Débloque : Ascension »** (C12) devient « Débloque : Mémoire », le vrai nom de la tuile.
- **Zone lente** (I5) : « tolère l'absence » devient « la plus longue à remplir ». Au niveau 5, elle se remplit en moins de 2 h.

## Fichier supprimé
- `js/data/ascension.js` : il n'était plus chargé depuis la v3.322.0, ni précaché. Sa suppression est donc sans risque pour la PWA.

## Contrôles
- Harnais : les libellés « Sorties restantes » et « Rôdeur du Chaos » sont mis à jour dans les contrôles. Résultat : 4 499 OK, 0 échec, sur deux passes.
- Autres harnais :
  - démarrage : 4 OK ;
  - création du héros : 44 OK ;
  - parcours P11 : 15 OK.
- L'audit i18n donne 100 % et 0 orphelin. L'entrée « Ascension » est retirée de `en.js`.

Aucun fichier protégé n'a été touché.
