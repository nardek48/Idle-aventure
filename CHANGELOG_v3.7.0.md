# Aethervale — CHANGELOG v3.7.0

Base : v3.6.0. Nouvelle page **Campement**, comme demandé en test — point
de ralliement entre deux expéditions, devient la nouvelle page d'accueil
du jeu.

## Ce qui change

**Barre du bas réorganisée** : Campement (nouveau, premier) → Combat →
Village → Héros → Menu. Donjon n'a plus son propre bouton — déplacé dans
la grille du Menu (premier item), pastille de ticket disponible réutilisée
telle quelle (le code existait déjà, juste jamais branché tant que Donjon
avait son propre bouton).

**Contenu de la page Campement** (premier jet, comme convenu) :
- Feu de camp — nouvelle mécanique de soin gratuit, complet (100% PV),
  utilisable toutes les 30 minutes.
- Résumé condensé des 3 systèmes de quêtes du jeu (questline de monde,
  quêtes d'aventure, quêtes journalières) — une ligne par système avec du
  contenu à signaler, avec un bouton vers l'onglet Quêtes pour le détail
  complet.
- Accès rapide : Personnage, Équipement, Quêtes.

## Sur le feu de camp

Soin à 100% plutôt que partiel — plus simple, et le cooldown de 30 min
suffit à ne pas cannibaliser l'économie des potions (qui restent la
solution d'urgence EN PLEIN COMBAT ; le feu de camp couvre plutôt "je me
prépare avant de repartir"). Pas de gâchis de cooldown si le joueur clique
alors qu'il est déjà à PV pleins (juste un message, le cooldown n'est pas
consommé).

## Détail technique

**Nouveaux fichiers**
- `js/systems/camp-system.js` — `CampManager` (ensureDefaults, getRemainingMs,
  isReady, useCampfire).
- `js/ui/camp-view.js` — `buildCampHTML()`, `buildCampQuestSummaryHTML()`.
- `css/04-panel-camp.css` — styles de l'écran, cohérents avec le thème
  parchemin existant (mêmes tokens `--nb-*`, aucune nouvelle palette).

**Fichiers modifiés**
- `index.html` : bouton Campement ajouté en premier (icône emoji 🏕️
  temporaire — pas encore d'asset dédié, comme les 3 icônes d'équipement
  déjà en attente, voir Guide d'équilibrage section 8), bouton Donjon
  retiré ; nouveaux `<script>`/`<link>` pour les 2 fichiers ci-dessus.
- `js/ui/ui-root.js` : nouveau `case "campement"` dans `renderPanel()`.
- `js/ui/menu-view.js` : Donjon ajouté en premier dans `MENU_ITEMS`
  (`badge: "dungeon"`, logique déjà existante et déjà correcte).
- `js/ui/quests-view.js` : `updateQuestBadge()` — le ticket de donjon
  disponible réintègre le total agrégé du bouton Menu (explicitement
  exclu depuis v2.70 tant qu'il avait sa propre pastille dédiée, qui
  n'existe plus) ; code mort de l'ancienne pastille séparée retiré.
- `js/core/state.js` : `activeTab` par défaut passé de `"combat"` à
  `"campement"` ; `CampManager.ensureDefaults()` ajouté au filet de
  sécurité `ensureGameStateDefaults()`.
- `js/systems/save-system.js` : `game.campfireLastUsed` câblé aux 3
  emplacements pertinents — persiste à l'ascension (pas de raison de
  punir un utilitaire de confort), remis à 0 au reset complet.
- `js/main/game-loop.js` : `adventure-quest-modal-root` (v3.6) déjà
  couvert par `isBlockingModalOpen()` — pas de changement nécessaire ici,
  vérifié.
- `sw.js` : `CACHE_VERSION` → `"3.7.0"`, nouveaux fichiers ajoutés au
  précache.

## Deux bugs latents trouvés et corrigés en cours de route

Aucun rapporté par Seb, découverts en auditant les flux de bascule
d'onglet pour ce chantier :

1. **`main/boot.js`** — l'affichage initial (`#game-area`/`#panel-container`)
   reposait sur leur état CSS par défaut, qui ne correspondait à l'onglet
   "combat" que par COÏNCIDENCE (`switchTab()` n'était jamais appelée
   explicitement au démarrage). Changer l'onglet par défaut vers
   "campement" aurait fait apparaître les deux écrans superposés au
   premier lancement sans ce correctif. `switchTab(game.activeTab)`
   ajouté en fin d'`init()`.
2. **`js/systems/save-system.js` (`resetGame()`)** — même défaut : après
   un reset complet déclenché depuis un écran non-Combat (typiquement
   Paramètres), l'affichage restait figé sur cet écran au lieu de
   basculer vers Combat comme `fullResetState()` le fixe pourtant dans
   `game.activeTab`. `switchTab()` ajouté après `renderAll()`.

## Décision prise sans confirmation explicite (à valider)

Au tout premier lancement (création de personnage), le joueur atterrit
maintenant sur le Campement plutôt que directement sur Combat — cohérent
avec "le Campement est la nouvelle page de base". Un changement de héros
EN COURS DE PARTIE continue d'aller sur Combat (comportement inchangé,
voir/tester son nouveau héros se battre tout de suite reste logique dans
ce cas). Facile à inverser si tu préfères garder Combat pour le tout
premier lancement (le tutoriel d'accueil parle de taper sur l'ennemi,
donc il y a un argument pour les deux — dis-moi ce que tu en penses en
testant).

## Tests effectués

- `node --check` sur tous les fichiers JS touchés.
- Re-passage des harnais v3.1/v3.2/v3.3 : aucune régression.
- Playwright (rendu réel, 390×844) :
  - Premier lancement : `activeTab === "campement"`, zone de combat
    correctement cachée (`display:none`), panneau actif avec le contenu
    Campement — aucune superposition.
  - Feu de camp : soin 1 PV → 456/456 confirmé, cooldown affiché
    ("Disponible dans 30m 0s"), persiste après rechargement de page
    (simulé via `page.reload()`), aucun gâchis de cooldown si déjà à PV
    pleins.
  - Résumé des quêtes : les 3 lignes (questline, aventure, journalières)
    reflètent bien l'état réel du jeu.
  - Navigation Menu → Donjon : carte présente avec pastille "1" (ticket
    disponible), clic ouvre bien l'écran Donjon, barre du bas cohérente
    (bouton Menu surligné, plus de bouton Donjon dédié).
  - Test de fumée sur les 12 onglets du jeu : aucune erreur console
    (hormis le 404 pré-existant connu, `right-panel-frame.png`, sans
    lien avec cette livraison).

## Pas encore fait (prochaine itération, si souhaité)

- Icône dédiée pour le bouton Campement (emoji 🏕️ en attendant).
- Résumé de quêtes actuellement en LECTURE SEULE (pas de bouton "Réclamer"
  directement depuis le Campement) — volontaire pour ce premier jet,
  simple à étendre si souhaité.
- Aucun contenu narratif spécifique au Campement lui-même (texte
  d'ambiance, illustration dédiée) — le thème parchemin standard
  s'applique tel quel.

## Fichiers modifiés

- `js/systems/camp-system.js` (nouveau)
- `js/ui/camp-view.js` (nouveau)
- `css/04-panel-camp.css` (nouveau)
- `index.html`
- `js/ui/ui-root.js`
- `js/ui/menu-view.js`
- `js/ui/quests-view.js`
- `js/ui/modal-view.js`
- `js/core/state.js`
- `js/systems/save-system.js`
- `css/02-layout.css`
- `sw.js` (`CACHE_VERSION` → `"3.7.0"`)
