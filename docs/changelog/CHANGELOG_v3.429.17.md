# Aethervale v3.429.17 — Carte d'expédition : le nœud jouable reçoit toujours le toucher

Point relevé en jouant la troisième heure (option A, validée par Seb). S'applique sur la v3.429.16.

## Le constat, mesuré au cadrage normal (390×844)
- Tous les nœuds de la carte étaient au même niveau d'empilement (`z-index: 2`). Quand deux nœuds se chevauchent, l'ordre d'écriture de la page décidait qui recevait le toucher.
- Cas vécu en jeu (carte `foret_2`) : la vignette de la Clairière aux lanternes recouvrait à 49 % la Trouvaille N10, le dernier nœud à franchir. Un toucher au centre du nœud ne faisait rien.
- Autres chevauchements calculés sur les 5 cartes :
  - `foret_1` : C4/C5 à 44 %.
  - `foret_2` : C5/C6 à 32 %.
  - `ruines_2` : R6 et le Tertre à 23 %.

## Le correctif
- `.pa2-node.is-open { z-index: 3 }` : un nœud jouable passe devant ses voisins, sur toutes les cartes, y compris les futures. Les positions des cartes ne changent pas.
- Mesuré dans Chromium (`foret_2`, N10 placé sous la Clairière dans le pire ordre d'affichage) : 49 % caché avant, 0 % après.

## Correction d'un relevé précédent
- Le « nœud suivant caché sous le bandeau au seuil » (bilan de l'heure 3, point 4) n'est pas un défaut. Le relevé avait été fait après un zoom à la molette. Au cadrage normal, un glissé fait descendre la carte de 124 px, et toute la rangée du haut passe sous le bandeau. Rien n'est modifié.

## Code
- `css/04-panel-pa2.css` : une règle.
- Aucun fichier protégé touché. Aucun fichier ajouté.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages. Boot : 4 OK. Création du héros : 44 OK.
- `node --check` sur `constants.js` et `sw.js`.
