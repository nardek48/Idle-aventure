# CHANGELOG v3.240.0 — Iconographie propre : 182 assets remplacent les emoji

**Base :** v3.239.0 · **Delta :** 65 fichiers + 182 PNG · `CACHE_VERSION` → `3.240.0` · `GAME_VERSION` → `3.240.0`

## Validation

| Contrôle | Résultat |
|---|---|
| `round-harness.js` | **1742 OK, 0 échec** (identique à v3.239.0) |
| `boot-harness.js` | 4 OK, 0 échec |
| `hero-creation-harness.js` | 44 OK, 0 échec |
| `node --check` sur les 145 JS | OK |
| Parcours de 21 écrans dans Chromium | 0 erreur JS, 0 image cassée, **0 chemin affiché en texte** |

**Aucun fichier protégé modifié.** `save-system.js`, `combat-engine.js`, `stats-system.js`, `progression-system.js`, `game-loop.js`, `class-combat-system.js`, `dungeon-system.js`, `adventure-quest-system.js`, `hunt-quest-system.js` et `world-quest-system.js` sont intacts.

## Ce que contient la version

**182 icônes** en PNG 128 × 128 RGBA, découpées de tes 9 planches, réparties en 15 dossiers sous `images/Icons/` : `system` (28) · `combat_status` (16) · `subtabs` (17) · `scene` (24) · `quests` (21) · `plots` (12) · `workshops` (12) · `village_buildings` (8) · `equipment_slots` (9) · `codex` (7) · `dungeon` (7) · `afflictions` (6) · `combat_stats` (5) · `classes` (5) · `camp` (3).

`mapping_icones.csv` donne, pour chaque asset, sa planche d'origine, sa position, son chemin final, l'emoji remplacé et son usage.

**~600 remplacements** répartis en trois familles : champs `icon:` des données (qui passaient déjà par `renderIconOrEmojiHTML`), conversions de sites qui rendaient l'icône via `esc()`, et emoji écrits en dur dans les chaînes HTML des vues.

**Nouvelle texture** `images/UI/textures/bg-moss-stone.png` (fournie), déjà référencée par `css/00-kbtn.css` — remplacement de fichier, sans changement de code.

## Modifications de comportement

Trois seulement, toutes minimes :

1. **`kframe-decorator.js`** accepte une icône dans le titre de cadre, au format `"chemin.png|Libellé"`. Sans barre verticale, le comportement est inchangé (texte pur). 12 lignes.
2. **`utils.js`** — `renderIconOrEmojiHTML()` n'écrit plus le libellé dans l'attribut `alt`. Ces icônes sont décoratives, et un `alt` non vide s'affichait en travers de l'écran dès qu'une image tardait à charger.
3. **`camp-view.js`** — le nom de la ration, qui ne vivait que dans cet `alt`, passe en `title` sur la carte. Sans ça, l'information disparaissait du DOM (c'est le harnais qui l'a signalé).

## Nouveau fichier CSS

`css/99-icon-assets.css`, chargé en dernier dans `index.html` et ajouté au précache de `sw.js`. Il ne fait que dimensionner les `<img>` qui remplacent les emoji — aucune règle existante n'est modifiée ni surchargée. Il contient aussi trois correctifs de lisibilité : titres des Afflictions et de l'Ascension forcés en `#3a2c1a`, compteurs des Hauts faits assombris pour la nouvelle texture, et un filet global `img { font-size: 0 }` qui empêche tout texte de repli d'apparaître si une image échoue.

## Harnais

`round-harness.js` : 10 assertions mises à jour. Elles testaient des chaînes littérales contenant les emoji remplacés (« 📖 Grimoire », « ▶ Continuer », `data-kf-title="🌾 Production"`…). Elles vérifient désormais le marqueur stable — libellé texte ou chemin d'asset. Le total est inchangé : 1742.

## Bugs corrigés en cours de route

- **Chemins affichés en texte dans l'écran Parcelles** : l'icône était concaténée dans le champ `label`, lui-même rendu par `esc()`. Elle vit maintenant dans un champ `iconHTML` distinct.
- **Chemin affiché en texte sur le slot d'équipement vide sélectionné** : `esc(emoji)` dans la branche `else` du panneau de détail.
- **Cinq autres concaténations du même type** : carte du monde, classe à la confirmation de création, résumé d'atelier, et deux toasts d'attaque spéciale qui affichaient le chemin dans la bulle.
- **Balise `<img>` dans une `<option>`** du Grimoire, ignorée par les navigateurs : le marqueur de contre est redevenu un caractère.
- **Huit fallbacks imbriqués** (`renderIconOrEmojiHTML(x || "<img …>")`) ramenés à un chemin nu.

Un test de non-régression couvre désormais cette famille : il parcourt 21 écrans et cherche, dans tous les nœuds texte du document, la moindre occurrence de `images/Icons`, `<img` ou `.png`.

## Ce qui reste en emoji, volontairement

- **39 fallbacks d'ennemis** (`enemies.js`) : toutes les créatures ont leur image, ces emoji ne sortent qu'en rendu dégradé.
- **5 icônes d'outils de dev** : Admin, Atelier UI, Atelier Cadres, Budgets duel, Monte-Carlo.
- **199 occurrences dans les logs et toasts** : `log-view.js` rend avec `esc()` et `toast.js` avec `textContent`. Du texte pur par construction — leur faire accepter du HTML ouvrirait une surface d'injection sur des chaînes contenant des noms d'objets générés.
- **La flèche `→`** : typographie dans des phrases (« Personnage → Stats »), pas une icône.

## Points ouverts pour la suite

1. **Contraste général sur la texture parchemin.** Elle est nettement plus claire que la mousse verte ; tout ce qui était en doré clair ou blanc cassé perd en lisibilité. À traiter dans ta refonte d'UI, écran par écran.
2. **Slots d'équipement** : les assets portent leur propre bezel bronze, qui se superpose au `.rframe`. À trancher côté asset plutôt que côté CSS.
3. **`enemy_approaching`** : seul badge de combat sur fond clair, casse l'homogénéité de la colonne.
4. **Quatre inversions possibles** : `shield_incoming`/`shield_active`, `silence_incoming`/`silenced`, `quest_in_progress`, `stat_critical`.
5. **Quatre substitutions par défaut** sur les emoji polysémiques : 🔥 → feu de camp partout (discutable pour la Fonderie et la brûlure arcanique), ✨ → découverte, 🎯 → rose des vents, 📖 → lore générique pour Codex, Journal et Grimoire.

## Avant publication

Le delta ne contient que les fichiers modifiés. Le test iPhone réel reste à faire : les vérifications viennent de Chromium headless, pas de Safari iOS.
