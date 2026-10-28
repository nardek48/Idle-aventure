# v3.524.0 — « Deux frappes ! » qui compte (audit, COM-6)

Décision de Seb (« Puce + arrêt »), avec son accord pour une retouche minimale de `combat-engine.js`, fichier protégé. Le diff a été relu sous deux angles, chaque constat soumis à une vérification adverse ; les 4 défauts confirmés qui portent sur la nouvelle règle sont corrigés.

## Le constat (mesuré à niveau juste, 18 247 arrêts du héros)
- La puce s'allumait à chaque jauge ennemie pleine : 20 % des rounds.
- Une seconde frappe ne suivait que 62 % des fois. Au niveau juste, les deux frappes réelles prenaient moins de 10 % des PV dans la moitié des cas.
- « Continuer l'attaque » s'arrêtait à chaque fois.

## La règle
- La puce « Deux frappes ! » et l'arrêt de « Continuer l'attaque » ne se déclenchent que si les deux frappes prévues font au moins **20 % des PV actuels** du héros.
- Une charge ou un silence annoncés remplacent la frappe : pas de puce en plus. Sous Clairvoyance, l'annonce attend et la puce revient.
- Calcul de la frappe, comme le moteur :
  - puissance, Fléau, dégâts de boss, chaleur des veines, défense plafonnée à 0,6 ;
  - rage du moment, et rage triplée si l'exaltation annoncée tombe avant la frappe ;
  - tri de la Montagne : la première frappe ×1,5 (×1,2 avec le Leurre de cendre) si le tri vise le héros.
- Mesure de la règle : la puce passe de 20 % à environ 9 % des rounds au niveau juste, en gardant 97 % des vrais dangers et 97 % des morts. Les dangers retirés sont presque tous des charges, déjà annoncées par « Il charge ! ».
- La condition du Grimoire « jauge pleine » (enemyAttackIncoming) ne change pas.

## Correctifs de la revue
- L'exaltation annoncée tombe avant la frappe : la rage triplée est comptée. Elle n'est plus comptée au dernier round d'exaltation.
- Le tri de la Montagne est compté sur la première frappe.
- Un bouclier ou un soin annoncés ne retirent plus la puce : contrés, la double frappe revient.
- Harnais : l'arrêt de « Continuer l'attaque » est testé à PV pleins, pour que seule la double frappe joue.

## Code
- `systems/combat-engine.js` (protégé, accord de Seb) :
  - `DOUBLE_STRIKE_DANGER_PCT = 0,20` ;
  - `enemyDoubleStrikeDangerous` ;
  - une ligne dans `shouldStopContinueAttack`.
- `ui/combat-screen-view.js` : la puce suit la même règle.
- Harnais [344].
- Aucun fichier ajouté.

## Contrôles
- Round : 5 328 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6 583 textes, 100 %, 0 orphelin.

## Signalé à Seb, non changé (antérieur au lot)
- Pendant l'approche, la plongée du Wyrm ou quand l'ennemi est à terre, la puce peut s'allumer alors qu'il ne frappera pas ce tour.
- La double frappe d'un autre membre du groupe que la cible n'est ni annoncée ni ne stoppe « Continuer l'attaque ».
- Corriger l'un ou l'autre demande une nouvelle retouche du fichier protégé.
