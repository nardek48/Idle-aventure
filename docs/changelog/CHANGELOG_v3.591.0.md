# v3.591.0 — Paramètres à l'accueil, chercher ou forcer une mise à jour

Demandes de Seb du 30/10, après l'atelier `atelier/accueil-parametres.html`.

## Ce qui change
- **Accueil** : une roue des Paramètres en haut à droite (44 px sur téléphone, 48 px en grand écran) ouvre une feuille « Paramètres · Réglages de cet appareil » :
  - **Sauvegarde** : « Importer un fichier » et « Coller un code ». Depuis l'accueil, chaque héros importé prend le premier emplacement libre : aucun emplacement occupé n'est écrasé. Plus de place : le message le dit. Avant, il fallait créer une partie pour pouvoir importer, et l'import l'écrasait.
  - **Mises à jour** (voir plus bas).
  - **Langue** (le jeu redémarre, sans fenêtre de confirmation qui passerait sous l'accueil) et **Taille du texte**. L'installation reste sur le bouton déjà présent à l'accueil ; le journal de test et l'Admin restent dans le jeu.
- **Mises à jour**, à l'accueil et dans Paramètres › Partie :
  - « Chercher » : le navigateur relit la version en ligne ; s'il y en a une nouvelle, elle s'installe et le jeu redémarre ; sinon « Tu as la dernière version ».
  - « Forcer » : sauvegarde, vide le cache du jeu, retire le service worker et relance ; tout est retéléchargé. La sauvegarde (stockage local) n'est pas touchée.
  - Les messages s'écrivent dans la carte (un message flottant passerait sous l'accueil).

## Fichiers
`js/main/pwa.js` (PwaUpdate, carte Mises à jour), `js/ui/title-screen-view.js` (roue, feuille), `js/ui/save-transfer-view.js` (import vers un emplacement libre), `js/ui/settings-view.js` (carte dans Partie, onglet Appareil réutilisé à l'accueil), `css/00-title-screen.css`, `js/lang/en.js` (21 textes). Aucun nouveau fichier ; `save-system.js` (protégé) n'est pas modifié : l'import utilise ses fonctions publiques.

## Contrôles
`round-harness` 5 595 OK, 0 échec (deux passes), avec un contrôle nouveau [388] (carte Mises à jour, feuille de l'accueil, import vers un emplacement libre sans écraser). `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK ; audit i18n 100 %. Sous Chromium : import d'un héros depuis l'accueil (emplacement 2, le 1 intact), « Chercher » avec un vrai service worker (« Tu as la dernière version »), « Forcer » (relance, service worker réinstallé, stockage local conservé). L'icône `dungeon_entrance.webp` signalée par l'audit des icônes vient de la v3.582.0 (icône générique en attendant l'image).
