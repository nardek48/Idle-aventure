# v3.570.0 — Le prologue

Décision de Seb du 30/10 (option B) : une vraie introduction avant de jouer. Textes validés (version fusionnée, phrase 6 de Seb), images fournies par Seb, réglages choisis dans l'atelier `atelier/prologue.html` : **fond A** (dégradé léger), **lettre à lettre**, **vitesse normale**, **rythme régulier**. Conception : `systemes/introduction/Aethervale_Prologue_v0_2.md` (dépôt Documentation).

## Déroulé
- **Nouvelle partie** (ou emplacement vide de « Charger ») : planches 1 à 4, « Cette nuit-là » (le ciel, la terre, le feu, l'enfant), puis la création du héros, inchangée.
- **Après « Confirmer »** (première création seulement) : planches 5 et 6, « Douze hivers » et « Cette nuit », puis le Camp et le tutoriel « Le Campement », inchangé.
- Image plein écran, texte qui s'écrit lettre à lettre sur le bas de l'image. Toucher : d'abord tout le texte, puis la planche suivante. « Passer ▸ » saute à la fin du temps en cours ; le retour Android et Échap font de même.
- **Revoir le prologue** : carte en tête de Quêtes › Histoire (lien sous le groupe Histoire sur grand écran), les six planches d'un trait. Les parties en cours y ont accès.
- Moins d'animations demandé par l'appareil : le texte s'affiche d'un bloc.
- Réglage « Taille du texte : Grande » : texte du prologue agrandi.

## Images
12 images dans `images/Prologue/` (2,4 Mo) : version téléphone en portrait 1366 × 2048, version PC en paysage `-wide` 3072 × 2048. Les versions téléphone des planches 1 et 3 sont arrivées en 1024 × 1536 et ont été agrandies par simple redimensionnement (à remplacer si une version 1366 × 2048 arrive).

## Code
- **Fichiers ajoutés** (index.html et précache de `sw.js`) :
  - `js/data/prologue.js` : les six planches (image et lignes) ;
  - `js/ui/prologue-view.js` : l'affichage (`PrologueView`, `openPrologueReplay`) ;
  - `css/00-prologue.css` : la mise en page.
- `js/ui/title-screen-view.js` : planches 1-4 à la création d'un emplacement.
- `js/ui/modal-view.js` : planches 5-6 après la première confirmation, sauvegarde faite avant.
- `js/ui/ui-root.js` : le retour (Android, Échap) passe le prologue.
- `js/ui/quests-view.js`, `css/04-panel-quests.css` : carte et lien « Revoir le prologue ».
- `js/lang/en.js` : textes anglais ; `js/lang/data-fields.js` : planches déclarées au registre des textes.
- Aucun fichier protégé, aucun nouvel état sauvegardé, tutoriel d'onboarding inchangé.

## Contrôles
`round-harness` 5 521 OK, 0 échec (deux passes, nouvelle section [379]) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` 142 OK (P1 passe désormais par le prologue) ; audit i18n 100 %, 0 orphelin. Parcours vérifié sous Chromium à 390 × 844 et 1440 × 900.
