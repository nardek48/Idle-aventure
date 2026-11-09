# v3.756.0 — Petites Aventures : jets de dés instantanés (Seb 09/11, options A + B)

- `js/systems/prefs-system.js` : préférence d'appareil `desInstant` (coupée par défaut).
- `js/ui/pa2-view.js` : `pa2DiceInstant()` ; `pa2RollDie` pose le dé tout de suite sur sa valeur (pas de roulement, 0 ms au lieu de 800) quand le réglage est actif (A) ou quand l'appareil demande moins d'animations, `prefers-reduced-motion` (B). Les effets du 20 et du 1 naturels restent. Vaut pour tous les jets : désamorcer, obstacles, recherche, qualité, forcer.
- `js/ui/settings-view.js` : Paramètres › Jeu, interrupteur « Jets de dés instantanés » (icône : la face 20 du dé, `images/UI/de/d20_vide_20.webp`).
- Quoi de neuf : une ligne (FR + EN).
- `tools/harness/round-harness.js` : section [509] ; [181] compte 4 interrupteurs dans l'onglet Jeu.

Contrôles : round-harness 7 280 OK, 0 échec (×2) ; boot 4 OK ; création du héros 44 OK ; i18n 8 961 textes, 100 % ; parcours 235 OK.
