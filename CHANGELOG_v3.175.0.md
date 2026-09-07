# v3.175.0 — Boutons ronds du kit (fermetures d'overlays)

## Périmètre (après relecture complète des boutons ronds du jeu)
- **Basculés** : les 5 boutons « fermer » — `.full-menu-close` (menu ☰,
  réglages d'inventaire, récap atelier, 2 modales de sauvegarde) et
  `.hc-close-btn` (création de héros) → `btn-round-close.png` + état
  pressé dédié. **Par CSS uniquement, zéro modification JS** : 2 des
  usages vivent dans `save-system.js` (fichier protégé), le restylage
  de la classe existante couvre tout sans y toucher. Le glyphe texte
  « ✕ » est masqué (font-size:0) — il est peint dans l'asset — mais
  reste dans le DOM.
- **Volontairement PAS touchés** : les boutons RETOUR du titre et de la
  création de héros (asset `bouton_retour_new.png` déjà validé au
  chantier titre — dis-moi si tu veux les unifier sur le
  `btn-round-back` du kit) ; le mini ✕ d'annulation de craft (22px,
  trop petit pour l'asset orné).
- **En réserve** : `.krbtn-back` / `.krbtn-plus` (+ états pressés)
  prêts dans `css/00-kbtn.css` pour de futurs usages ; `btn-round-
  normal/locked/laurel/pressed-alt` non intégrés (aucun usage
  identifié).

## Atelier
Section 9 : rangée boutons ronds (fermer réel + pressé forcé + retour +
plus).

## Divers
sw.js CACHE_VERSION → 3.175.0 · harness : boot 4 OK ·
hero-creation 44 OK · round 912 OK.
