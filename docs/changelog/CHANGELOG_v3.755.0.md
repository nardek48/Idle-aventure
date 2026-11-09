# v3.755.0 — Donjons : « Objectif tenu », sortir ou continuer (audit A, DIF-1 ; Seb 09/11, option A) — lot Alpha, point 7

Constat (audit d'équilibrage A, DIF-1) : à la Tanière (forest_13, 5 vagues sous une Marque) et à la Cité engloutie (desert_12, vague 5), l'objectif de l'Histoire est tenu en plein run, mais le run file vers le Basilic ou le Sphinx. Le joueur peut y tomber pour rien. Les donjons suivants ont déjà un campement à la vague de leur objectif.

Décision de Seb : la pause « Objectif tenu », sortie avec tout le butin (comme au campement).

- `js/systems/dungeon-system.js` (fichier protégé, accord de Seb le 09/11) :
  - au départ, `storyReady0` note les étapes déjà tenues (`storyReadyIds`) ;
  - après chaque vague (`onEnemyKilled`, après le campement, avant les haltes), `reachObjective` : si une étape de l'Histoire vient d'être tenue pendant ce run, la vague suivante attend derrière une feuille (`objective = "pending"`). Une fois par run. Les compteurs de victoires sont relus à ce moment (`_trackKills`) et l'objectif est lu au seuil de la vague suivante (« passer la vague 5 » se vérifie à la vague 6) ;
  - `objectiveAction("sortir")` termine la sortie comme au campement (`outcome "objectif"` : sac rendu en entier, or du campement, pas la moitié de la fuite) ; `"continuer"` reprend ;
  - un run rechargé à la pause rouvre la feuille ; un run d'avant la mise à jour (sans `storyReady0`) n'a pas de pause.
- `js/ui/dungeon-view.js` : feuille « Objectif tenu » (l'étape nommée, « Sortir, butin gardé », « Continuer ») dans `dungeon-modal-root`, donc le combat attend ; texte du rapport de fin ; au campement des donjons suivants, une ligne « Objectif de l'Histoire tenu : « … ». Tu peux sortir. ».
- `css/04-panel-dungeon.css` : `.dobj-tenu`, `.dobj-txt`.
- Image : la feuille reprend `quests/quest_story.webp` (l'icône des étapes d'Histoire, même sens ; déjà parmi les doubles usages signalés).
- Quoi de neuf : une ligne (FR + EN).
- `tools/harness/round-harness.js` : section [508] (Cité : pause après la vague 5, Continuer, une fois par run, Sortir comme au campement, rejeu sans pause, ancien run sans pause ; Tanière sous Marque : pause après la vague 5).

Équilibrage : rien ne change (le robot de campagne sort déjà à l'objectif depuis le 09/11). Une partie de robot Rôdeur jusqu'à desert_13 : 32 OK, aucun blocage.

Contrôles : round-harness 7 274 OK, 0 échec (×2) ; boot 4 OK ; création du héros 44 OK ; i18n 8 958 textes, 100 % ; parcours 235 OK. Feuille vue dans Chromium à 390 px.
