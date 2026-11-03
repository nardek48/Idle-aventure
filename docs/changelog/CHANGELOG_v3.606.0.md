# v3.606.0 — L'artisan d'Aeswyn, et Sarkel qui rachète

Chantier « évolution du village ». Seb a validé A (en W1), D1 et D2 le 31/10. B (un village qui grandit) reste à cadrer plus tard.

## A — L'artisan d'Aeswyn (W1 : recettes dans les ateliers existants)
Les versions gratuites de la besace ne changent pas. Le village fabrique des versions meilleures, prises dans l'Entrepôt au départ d'une Petite Aventure.

| Objet | Atelier | Recette | Effet |
|---|---|---|---|
| **Corde tressée** | Scierie fine | 30 Bois + 1 Planche, 6 s | 2 usages (la corde gratuite : 1) |
| **Trousse de maître** | Forge (Mine) | 2 Lingots, 8 s | 3 crochets (la trousse gratuite : 2) |
| **Torche résinée** | Menuiserie | 1 Résine durcie + 10 Bois, 9 s | une rangée de plus et les pièges cachés, **sans** le +15 % de dégâts reçus de la torche |

- La version fabriquée s'ajoute à l'objet qu'elle remplace : une corde et une corde tressée font 3 usages.
- Les usages gratuits servent d'abord. On rend chaque unité fabriquée dont tous les usages restent. La torche résinée brûle pendant la sortie : elle n'est jamais rendue.
- On ne peut pas emporter deux torches.
- La besace ne montre une version fabriquée que si l'Entrepôt en a.
- La torche résinée passe par la Résine durcie, donc par la Sève d'Aeswyn : un débouché de plus pour la ressource rare de la Forêt.
- Coûts à juger en jeu : environ 3 % de l'Entrepôt de la Forêt pour une corde.

## D — Débouchés
- **D1** : l'Outre pleine affichait déjà « Besace des Petites Aventures » depuis la v3.520, la remarque de la feuille de route était périmée. Les trois objets fabriqués l'affichent aussi.
- **D2, Sarkel rachète** les ressources rares pendant son marché (l'événement de village), par lots de 5, au plus 10 lots par marché.
  - Prix : le quart de l'or d'une Petite Aventure du monde, par unité rapportée.
  - Banc `pa2-bench`, anneau Chemin, 80 runs. En Forêt, une Petite Aventure rapporte 284 or et 3,15 unités ; au Désert 510 ; aux Ruines 941 ; à la Crypte 1 609 ; environ 3 unités à chaque fois.

| Ressource | Prix de rachat (par unité) |
|---|---|
| Sève d'Aeswyn | 20 or |
| Verre des dunes | 40 or |
| Pierre errante | 80 or |
| Cire de sépulcre | 130 or |
| Cendre vive | 220 or (prolongée) |

- La fiche de l'Entrepôt de ces ressources dit « Marché de Sarkel : il la rachète par lots de 5 ».

## Fichiers
- `js/data/hunt-quests.js` : 3 ressources fabriquées. `js/data/workshops.js` : 3 recettes. `js/data/pa2-content.js` : `corde_t`, `trousse_t`, `torche_t` (champ `as`).
- `js/systems/pa2-run.js` : `hasItem` reconnaît les versions fabriquées ; le stock les cumule ; la torche résinée n'attire pas les coups ; remboursement par unité intacte.
- `js/ui/pa2-view.js` : la besace cache une version fabriquée absente de l'Entrepôt.
- `js/data/village-events.js`, `js/systems/village-event-system.js` (`buybackList`, `sellLot`), `js/ui/village-event-view.js` : le rachat.
- `js/ui/warehouse-view.js` : la ligne du rachat.
- `css/04-panel-village.css`, `js/lang/en.js`, `js/ui/news-view.js` (une ligne « Quoi de neuf »).
- Icônes des trois objets à générer (atelier des images) ; l'icône générique s'affiche en attendant.
- Aucun fichier ajouté. Aucun fichier protégé touché.

## Contrôles
- `round-harness` : 5 723 OK, 0 échec, sur deux passes. Nouvelle section [402] ; les sections [159] (icônes à fournir) et [281] (ordre de la besace) suivent.
- `boot-harness` : 4 OK. `hero-creation-harness` : 44 OK. `parcours-harness` : 142 OK.
- Audit i18n : 100 %.
- Captures sous Chromium à 390 × 844 : carte du marché avec le rachat, besace.
