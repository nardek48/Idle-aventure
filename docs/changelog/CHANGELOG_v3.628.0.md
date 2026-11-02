# v3.628.0 — Tour, lot T-2b : la fin de l'acte II « Les étages »

Seconde moitié du lot T-2 (étapes 8 à 10, textes validés par Seb). Après l'étape 10 : « La suite de l'histoire arrive bientôt… ».

## Les trois étapes
8. **Ceux qui dorment debout** : l'étage des gisants, quatre rencontres avec les morts de la Crypte (écho de la Crypte par ses ennemis), `aq_tour_gisants`. Récompense : une pièce Légendaire (comble d'abord un emplacement vide ou plus faible).
9. **La veine du dedans** : vaincre l'élite des étages, **le Gardien qui répète** (secteur « La veine du dedans »). Récompense : une pièce Légendaire.
10. **Les feuillets** : le palier Légendaire de l'acte II, **3 pièces Légendaires** de tout monde (TW7). Tutoriel « Le palier Légendaire ». À la fin de l'étape, une fiche s'ouvre au Codex : **« Les feuillets de la Tour »** (voix du Veilleur ; texte à relire dans l'atelier des textes).

## Le Gardien qui répète
- Élite répétable (base Gardien, blindé, escorte d'un gardien), réglages repris du Vieux Golem.
- Légendaire de la Tour à 35 % par victoire ; la 3e victoire sans pièce en donne une.
- Image à générer (déjà dans « Images à générer ») : vrai chemin gardé, icône générique en attendant.
- Sa règle « qui répète » (le miroir) viendra avec le Sommet interdit (lot T-3).

## Équilibrage
Campagne au robot (`--combats --joueur`), trois classes : 112 contrôles, 0 échec. PV restants en fin de quête (avec le réglage ×2,5 / ×6) :

| Quête | Chevalier | Rôdeur | Mage |
| --- | --- | --- | --- |
| Le pied de la Tour | 38 % | 84 % | 60 % |
| L'étage du sable | 70 % | 72 % | 78 % |
| L'étage des gisants | 90 % | 100 % | 78 % |

Le palier Légendaire se boucle vite (0,1 à 0,2 h simulée) grâce aux deux pièces offertes : l'acte II est court et plutôt facile. À juger en jeu.

## Code
- `data/story-quests.js` : `tour_08` à `tour_10`, `STORY_PALIER_TOUR`, récompenses.
- `data/elites.js` : `gardien_qui_repete`. `data/living-maps.js` : il garde « La veine du dedans ».
- `data/adventure-quests.js` : `aq_tour_gisants`. `data/codex.js` : `feuillets_tour`.
- `lang/en.js` : 31 textes. Aucun fichier protégé touché, aucun fichier ajouté.

## Outils
- `round-harness.js` : [423] ; [422] mis à jour.
- `campagne-harness.js` : gestes `tour_08` à `tour_10` ; le Légendaire se cherche sur le Gardien qui répète.
