# Aethervale v3.400.0 — Lot F-2 : fenêtres centrées

Deuxième moitié de l'unification : tout ce qui attend une réponse ou se lit d'un coup passe dans une **fenêtre centrée du kit** (`.kwin`), avec le même habillage C que les feuilles du bas : en-tête de pierre centré (grande icône, titre, sous-titre), corps parchemin, filet d'or et losange.

## Composant
- `kWinHeadHTML({ icon, title, sub, close })` (js/ui/modal.js). Croix facultative : une fenêtre qui attend une réponse se ferme par ses boutons.
- Structure : `.kwin-veil` > `.kwin` > `.kwin-head` + `.kwin-body` + `.kwin-foot` ; textes `.kwin-text` (message) et `.kwin-quote` (récit, filet d'or à gauche). Mêmes jetons `--sheet-*` que F-1.

## Fenêtres migrées
- Confirmation, étape d'Atelier terminée, ancien résumé hors-ligne (modales statiques d'index.html, identifiants conservés).
- Écran de retour (« Continuer » devient un bouton du pied).
- Tutoriels, choix de récit (« Les noms sous le sable »…).
- Présentation d'une quête d'aventure et d'une chasse, fin de quête (le bouton par défaut dit « Continuer » au lieu de « Fermer »), fin de donjon (le titre de réussite, jaune illisible sur crème, passe dans l'en-tête).
- Avant de partir (prévision de combat).
- Fil rouge : ce n'est plus une bulle, mais une fenêtre centrée avec une croix. La bulle s'accrochait à un bouton du HUD qui a disparu en v3.396.0 : son positionnement a été retiré.
- Objectif de l'Atelier : croix et voile, plus de « Fermer ».

## Passés en feuille du bas (réglages et long contenu)
- Réglages du sac (« Tout offrir » en bouton du pied).
- Rapport de combat, y compris à l'ouverture automatique à la mort : croix et voile au lieu de « Continuer », « Réinitialiser » dans le pied.

## Nettoyage
CSS retiré : cartes et boutons des modales système (`.confirm-btn`, `.offline-btn`, `.confirm-icon/-title`, `.offline-card/-icon/-title/-time`, `.workshop-completion-card/-icon/-title/-text`), `.dungeon-story-card/-icon/-title/-text/-lore/-actions/-close`, `.cf-title`, `.cf-actions`, `.workshop-step-popup-title/-text/-actions`, bulle du fil rouge (flèche, position), `.ret-top/-title/-time/-close`, `.story-choice-text`. Plus de fond crème uni ni de voile noir à 85 % : partout le parchemin et le voile commun.

## Pas touché
- Écran titre (confirmation de suppression d'une partie) : laissé pour le chantier de l'écran de lancement.
- Victoire de boss (`.bm-win`) : mise en scène propre au combat.

## Vérifications
round-harness 3596 OK, 0 échec (x2), nouvelle section [173] · boot 4 · création 44 · parcours 139 · campagne 38/38 · i18n 3699, 100 %, 0 orphelin. Aucun fichier protégé modifié. Aucun nouveau fichier de jeu.
