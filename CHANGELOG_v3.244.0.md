# CHANGELOG v3.244.0 — Navigation, lot N-1 : portes et barre du bas

**Base :** v3.241.0 (à installer avant) · **Delta CUMULATIF depuis v3.241.0 :** 38 fichiers · `CACHE_VERSION` et `GAME_VERSION` → `3.244.0`

> Ce ZIP contient aussi tout ce qui a été livré en v3.242.x (correctifs d'affichage) et v3.243.0 (jauge de célérité) — leurs notes sont dans `CHANGELOG_v3.243.0.md`, inclus. Installe directement celui-ci par-dessus v3.241.0.

## Validation

| Contrôle | Résultat |
|---|---|
| `round-harness.js` | **0 échec** (×3 : 1742 / 1744 / 1744) |
| `boot-harness.js` | 4 OK, 0 échec |
| `hero-creation-harness.js` | 44 OK, 0 échec |
| `node --check` sur les 145 JS | OK |
| Balayage Chromium 390 × 844, 18 écrans | 0 image cassée, 0 chemin en texte, 0 erreur JS |
| Alias `switchTab('equip')` / `('talents')` | arrivent dans Héros, sous-onglet positionné |

**Aucun fichier protégé modifié dans ce lot.** (`combat-engine.js` l'a été en v3.243.0, sur ton accord, pour la célérité — inchangé depuis.)

---

## Ce qui change à l'écran

Structure validée sur `atelier-navigation.html` (décision Seb 14/09/2026).

### Menu ☰ : six cases, consultation et réglages seulement

Bestiaire & Codex · Hauts faits · Afflictions · Journal · Tutoriels · Paramètres.

Sortis du menu : **Combat** (on y entre par une mission, une quête ou un donjon), **Donjon** et **Carte** (→ Campement), **Équipement** et **Talents** (→ Héros), **Ascension** (→ Résumé du héros), **Boutique** (→ bâtiments du Village, lot N-2).

### Campement : bloc « Expédition »

Sous le tableau de missions, deux portes côte à côte : **Donjon** (pastille du nombre de tickets, « En cours » si un run tourne) et **Carte** (monde courant). Chacune respecte le même verrou d'Histoire que son ancienne case de menu ; le bloc entier est absent tant qu'aucune n'est débloquée.

### Héros : le hub « Progresser »

Sous-onglets **Résumé / Équipement / Talents**, chacun gated par son verrou d'Histoire (un sous-onglet verrouillé n'est pas dessiné).

- **Résumé** — inchangé, plus une porte **Ascension** (Aether, nombre d'ascensions). Les sauts **Stats** et **Capacités** ouvrent désormais des **feuilles basses** : le Résumé reste visible derrière. Le bouton « Équipement » du pied a disparu, c'est un sous-onglet.
- **Équipement** — le contenu de l'ancien écran, sous un segment **Équipé / Sac (n) / Boutique**. « Boutique » est transitoire : le lot N-2 l'emmène à la Halle marchande.
- **Talents** — l'arbre, sous un segment **Combat / Fortune / Survie** (les trois branches quittent la barre du kit pour le second niveau).

### Deux composants génériques

`css/00-components.css` : **`.kseg`** (segment 2–3 positions, second niveau sous une barre de sous-onglets) et **`.ksheet`** (feuille basse), extraits du Grimoire où ils étaient déjà validés sur iPhone (v3.210–212). Plafond mesuré et acté : la barre du kit tient à **3** boutons ; à 4 elle tombe à 32 px de haut et coupe les libellés.

---

## Comment c'est fait

**`menu-view.js`** — `MENU_ITEMS` réduit à six entrées.

**`camp-view.js`** — `buildCampExpeditionDoorsHTML()` ; style `.camp-door*` dans `04-panel-camp.css` (dans la liste d'encre restaurée via `.camp-card`).

**`heros-view.js`** — `activeHerosSubTab` ∈ `hero | equip | talents` ; `herosOpenSheet` ∈ `null | stats | abilities`. `buildHerosEquipHTML()` et `buildHerosTalentsHTML()` réutilisent les constructeurs existants de `equipment-view.js` et `talents-view.js` — aucune logique dupliquée. Les feuilles sont rendues dans **`#heros-sheet-root`** (nouveau dans `index.html`), hors de `#panel-container`, par `renderHerosSheet()` appelé depuis `renderPanel()` — même mécanique et même raison que le Grimoire (v3.212.0 : `isolation: isolate` enferme le z-index). La position de lecture de la feuille est conservée à travers les re-rendus d'achat.

**`equipment-view.js`** — `buildEquipmentTabContentHTML(topHTML)` et `buildInventoryTabContentHTML(topHTML)` acceptent un fragment inséré **en tête du cadre**. Nécessaire : posé avant le cadre, le segment tombait entre le bandeau (que `kframe-decorator` sort du flux) et le corps. Vu à la capture, corrigé.

**`ui-root.js`** — `switchTab('equip')` et `('talents')` sont conduits vers `more` avec `setHerosSubTabSilent()`, après le contrôle de verrou sur le nom d'origine : pastille sac du HUD, bouton du Résumé, toast de butin, liens des fiches de bâtiment continuent tous de marcher. `log` rejoint `ALWAYS_UNLOCKED_TABS` : le bouton Journal des Paramètres retombait sur le Campement depuis longtemps, faute de verrou d'Histoire.

**`settings-view.js`** — le déverrouillage global couvre explicitement les onglets sortis de `MENU_ITEMS` (`relocatedTabs`), sinon il les aurait oubliés.

**`village-building-view.js`** — renvoi **transitoire** « Bourse et contrats d'or » sur la fiche de la Taverne vers Boutique › Économie, seule porte restante vers ces deux améliorations. Libellés des renvois Terrain et Halle mis à jour (« Héros → Stats », « Héros → Équipement »).

**Compatibilité** — `setHerosSubTab('amelioration')`, que l'étape d'Histoire forest_03 appelle via `goToLink`, ouvre la feuille Stats ; `setHerosSubTab('stats')` ouvre la feuille Capacités. `goToHeroTraining()` (fiche du Terrain) suit le même chemin.

**`round-harness.js`** — sept blocs adaptés (RESUME, BILAN, STATS/CAP, Histoire point 4, Terrain) : ils testaient l'ancienne structure (libellés des sous-onglets, titres de cadre, contenu Stats/Capacités lu dans le panneau). Le contenu est maintenant lu dans `buildHerosSheetHTML()`. La mécanique testée — achat, simulation de gain, contres du Grimoire, mur du Terrain — est intacte.

---

## Lot N-2 (suivant) : les boutiques dans les bâtiments

| Bâtiment | Accueille | Aujourd'hui |
|---|---|---|
| Halle marchande | vitrine d'équipement | Héros › Équipement › segment « Boutique » |
| Apothicaire | achat de potions | Boutique › Potions |
| Enchanteresse | boutique d'éclats | Donjon › Boutique |
| Taverne | Bourse lourde, Contrats lucratifs | Boutique › Économie (renvoi transitoire) |

Une fois fait : suppression de l'écran Boutique, du segment « Boutique » de Héros et du sous-onglet « Boutique » du Donjon.

## À vérifier sur iPhone

1. Les feuilles Stats / Capacités : hauteur (84 vh max), défilement interne, fermeture au toucher du voile.
2. Le segment en tête de cadre sur Équipement et Talents : lisibilité de l'encre sur le parchemin.
3. Les deux portes du Campement : taille tactile, pastille de tickets.
