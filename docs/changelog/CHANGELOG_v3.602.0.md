# v3.602.0 — Les jours du monde

Chantier « jours de jeu ». Seb a validé le 31/10 :
- **J2** : une nuit toutes les 3 sorties ;
- **B** : la nuit vivante ;
- dans l'atelier `atelier/jours-du-monde.html`, le jour **sur le bandeau** et la nuit **en plein écran**.

C'est une première version, qui évoluera. La production et les plafonds quotidiens restent en temps réel (décision du 30/10).

## Les jours
- Une nuit tombe toutes les **3 sorties terminées** : Petite Aventure, parcours, élite de carte, donjon, quête. Le farm libre ne compte pas.
- Aucune nuit ne passe quand le joueur est absent.
- Le jour vit dans `game.explorationProgression.worldDay`, déjà sauvegardé en entier : **aucun changement de `save-system.js`**.

## Ce que fait une nuit, sur la carte du monde où vit le héros
- **Forêt, Désert** : une chance de reprendre **un** secteur libéré de l'anneau le plus lointain (3, puis 2), jamais un secteur tenu par la Palissade, ni l'élite rejouable, ni celui qu'on vient de jouer. Le frein de la Palissade s'applique d'abord, puis la chance de base de 50 %. On le reprend par une Petite Aventure, sans nouvelle récompense de première libération.
- **Ruines** : le quartier rebâti par la ville change à chaque nuit, et non plus à minuit.
- **Crypte, Montagne** : rien n'est repris (règle de ces mondes).
- **Les autres mondes ne bougent pas.**
- Passent en jours de jeu :
  - le quartier rebâti des Ruines ;
  - « le réveil » et « la coulée » (un secteur raté reste hostile jusqu'au lendemain) ;
  - la chaleur des veines ;
  - le frein des élites rejouables.
- Le revenu quotidien de la cité finie reste en jour réel.
- Tutoriel des Ruines : erreur factuelle corrigée (« à minuit » devient « à chaque nuit »).

## L'affichage (atelier : B, plein écran)
- **Bandeau du Camp**, en bas à droite (visible même replié) : « ☾ Jour 34 » et trois lunes, une par sortie.
- **Plein écran** au premier retour au Camp après la nuit : « Jour 35 », le monde, « La nuit tombe. », ce qui a été repris (ou « La Palissade a tenu »), puis « Au matin ».
- Jusqu'à la sortie suivante, le bandeau s'assombrit et « Ce soir au camp » devient « Cette nuit », avec ce qui a été repris et par où revenir.
- Fiche d'une élite rejouable : « Le frein retombe à la nuit, dans N sorties ».

## Banc
`tools/sim/nuits-bench.js` (nouveau), sur le vrai moteur, carte entièrement libérée, 3 000 nuits :

| Palissade | Secteurs repris par nuit | Sorties passées à reprendre |
|---|---|---|
| 0 | 0,50 | 17 % |
| 3 | 0,40 | 13 % |
| 5 | 0,32 à 0,33 | 11 % |
| 7 | 0,25 | 8 à 9 % |
| 10 | 0 | 0 % (tout est tenu) |

Résultats identiques en Forêt et au Désert. À juger en jeu.

## Fichiers
- **Fichier ajouté**, dans `index.html` et le précache de `sw.js` : `js/systems/world-day-system.js`.
- `js/systems/sortie-system.js` : `WorldDays.onSortieEnd`.
- `js/systems/living-map-system.js` : `_dayKey` et `_dayDiff`.
- `js/ui/screen-banner.js` : pastille du jour.
- `js/ui/camp-view.js` : écran de la nuit, carte « Cette nuit ».
- `js/ui/living-map-view.js` : texte du frein des élites.
- `css/00-kbtn.css`, `css/04-panel-camp.css`, `js/lang/en.js`, `js/ui/news-view.js` (une ligne « Quoi de neuf »), `js/data/story-quests.js` (tutoriel).
- Aucun fichier protégé touché.

## Contrôles
- `round-harness` : 5 684 OK, 0 échec, sur deux passes. Nouvelle section [399] ; les sections [60c] et [343] suivent le jour de jeu.
- `boot-harness` : 4 OK. `hero-creation-harness` : 44 OK. `parcours-harness` : 142 OK.
- Audit i18n : 100 %.
- Captures sous Chromium à 390 × 844 : bandeau, écran de la nuit, carte « Cette nuit ».
