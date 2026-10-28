# v3.529.0 — Astuce de combat : la ressource de classe pleine (audit, lot 10 : TUT-5)

Décision de Seb : option C de l'atelier `atelier/astuce-combat.html`, qui réunit les deux astuces. Le tutoriel de forest_02 n'est pas touché (règle d'onboarding) : seuls l'écran de combat et le rapport de défaite changent.

## Le constat
Un débutant qui ne touche qu'à ATTAQUER meurt deux fois sur deux contre la Meute (forest_06). Sa Rage reste à 100/100 sans servir, alors qu'avec la compétence conseillée (dorée), il gagne.

## Ce qui change en jeu
- **En combat** : à la place du conseil du Grimoire, la ligne devient « Rage pleine : touche la compétence dorée », en pastille or sur fond sombre (10:1), avec l'icône de cette compétence. Le texte suit la classe : Rage, Concentration ou Mana. La ligne ne s'affiche que si toutes ces conditions sont réunies :
  - mode Tactique, au tour du héros ;
  - ressource de classe pleine ;
  - round 3 ou plus ;
  - une compétence est conseillée et jouable (ni recharge ni silence).

  Sinon, le conseil habituel reste. L'écran garde la même hauteur.
- **Rapport de défaite** (il s'ouvre déjà seul) : si la ressource de classe était pleine au moment de la défaite, une carte « Astuce » s'affiche en tête. Rien en mode Grimoire, où le joueur ne touche pas les compétences.

## Code
- `ui/combat-screen-view.js` : `fullResourceTip`.
- `ui/combat-report-view.js` : `defeatResourceTipHTML`.
- CSS : `03-combat-screen.css` et `04-panel-combat-report.css`.
- `en.js` : 3 textes.
- Harnais [348].
- Aucun nouvel état sauvegardé, aucun fichier protégé ni ajouté.

## Contrôles
- Round : 5 344 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6 591 textes, 100 %, 0 orphelin.
- Chromium à 320 et 390 px (Chevalier, Rage 100/100, 0 erreur) :
  - la ligne s'affiche quand les conditions sont réunies ;
  - le conseil habituel revient au round 2 ou avec la Rage à 99 ;
  - rien en mode Grimoire ;
  - l'astuce de défaite n'apparaît qu'avec la ressource pleine, jamais dans le rapport ouvert à la main.
