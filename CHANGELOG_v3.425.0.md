# Aethervale v3.425.0 — Chantier Héros, lot H-2 : les écrans de Héros refaits

Ateliers H-2 à H-5 validés par Seb le 02/10/2026. S'applique sur la v3.424.1.

## Résumé
- Bannière du portrait (nom, classe, niveau, titre, XP), le cadre du portrait visible en haut.
- **Les 4 chiffres sur une ligne** (PV, Attaque, Défense, Critique) ; un toucher ouvre la feuille Stats.
- Trois tuiles qui disent quoi faire : Entraînement (vraie situation : niveaux à acheter, plafond, Terrain), Capacités, Mémoire (pastille si un choix attend).
- **« Mes héros » en bas**, en vrai bouton.

## Équipement › Équipé
- **Silhouette à capuche** (homme ou femme selon le héros), les 7 emplacements **autour du corps** : Casque à gauche de la capuche, Amulette, Armure sur le torse, Gants à la main, Arme le long du corps, Anneau, Bottes.
- Toucher un emplacement le sélectionne : son **détail s'affiche sous la silhouette** (Déséquiper, Changer / Mieux dans le sac).
- Pastille sur l'emplacement : ▲ un objet du sac est mieux, ⇅ un objet du sac a des gains et des pertes.

## Équipement › Sac
- Sur le modèle de l'Entrepôt : liste déroulante **« Afficher »** (Tout, Armes, Armures, Bijoux, Potions, Mieux que l'équipé, avec les compteurs), tri et Autovente dans le même menu.
- Tuiles sombres à la couleur de la rareté, image entière (plus rognée), nom sur la tuile.
- **Une pastille par objet** : ▲ mieux (que des gains, ou emplacement vide), ▼ moins bien (que des pertes), ⇅ des changements (gains et pertes). Plus de stat sur la tuile : le détail est dans la feuille de l'objet.

## Talents
- Arbre d'icônes (maquette de Seb) sur **le fond de la classe** (chêne, faucon, cercle de runes).
- Cadre de bronze pour chaque talent, cadre rond à gemme pour les clés de voûte, **cadenas** sur une clé de voûte pas encore apprise, **chaîne** entre les deux.
- Chaque voie : son **emblème** en médaillon sur un parchemin avec son nom et ses points.
- Toucher un talent : son détail et « Apprendre · 1 point » en bas. **La page ne remonte plus en haut.**

## Compagnons
- Une carte courte par compagnon : portrait, rôle, dégâts, où il est, PV, Avec toi / Au camp.
- La fiche complète s'ouvre en feuille.
- **La Patrouille reste dans la fiche** tant que l'écran Expéditions n'existe pas (sinon on ne pourrait plus en lancer). Elle partira avec ce chantier.
- Fiche : le texte de l'autre Voie passe au-dessus du bouton « Changer » (il était écrasé, vu sur Maddoc).

## Feuille Stats
- Au plafond de l'entraînement : **un seul bandeau** en tête (« Plafond de l'entraînement : 110 », bouton Terrain), et chaque carte dit « Plafond 110 » au lieu de sept boutons « Terrain à améliorer ».

## Pour tout le jeu
- **Le défilement des cadres est gardé** : une action qui redessine l'écran (choisir, acheter, apprendre…) ne renvoie plus en haut, tant qu'on reste sur le même écran (même onglet, mêmes boutons allumés). Changer d'onglet repart en haut, comme avant.
- Pas de bulles flottantes sur Héros : elles recouvraient le contenu.

## Images (≈ 430 Ko, non précachées)
- `images/Heroes/full/silhouette_hood_{m,f}.webp`
- `images/UI/talents/` : `bg_{knight,archer,mage}`, `emb_{rempart,bourreau,faucon,ombre,braise,sceau}`, `banner`, `frame_node`, `frame_key`, `lock`, `chain` (WebP).
- Les mannequins des héros ne sont pas dans cette version (non utilisés pour l'instant).

## Code
- Nouveau `js/ui/heros-screens-view.js` (écrans) et `css/04-panel-heros-screens.css` (préfixes `.hs-*`, `.hst-*`).
- `heros-view.js` garde le rail, le cadre et les feuilles ; nouvelles feuilles `slot`, `item`, `companion`.
- `ui-root.js` : `getPanelScreenKey()`, restauration de `.kfp-scrollzone`.
- L'ancien plateau de talents (`buildTalentBoardHTML`) et les anciens contenus d'équipement restent dans leurs fichiers (non affichés dans Héros).

## Fichiers protégés
Aucun. Aucun nouvel état sauvegardé (filtre du Sac et sélections : état d'écran).

## Harnais
- Nouvelle section **[197]** (27 contrôles). Contrôles du Résumé et des Compagnons mis à jour (nouveaux écrans).
- Résultats : round **3 828 OK**, boot 4, création 44, parcours 139, campagne 38, i18n 100 % (0 orphelin), pseudo-langue Héros : seul le nom du joueur.
