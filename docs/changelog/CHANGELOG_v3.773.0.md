# v3.773.0 — Images de Seb : 32 images intégrées (12/11/2026)

32 images de Seb (6 planches), rattachées à leurs fiches de l'atelier « Images à générer » (chemins et formats de la page), découpées, réduites et converties en WebP. Les 32 sont cochées dans l'atelier. Images : jamais précachées, rien à ajouter à `index.html` ni à `sw.js`.

## Icônes absentes (18 sur 19)
- **Petites Aventures :**
  - objets de quête : crochet, gaffe, cheville, pince, cale ;
  - marques : carnier (cache), cadenas, indice, passage secret ;
  - fins cachées : Forêt, Désert, Crypte ;
  - fins de la Tour : gardien du palier, citerne haute, porte murée.
- **Autres :** Forge des mondes, pièces d'équipement de la Forge, compétences des compagnons.
- **Reste à générer :** `scene/dest/dest_tower_cachee.webp` (« Le palier en trop »), icône générique en attendant.
- **Fins cachées de la Forêt, du Désert et de la Crypte (accord de Seb) :** anneau de bronze ajouté autour du dessin, au profil de celui des médaillons de la Tour.

## Doubles usages remplacés (14 images, 18 lignes)
- **Donjon :**
  - `dungeon/dungeon_camp` : en-tête de la fiche du campement, « En sûreté au campement », conseils d'Ossuaire et de Gueule ;
  - `dungeon/dungeon_exit` : choix « Sortir » et son conseil.
- **Camp, Petites Aventures et compagnons :** `camp/rest` (bouton Repos de la préparation), `scene/pa2_camp` (case de campement des Petites Aventures), `companions/companions_pick` (3 conseils sur le choix des compagnons).
- **Grimoire :** `system/rules_unlock` et `system/grimoire_fallback` (fiche d'aide), `system/special_effect` (verdict « Effet spécial »).
- **Écrans et fenêtres :**
  - `system/found_in_world` (« Trouvé en… ») ;
  - `plots/plot_zones` (quête des 3 zones) ;
  - `system/confirm` (fenêtres de confirmation) ;
  - `system/stock` (stock des potions et objets) ;
  - `system/objective` (objectif de la Chronique) ;
  - `quests/quests_title` (titre de la page Quêtes).
- **Fichier protégé `js/data/story-quests.js` (accord de Seb, 12/11) :** 7 chemins d'image, rien d'autre.
- Le feu de camp (`camp/campfire.webp`) ne sert plus qu'au Campement.

## Écarts signalés (gardés)
- Le crochet est attaché à une corde (le texte dit « un bout de chaîne »).
- La cale a l'air de métal (le texte dit « de pierre »).

## Contrôles
- `round-harness` 7304 OK, 0 échec, sur 2 passes : [490] suit la nouvelle icône de la fiche du Grimoire.
- boot 4 OK ; parcours complet 239 OK ; i18n sans texte en dur ; `missing-icons` : 1 absente (le palier en trop).
- Quoi de neuf : une ligne (FR + EN).
