# Aethervale v3.437.0 — Journal de test

S'applique sur la v3.436.5. Décision de Seb : enregistrer une vraie partie pour étalonner le robot de campagne (version complète, désactivée par défaut).

## Ce qui change
- **Paramètres › Appareil › Journal de test** : interrupteur « Enregistrer ma partie », nombre de lignes, boutons Exporter et Effacer.
- Désactivé par défaut. Rien n'est relevé tant que l'interrupteur est éteint.
- Ce qui est relevé :
  - un **relevé** toutes les 5 min de jeu actif, et à chaque étape terminée : niveau, or, PV, monde, étape de chaque chapitre, rareté portée et niveau de forge par emplacement, classe ;
  - les **événements clés** : étape terminée, choix d'histoire, donjon (début, fin, vague, issue), quête d'aventure, victoire contre une élite ou un boss (PV restants), combat de carte, expédition, achat à l'échoppe, reforge, chantier, talent, potion bue ;
  - chaque **mort**, avec son contexte : ennemi, donjon, quête, secteur, expédition ;
  - les **sessions** : ouverture, passage en arrière-plan, retour.
- Stockage à part (`aethervale_journal_test`), hors de la sauvegarde ; plafonné à 5 000 lignes (moins de 1 Mo).
- L'export produit `aethervale-journal-AAAA-MM-JJ.json`.

## Outil
- `tools/sim/compare-journal.js <journal.json> [lot]` : ta partie en face du banc de campagne (même classe), étape par étape — temps réel, temps de jeu actif, morts, niveau ; puis le rapport temps actif / combat du banc, et qui tue.

## Code
- **Fichier ajouté : `js/main/journal-test.js`** (dans `index.html` après `boot.js`, et dans le précache de `sw.js`).
- Branché par enveloppes autour des méthodes existantes (`claimStep`, `DungeonManager.start/finish`, `killEnemy`, `ForgeManager.reforge`…) : aucun fichier protégé modifié. L'enveloppe appelle toujours l'original, tout relevé est sous try/catch, et `toString()` rend le code d'origine (contrôles qui lisent le source).
- `systems/prefs-system.js` : préférence `journalTest` (false).
- `ui/settings-view.js` : carte « Journal de test ».
- `lang/en.js` : 6 entrées.

## Contrôles
- Chromium (390 × 844) : activation, relevé, choix, mort détectée, carte sans débordement (largeur 390), export de 4 lignes, aucune erreur de page.
- `compare-journal.js` sur un journal construit à la main : tableau et totaux corrects.
- Round : 4 113 OK, 0 échec, sur trois passes. Boot : 4 OK. Création du héros : 44 OK. Parcours P11 : 15 OK. Campagne (Mage) : 59 OK. i18n : 100 %. Icônes : aucune absente.
