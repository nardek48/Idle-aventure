# Aethervale — CHANGELOG v3.10.0

Base : v3.9.0. Trois ajustements demandés + intégration d'un nouveau pool
d'icônes de quêtes (`icone_quêtes.zip`).

## 1. Icônes de combat agrandies

`css/03-combat.css` : `.combat-action-btn` — le CSS fourni contenait un
`clamp(70px, calc(24px + 7vw), 58px)` invalide (la borne min de 70px est
supérieure à la borne max de 58px ; par définition de `clamp()`, une telle
règle s'évalue TOUJOURS à la valeur max, donc le "70px" n'aurait jamais eu
d'effet visuel). Appliqué dans l'esprit de la demande ("icônes plus
gros") en portant le PLAFOND à 70px au lieu du plancher :
`clamp(48px, calc(24px + 7vw), 70px)`. Confirmé visuellement, les icônes
sont nettement plus grandes qu'avant.

## 2. Icône du sac (HUD) — ajustements

`css/02-layout.css` : `.nb-hud-bag-btn`/`.nb-hud-bag-icon` mis à jour
selon le CSS fourni tel quel — fond crème et bordure dorée retirés
(bouton devenu icône pure), icône agrandie (20px → 30px, remplit
maintenant tout le bouton), alignement `flex-end` (calé à droite) au lieu
de centré.

## 3. Icônes de quêtes — nouveau pool illustré

Reçu 18 icônes réparties en 5 thèmes (`icone_quêtes.zip`) — dossiers
renommés en anglais (même convention que `special_attacks`), organisées
dans `images/Icons/quest_icons/{catégorie}/` :

| Dossier | Contenu | Usage |
|---|---|---|
| `chapter_end/` | 2 icônes (bannière crâne) | **Câblé** : les 4 questlines de déblocage de monde (L'Appel des Ruines, etc.) |
| `exploration/` | 3 icônes (clé+cadenas, longue-vue, sphère armillaire) | **Câblé** : Éclaireur (longue-vue) et Prouver sa valeur/Expédition (clé+cadenas) |
| `resource/` | 7 icônes (enclume+lingots, etc.) | **Câblé** : Minerai des profondeurs (enclume+lingots) — 6 autres en réserve |
| `elite/` | 4 icônes (œil de dragon) | En réserve — pas encore de quête de type Traque/mini-boss dans le jeu |
| `escort/` | 2 icônes (forteresse) | En réserve — pas encore de quête de type Escorte dans le jeu |

**Quêtes mises à jour concrètement** (`data/adventure-quests.js`,
`data/world-quests.js`) :
- Éclaireur de la Lisière : 🏹 → longue-vue + carte étoilée (thème repérage)
- Prouver sa valeur : 🧭 → clé + cadenas (thème déblocage de passage)
- Minerai des profondeurs : ⛏️ → enclume + lingots (thème minerai/forge)
- Les 4 questlines de monde (Ruines/Crypte/Montagne/Tour) : 🏛️/⚰️/🗻/🗼 →
  bannière crâne, alternée entre les 2 variantes fournies (Ruines/Crypte
  sur la 1ère, Montagne/Tour sur la 2e)

Le reste du pool (elite, escort, 6 resource restantes, exploration4)
reste organisé sur le disque mais non câblé — prêt à être pioché quand
les types de quêtes correspondants (Traque, Escorte...) seront construits,
comme demandé.

**Bug corrigé au passage** : 3 endroits dans `ui/quests-view.js`
(`buildWorldUnlockQuestSectionHTML`, `buildAdventureQuestIntroHTML`,
`buildAdventureQuestsSectionHTML`) injectaient `quest.icon` comme texte
brut (`esc(quest.icon)`) au lieu de passer par `renderIconOrEmojiHTML()`
— sans ce correctif, les nouveaux champs `icon` (chemins d'image) se
seraient affichés en toutes lettres au lieu de rendre l'image. Les 3
corrigés ; nouvelle classe CSS `.map-quest-icon-img` ajoutée dans
`css/06-map.css` (`.dungeon-story-icon-img` existait déjà, réutilisée
telle quelle pour la fenêtre narrative).

## Tests effectués

- `node --check` sur tous les fichiers JS touchés.
- Re-passage des 4 harnais de non-régression (v3.1/v3.2/v3.3 + le harnais
  armes/résistances de v3.8-3.9) : aucune régression.
- Playwright (rendu réel, 390×844) : icônes de combat confirmées plus
  grandes visuellement ; icône du sac confirmée (armure+épée, capture
  avec contexte après qu'un premier essai de capture isolée sur fond
  transparent ait semblé vide) ; onglet Quêtes confirmé avec la bannière
  crâne sur "L'Appel des Ruines" et la longue-vue sur "Éclaireur de la
  Lisière" ; fenêtre narrative de lancement de quête confirmée avec la
  bonne icône (clé+cadenas pour Prouver sa valeur). Aucune erreur console,
  aucun 404.

## Fichiers modifiés

- `css/02-layout.css`
- `css/03-combat.css`
- `css/06-map.css`
- `js/data/adventure-quests.js`
- `js/data/world-quests.js`
- `js/ui/quests-view.js`
- `sw.js` (`CACHE_VERSION` → `"3.10.0"`)

## Nouvelles images

- `images/Icons/quest_icons/chapter_end/chapter_end{1,2}.png`
- `images/Icons/quest_icons/exploration/exploration{1,3,4}.png`
- `images/Icons/quest_icons/resource/resource{1..7}.png`
- `images/Icons/quest_icons/elite/elite{1..4}.png`
- `images/Icons/quest_icons/escort/escort{1,2}.png`
