# v3.604.0 — Ce matin à Aeswyn : les événements du village

Étape 2 des jours du monde. Seb a validé E1 le 31/10, avec la maquette `atelier/evenements-village.html`. Les textes sont intégrés avant relecture (accord de Seb) et sont dans l'atelier des textes, groupe « Village · événements ».

## Le principe
- À l'aube qui suit une nuit (`WorldDays.nightfall`), un événement peut arriver au village :
  - une chance sur deux s'il n'y en a pas déjà un ;
  - jamais deux fois de suite le même type ;
  - seulement une fois le village ouvert.
- Il dure **2 jours de jeu**, soit environ 6 sorties. Un seul événement à la fois.
- Banc (`tools/sim/nuits-bench.js`, 3 000 nuits) : un événement est en cours **67 % des jours**, les quatre types à parts égales (23 à 27 %).
- **24 événements**, 6 par type :

| Type | Ce qu'il fait |
|---|---|
| **Rumeur de Taverne** | Un lieu d'expédition de la carte vivante (monde de résidence) donne **+50 % de butin** et **+2 de la ressource rare** à sa destination. Marqué sur la carte (pastille en haut à droite) et dans le volet du secteur. |
| **Demande d'un ancien** (Brannoc, Orwen, Aldric) | Livrer une ressource. Quantité : le haut d'un contrat de Taverne, × 1 à 3,5 selon le monde. Paie **1,5 fois un contrat de Taverne**, plus le cadeau de l'ancien (Lingots, Planches, Pain, rations, Blocs taillés). Banc : en Forêt, 330 à 792 or ; à la Montagne, 990 à 2 376 or. |
| **Marché de Sarkel** (Halle construite) | L'échoppe a **une pièce de plus** et **−20 %** sur les prix, le temps du marché. |
| **Fête** | Coûte du pain (6 × le monde). Le camp **soigne tout le monde**, puis les **3 sorties suivantes** rapportent **+25 % d'or** (le farm libre ne compte pas). |

- **Aucun bonus de production** : elle tourne en temps réel, et un bonus en jours de jeu durerait toute l'absence du joueur.
- La fête donne de l'or plutôt que de l'expérience, comme montré dans l'atelier : l'expérience des sorties est trop faible pour qu'un bonus se sente.

## L'affichage (atelier)
- **En tête du Village**, une carte « Ce matin à Aeswyn » : l'événement, qui le propose, sa phrase, les jours qui restent, le coût ou le gain, et un bouton (Voir sur la carte, Livrer, Aller à l'échoppe, Lancer la fête).
- **Sur l'écran de la nuit**, la ligne « Au matin » sous ce que la nuit a fait.
- **Pastille « ! » sur l'onglet Village** quand une demande peut être livrée ou une fête lancée.
- Icônes : `images/Icons/village_events/event_*.webp`, prompts dans l'atelier des images. L'icône générique s'affiche en attendant, sans emprunt.
- Écran de la nuit : « La nuit tombe. » n'est plus répété ; la nuit calme dit « Rien n'a bougé autour du camp. »

## Fichiers
- **Fichiers ajoutés**, dans `index.html` et le précache de `sw.js` :
  - `js/data/village-events.js` : les événements et leurs réglages ;
  - `js/systems/village-event-system.js` : `VillageEvents` ;
  - `js/ui/village-event-view.js` : la carte, la ligne « Au matin », la pastille.
- État dans `explorationProgression` (`villageEvent`, `villageFete`), déjà sauvegardé : **aucun changement de `save-system.js`**.
- `js/systems/world-day-system.js` : tirage à l'aube.
- `js/systems/pa2-run.js` : la rumeur. `js/systems/sortie-system.js` : la fête. `js/systems/equip-shop-system.js` : le marché.
- `js/ui/village-view.js`, `js/ui/camp-view.js`, `js/ui/hud-dock-view.js`, `js/ui/living-map-view.js`.
- `css/04-panel-village.css`, `css/04-panel-camp.css`, `css/04-panel-living-map.css`, `js/lang/en.js` (66 textes), `js/ui/news-view.js` (une ligne « Quoi de neuf »).
- `tools/sim/nuits-bench.js` : relevé des événements.
- Aucun fichier protégé touché.

## Contrôles
- `round-harness` : 5 704 OK, 0 échec, sur deux passes. Nouvelle section [400] : tirage, demande, fête, marché, rumeur, fin, sauvegarde.
- `boot-harness` : 4 OK. `hero-creation-harness` : 44 OK. `parcours-harness` : 142 OK.
- Audit i18n : 100 %.
- Captures sous Chromium à 390 × 844 : carte d'une demande, écran de la nuit avec « Au matin ».
