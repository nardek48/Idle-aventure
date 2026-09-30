# Aethervale v3.401.0 — Lot O-1 : onglets

Choix de Seb dans l'atelier des onglets : **S1 · Rail** pour les onglets de page, sous-onglets **en bas** (P1), **bulles remontées**, **pastilles** pour les filtres.

## Correctif : les bulles du HUD ne cachent plus les sous-onglets
Depuis la v3.396.0, les bulles (fil rouge, talents, sac) recouvraient le 3ᵉ sous-onglet du bas : Production dans Village, Talents dans Héros, Codex dans le Bestiaire. Elles remontent maintenant au-dessus de la barre des sous-onglets quand l'écran en a une (`liftHudDock`, js/ui/hud-dock-view.js ; variable `--hud-dock-lift` dans css/02-layout.css). Sur les autres écrans, rien ne change.

## Onglets de page : le rail (`.kseg`, css/00-components.css)
Une fente creusée dans le parchemin ; l'onglet actif est une pièce d'or posée dedans. Un seul dessin partout :
- Quêtes (Histoire / Secondaires / Chasse / Aventure) : l'icône passe au-dessus du libellé (`.kseg.is-stack`), et « Secondaires » tient enfin en entier ;
- Entrepôt (Bruts / Tier 1 / Rares) ;
- Production | Ateliers (auparavant les gros boutons dorés des sous-onglets) ;
- Équipé / Sac / Boutique ;
- Grimoire (Tactique / Grimoire) ;
- Compagnons, Patrouilles, fiche de l'Enchanteresse (Relance / Éclats), réglages Tôt / Normal / Tard : même rail, maintenant dessiné pour le parchemin (plus d'adaptation par écran).
Pastille rouge d'un onglet : `.kseg-dot` ; compteur : `.kseg-count`.

## Filtres : les pastilles (`.kchips`)
Un filtre trie la liste sans changer de page :
- Inventaire (Tout / Équipement / Potions) ;
- Hauts faits (Forêt / Désert / Grimoire / Village / Compagnons…) : les pastilles défilent, avec le bord droit estompé.
Pastille active en brun foncé, les autres en crème.

## Inchangé
Barre du bas et sous-onglets du bas (Village / Entrepôt / Production, Résumé / Équipement / Talents, Bestiaire / Codex) : même dessin, même place.

## Nettoyage
CSS retiré : `.qb-tab` et son image de fond, `.inv-filter-row/-btn`, `.hf-tabs/.hf-tab/.hf-dot`, `.grimoire-mode` (dessin), `.kframe .kseg-in-frame`, `.vb-sheet-seg` (adaptation crème).

## Vérifications
round-harness 3603 OK, 0 échec (x2), nouvelle section [174] · boot 4 · création 44 · parcours 139 · campagne 38/38 · i18n 3699, 100 %, 0 orphelin. Aucun fichier protégé modifié. Aucun nouveau fichier de jeu.
