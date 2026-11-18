# v3.813.0 — Audit de sortie de l'Alpha : premier lancement, images hors ligne, conseil de la Boutique (18/11/2026)

Phase 1 de l'audit de sortie de l'Alpha (`Aethervale_Audit_Alpha_Registre_2026-11-18.md`, lots A à C, validés par Seb le 18/11). Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Lot A — premier lancement (ALPHA-PREM-1 P1, ALPHA-PREM-2, ALPHA-RET-5)
- `ui/news-view.js` : `newsCanShow()` compte le tutoriel sur l'écran (`.coach`) et son voile d'attente (`.coach-wait`) comme des fenêtres ouvertes. La fenêtre de l'Alpha « Avant de partir » ne s'ouvre plus sous le tutoriel d'accueil. La notification « les nouveautés sont dans Paramètres » (édition jeu) attend aussi la fin du tutoriel.
- `ui/coach-view.js` : `CoachTutorial._start` attend la fin du prologue affiché (`PrologueView.active` et `#prologue-root .prologue`) avant de mesurer, sans compter d'essai. Un joueur qui lit les planches 5-6 a désormais le tutoriel d'accueil sur l'écran au lieu de la fenêtre classique. Ce correctif n'est livré qu'avec le précédent : seul, il rendait le chevauchement systématique (8 cas sur 8, d'après l'audit).
- `ui/alpha-view.js` : `alphaIntroSeen` est écrit au choix (`closeAlphaIntro`) et non plus à l'ouverture. Un testeur qui quitte avant de choisir revoit la fenêtre.

## Lot B — cache d'images de l'Alpha (ALPHA-PUB-1, régression du P8)
- `sw.js` : le nettoyage à l'activation garde `IMAGE_CACHE`. En Alpha, son nom (`aethervale-alpha-images`) commence par le préfixe des caches de version, et il était effacé à chaque mise à jour depuis v3.751.0.

## Lot C — conseil du pronostic (ALPHA-PREM-4)
- `systems/combat-forecast-system.js` : « l'échoppe du village », qui n'existe pas avant la Halle, devient « la Boutique (Héros → Équipement) ». La Boutique y reste toute la partie (v3.615.2). Clé et traduction mises à jour dans `lang/en.js`.

## Mesures (copie publiée reconstruite comme `pages.yml`, Chromium headless)
- **Premier lancement, Alpha**, 30 cas (320, 375, 390, 430 px × « Passer » à 0,8, 1,5, 2,2 et 3 s, lecture à 1,5 et 4 s par planche, plus PC 1280) :
  - chevauchement 0/30 (12/30 en v3.812.0) ;
  - tutoriel d'accueil sur l'écran 24/24 sur téléphone (12/24 avant) ;
  - « Avant de partir » ouverte après la dernière bulle, une seule fois, et touchable ;
  - choix fait 30/30, 0 erreur de console ;
  - les touchers du prologue passent malgré le voile d'attente (16/16, fin du prologue au même moment qu'avant).
- **Quitter sans choisir** : la fenêtre revient (2 fois sur 2) ; après un choix, elle ne revient plus ; pas de réouverture en boucle.
- **Édition jeu** : un nouveau joueur n'a que le tutoriel d'accueil ; la notification de nouveautés sort après la fermeture du tutoriel. Les autres tutoriels sur l'écran s'ouvrent au même moment qu'en v3.812.0.
- **Mise à jour 3.812.0 → 3.813.0 de l'Alpha** : `aethervale-alpha-images` gardé (98 → 98 entrées). Hors ligne : 0 image en échec sur 101. Avec l'ancien filtre (N+1 dérivée) : 36 images en 504. Les caches du jeu ne sont pas touchés, et inversement.
- **Pronostic** : nouveau texte rendu dans 20 cas sur 20 (FR et EN, singulier et pluriel, avant et après la Halle, 320 et 390 px), sans débordement. Le chemin Héros → Équipement → Boutique existe dans tous ces cas.

## Contrôles
- `round-harness` : 7 161 OK, 0 échec, sur 2 passes.
  - [254] devient un contrôle d'effet : `sw.js` est exécuté en vm pour les deux portées, et seule l'ancienne version doit être effacée. Il échoue sur le `sw.js` de v3.812.0.
  - Nouvelle section [523] : non-régression de PREM-1, PREM-2, RET-5 et PREM-4, et nom du cache d'images indépendant de la version.
- boot 4 OK ; création du héros 46 OK ; parcours 236 OK, 0 échec. Sur les copies publiées (jeu et Alpha) : boot 4 OK, création du héros 46 OK.
- i18n 100 % (9 123 textes, 0 orphelin) ; images absentes : 3, hors Alpha, inchangées.
- Quoi de neuf : deux lignes (FR + EN).

## Reste ouvert
- Les autres P2 de l'audit sont à documenter dans le message d'invitation, ou à corriger plus tard : ALPHA-RET-1, ALPHA-DATA-1, ALPHA-STAB-1, ALPHA-PREM-3, ALPHA-CONT-1.
- Vu pendant la vérification, déjà présent en v3.812.0, non corrigé : la bannière « Nouvelle version disponible » reste sous le tutoriel sur l'écran et sous les fenêtres jusqu'à leur fermeture.
- `/alpha/` est publié depuis la branche `alpha` : ces corrections n'atteignent l'Alpha en ligne qu'une fois cette branche mise à jour, puis le workflow lancé (Conception Alpha §3).
