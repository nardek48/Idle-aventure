# Aethervale v3.399.0 — Lot F-1 : feuilles du bas unifiées

Habillage **C · Mixte** validé dans l'atelier des feuilles : en-tête de pierre, corps parchemin, filet d'or double et losange comme le bandeau du HUD. Le même habillage partout.

## Un seul composant
- `kSheetHeadHTML({ icon, title, sub, close })` (js/ui/modal.js) : poignée, icône, titre, sous-titre, bouton rond de fermeture en haut à droite.
- Structure commune : `.ksheet` > `.ksheet-head` + `.ksheet-body` + `.ksheet-foot` (actions, boutons du kit `.kbtn`).
- Couleurs et textures dans des jetons `--sheet-*` (css/00-tokens.css). Passer plus tard à l'habillage B (pierre) = changer ces jetons.
- Voile commun `rgba(12, 8, 5, .62)` : plus de voile violet ni de flou derrière les menus.

## Feuilles migrées
Résumé › Stats, Capacités, Talent · Donjon (« Entrer » devient le bouton principal) · Comparaison d'objet (« Équiper ») · États du combat · Sortie en cours · Qui soigner ? · Grimoire › Aide, Presets, Rapport · Choisir un titre (Hauts faits) · Menu · Files en cours · Fiche d'un bâtiment du village · Popup d'un monde (carte) · Volet de la carte vivante (le nom du secteur passe dans l'en-tête) · Installer sur iPhone.
- Les boutons « Fermer » / « Annuler » / « Compris » qui ne faisaient que fermer sont retirés : la croix et le voile ferment. La popup d'un monde se ferme maintenant aussi en touchant le voile.
- Les fenêtres encore en `.full-menu` (quêtes, tutoriels, récits…) prennent déjà le fond parchemin ; elles deviendront des fenêtres centrées au lot F-2.
- L'ancien en-tête `.full-menu-header` (code de sauvegarde, save-system.js — fichier protégé, non modifié) reçoit le même habillage par le CSS.

## Nettoyage
CSS mort retiré : `.grimoire-sheet*` (fond, poignée, titre, bouton), `.hf-sheet` (fond), `.lmx-sheet-grab/-close`, `.lm-panel-head/-meta`, `.dsheet-sub`, `.eqs-sub`, `.st-sheet-sub`, `.vb-sheet-head/-title/-level`, `.map-popup-title`, `.construction-popup-icon/-title`, `.pwa-install-actions`, `.ksheet-close`.

## Remarque
La fiche Construction (construction-view.js) est migrée mais n'est plus accessible en jeu (carte d'entrée inerte depuis v3.213) et plante si on l'ouvre (`getNextBonusMultiplier` n'existe plus). À supprimer lors d'un ménage.

## Vérifications
round-harness 3580 OK, 0 échec (x2), nouvelle section [172] · boot 4 · création 44 · parcours 139 · campagne 38/38 · i18n 3699, 100 %, 0 orphelin. Aucun fichier protégé modifié. Aucun nouveau fichier de jeu.
