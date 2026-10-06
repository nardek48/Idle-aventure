# Aethervale v3.428.3 — La relève : achever est une décision

Option A, validée par Seb le 04/10/2026. Ce delta s'applique sur la v3.428.2.

## La règle
Un ennemi à terre n'est achevé que par une **décision** :
- **en Tactique**, ton coup (ATTAQUER ou une technique) ;
- **en Grimoire**, la règle « Un ennemi se relève » ;
- un ennemi **touché au doigt** ;
- **Le dernier trait d'Edda** ;
- un compagnon joué à la main (Manuel).

Sans décision, le Grimoire et les autres compagnons ne le frappent pas, et il se relève avec 50 % de ses PV. Le journal l'écrit : « X est à terre : personne ne l'achève. »

Conséquence : **seul face au héros**, en Grimoire, un squelette ou un zombie se relève maintenant vraiment, sauf si la règle est posée. Avant, le héros l'achevait d'office.

## Tutoriel « La relève »
Sa dernière ligne devient : « En Grimoire, ton héros n'achève pas seul un ennemi à terre : pose la règle « Un ennemi se relève ». »

## Mesures (banc de l'acte I, 20 runs, sans potion)

| Étape | Sans la règle | Avec la règle |
| --- | --- | --- |
| 2 | 31 à 42 % de PV perdus, tous les morts-vivants se relèvent | 30 à 40 % |
| 3 (Edda achève) | 33 à 42 % | 34 à 55 % |

- Sans la règle, tout reste dans la cible de 30 à 45 % : rien n'est réglé à nouveau.
- Avec la règle, le Chevalier perd 55 % à l'étape 3. Le banc pose la règle sur sa première technique : il la dépense sur un ennemi à 1 PV qu'Edda aurait achevé.
- Campagne complète (robot, trois classes) : le chapitre 3 se termine, sans mur.

## Code
- `rise-system.js` : nouvelles fonctions `beginAction` et `blocksHit`.
- `combat-engine.js` (accord de Seb) : une ligne en tête de `dealDamage`, une ligne dans `heroAction`.
- `companion-system.js` : un compagnon n'achève que sur ordre. Le Tir ajusté n'est plus gaspillé sur un ennemi à terre.

## Contrôles
- Round : 3 925 OK, 0 échec.
- Parcours : 139 OK. Boot : 4 OK.
- i18n : 3 999 textes, 100 %.
