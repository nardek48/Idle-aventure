# Aethervale v3.429.2 — Correctifs : donjon des Ruines, « Décider »

Deux bugs remontés par Seb. S'applique sur la v3.429.1.

## Le donjon des Ruines ne s'ouvre plus à l'arrivée
- Cause : le Sanctuaire scellé (donjon 3) était déclaré ouvert (`locked: false`). Il s'ouvrait dès l'arrivée aux Ruines si la Cité engloutie était terminée.
- Correctif : `locked: true`, comme la Cité avant le lot W-4. Il n'a encore ni pool, ni élites, ni boss calibré. Il s'ouvrira avec l'acte III (porte du Sanctuaire), par une étape d'Histoire (`requiresStoryStep`).
- La carte du donjon affiche : « Le Sanctuaire est encore scellé. »

## « Décider » mène au choix
- Cause : un choix d'étape (« Décider de ce qui reste du roi », « Décider de la pierre de seuil ») ne se fait que sur la carte d'étape de Quêtes › Histoire. La carte du Campement n'avait aucun bouton, et le fil rouge ouvrait Quêtes sans passer sur Histoire.
- Correctif : tant qu'un choix attend, la mission d'Histoire porte un bouton **« Décider »** qui ouvre Quêtes › Histoire. C'est vrai au Campement, au tableau des quêtes et dans le fil rouge.

## Code
- `js/data/dungeon.js` : donjon 3 verrouillé, avec un `lockedHint`.
- `js/systems/mission-board-system.js` : action et libellé (`launchLabel`) pour un choix en attente.
- `js/ui/camp-view.js`, `js/ui/quests-view.js` : le bouton lit `launchLabel` quand la mission en porte un.
- `js/lang/en.js` : une traduction.
- Aucun fichier protégé touché. Aucun fichier ajouté.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur deux passages. Nouvelle section [205] (6 contrôles).
- Boot : 4 OK. Création du héros : 44 OK.
- i18n : 4 184 textes, 100 %, 0 orphelin.
- `node --check` sur tous les fichiers modifiés.
