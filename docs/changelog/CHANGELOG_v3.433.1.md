# Aethervale v3.433.1 — Images du chapitre III des Ruines

Les dix images générées par Seb le 09/10/2026, sur les prompts du document « Ruines, chapitre III : prompts des images ». S'applique sur la v3.433.0.

## Images en jeu
| Image | Fichier | Traitement |
| --- | --- | --- |
| Le Bâtisseur | `images/Enemies/batisseur.jpg` | 400 × 400 |
| Le Contremaître | `images/Enemies/elite_contremaitre.jpg` | 400 × 400 |
| Le Golem | `images/Enemies/elite_golem.jpg` | 400 × 400 |
| Varrek, le Garde scellé | `images/Boss/varrek.jpg` | 400 × 400 |
| Le Maître d'œuvre | `images/Boss/maitre_oeuvre.jpg` | 400 × 400 |
| Statut « se relève » | `images/Icons/combat_status/rising.png` | 128 × 128, transparent |
| Quête du Contremaître | `images/Icons/quest_icons/elite/elite_contremaitre.png` | 400 × 400, fond noir détouré |
| Quête du Golem (et étape 14) | `images/Icons/quest_icons/elite/elite_golem.png` | 400 × 400, fond noir détouré |
| Clé de voûte | `images/Icons/resources/cle_de_voute_icon.png` | 400 × 400, fond noir détouré (première version ; la seconde avait un damier peint) |
| Fond « Vers le Cœur » | `images/Maps/parcours/vers_le_coeur.jpg` | 1024 × 1536 |

`missing-icons.js` : **aucune image absente**.

## Le parcours « Vers le Cœur » a son fond
- Nouveau fond `vers_le_coeur` dans `PA2_PARCOURS_IMAGES` (`data/pa2-maps.js`). La piste est relevée au pixel sur le trait violet du chemin, de la porte basse à l'arche.
- Les cinq paliers tombent sur les lieux peints :
  1. la rue qui tourne ;
  2. la place aux ossements (les deux squelettes) ;
  3. la brèche du mur (le Veilleur ouvre le mur) ;
  4. les toits aux gargouilles ;
  5. l'arche du Cœur.
- `data/scene-templates.js` : le parcours quitte la route des Ruines provisoire.

## Décisions du 09/10 dans le code
Commentaires seulement, aucun chiffre ne change :
- `data/worlds.js` : la référence de héros des Ruines (`joueurDesert2`) est gardée ;
- `data/world-caps.js` : pas de 3ᵉ rangée de zones aux Ruines.

## Code
- Données : `pa2-maps.js`, `scene-templates.js`, commentaires de `worlds.js`, `world-caps.js`, `ui/caravan-view.js`.
- **Aucun fichier protégé touché. Aucun fichier JS ou CSS ajouté** : les dix images ne sont pas précachées (comme toutes les images du jeu).

## Contrôles
- Round : **4 058 OK**, 0 échec, sur deux passes. Boot : 4 OK. Création du héros : 44 OK.
- Parcours : **139 OK**, 0 échec.
- i18n : 4 446 textes, 100 %, 0 orphelin.
- Chromium (390 × 844), vrai jeu : « Vers le Cœur » s'ouvre sur son fond, les nœuds sur le chemin, console sans erreur.
- `node --check` sur tous les fichiers modifiés.
