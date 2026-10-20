# Aethervale v3.456.9 — « Crypte des dormeurs » et Taverne 6

Décisions de Seb du 20/10/2026 : les recommandations sont retenues.

## Le monde change de nom
- « Crypte oubliée » devient **« Crypte des dormeurs »** (EN *Crypt of Sleepers*). L'ancien nom faisait doublon avec le Désert oublié, et le nouveau dit ce qui fait la Crypte : les morts qui dorment.
- L'identifiant `crypt` ne change pas : les sauvegardes ne sont pas touchées.
- Fichiers concernés :
  - `worlds.js` et `living-maps.js` (le nom affiché) ;
  - `hunt-quests.js` (le monde des deux Cires) ;
  - deux commentaires (`world-caps.js`, `achievements.js`) ;
  - `en.js`.

## Taverne 6, à l'acte III de la Crypte
- La Taverne passe à **6 niveaux**. Le niveau 6 donne **7 contrats à la fois**, et chaque contrat paie **15 % de plus**.
- Il coûte **9 000 or, 60 blocs, 40 lingots et 2 Cire consacrée**. La Cire consacrée ne se coule qu'à partir de l'acte III, ce qui garde ce niveau pour l'acte III.
- Le plafond de la Crypte passe de 5 à 6.
- Fichiers concernés :
  - `village-buildings.js` (le palier de coût et la description du niveau) ;
  - `world-caps.js` ;
  - `tavern-contracts.js` (`TAVERN_LEVEL6_BONUS`) ;
  - `tavern-system.js` (le bonus de 15 %) ;
  - `en.js` (1 texte).
- Harnais : le contrôle « 5 niveaux » passe à 6 niveaux, avec 7 contrats au niveau 6. Résultat : 4 451 OK, 0 échec.

Aucun fichier protégé n'a été touché et aucun fichier n'a été ajouté.
