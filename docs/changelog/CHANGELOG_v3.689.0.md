# v3.689.0 — Combat : aide à la décision et bugs (audit du 04/11, lot I3)

En Grimoire, la potion se touche à tout moment et part au tour du héros. La vitesse se règle aussi en Tactique. Après une défaite de quête, l'astuce « ressource pleine » s'affiche enfin au Campement. Plusieurs textes faux sont corrigés (attaque de base, Esquive, recharges, rapport de combat). Aucun chiffre d'équilibrage changé.

- **COMB-3** : en Grimoire, le bouton de potion n'est plus grisé hors du tour du héros. Mesuré dans Chromium à 390 px : actif 61 relevés sur 61, contre 32 à 33 % avant. Touchée hors du tour, la potion est mise en attente (anneau doré, message « Potion bue à ton prochain tour ») puis bue au tour suivant. Un second toucher annule l'attente. `js/ui/combat-screen-view.js`, `css/03-combat-screen.css`.
- **COMB-19** : en Tactique, la potion est grisée au tour d'un compagnon (avant, le toucher était refusé sans rien dire). `js/ui/combat-screen-view.js`.
- **COMB-4** : la ressource de classe est relevée au moment de la mort. Après une défaite de quête en Tactique avec la ressource pleine, l'astuce TUT-5 s'affiche sous « Tu es à terre » au Campement, une seule fois. Rien n'est relevé si le Seuil ou la Fiole noire relèvent le héros. `js/ui/combat-report-view.js`, `js/ui/camp-view.js`.
- **COMB-6** : la confirmation de fuite devant l'élite d'un secteur libéré et non protégé ajoute « Le Recouvrement reprendra Arbre-mère. » Avec un frein de Palissade, la phrase devient « peut reprendre ». Elle n'apparaît pas sur une carte « rien n'est repris » ni sur un secteur pas encore libéré. La règle v3.366 ne change pas. `js/systems/living-map-system.js` (`fleeRegressionNote`), `js/ui/combat-view.js`.
- **COMB-10** : rapport de combat.
  - Une compétence à contre ne compte « raté » que si une annonce (charge, bouclier, soin, silence, exaltation) est active et n'est pas contrée.
  - Le « DPS moyen » mesuré à l'horloge murale devient « dégâts par round » : les rounds sont comptés au rapport.
  - Fichiers : `js/systems/class-combat-system.js`, `js/systems/combat-report-system.js`, `js/ui/combat-report-view.js`, `js/systems/combat-engine.js` **(protégé, une ligne dans `beginRound`)**.
- **COMB-11** : pastille de vitesse (x1, x2, x4) dans la barre du haut en Tactique aussi, à côté de « Continuer ». La vitesse accélérait déjà les répliques en Tactique, sans réglage visible. Aucun fichier protégé touché. À 320 px, toute la barre tient (aucun défilement horizontal) et le titre de la quête passe sur deux lignes. `js/ui/combat-screen-view.js`, `js/ui/combat-speed-view.js` (commentaire).
- **COMB-12** : le défilement des dés de l'initiative dure 650 ms ÷ vitesse, comme le premier pas (1 s ÷ vitesse) : le premier coup ne tombe plus pendant les dés. `js/ui/combat-screen-view.js`.
- **COMB-13** : la « règle de contre prioritaire » du Grimoire est maintenant une vraie règle de contre. Sa condition doit être contrée par l'action, soit par une annonce (`counters`), soit par le trait que visent ses effets (Blindé, Enragé, Corrompu, Vampirique, comme en v3.443.1). « PV bas → Frappe lourde » ou « Frappe 2 fois → Brise-garde » ne retirent plus la technique du repli et ne réservent plus de ressource. Règle nommée : « réserve de la règle de contre prioritaire » (`shouldActivateGrimoireReserve`, changelog v3.443.1). `js/systems/combat-auto-policy-system.js`, `js/systems/class-combat-system.js` (export de `ARCHETYPE_EFFECT_TO_CONDITION_ID`).
- **COMB-14** : l'attaque de base du Rôdeur et celle du Mage affichent « Inflige 100% des dégâts », comme leur `damageMultiplier` (avant : 85 % et 70 %). `js/data/class-skills.js`, `js/lang/en.js`.
- **COMB-15** : nouvelle description de l'Esquive : « Contre la charge annoncée. Sinon, 70% de chances d'éviter chaque frappe ennemie pendant 1 round. » La mécanique est en tout ou rien. `js/data/class-skills.js`, `js/lang/en.js`.
- **COMB-16** : un renfort qui arrive n'est plus marqué « Sonné » face au Chevalier (`renfort.charged = false`). Seuls le libellé et le journal changent : le compteur d'arrivée reste à 1 round. `js/systems/combat-engine.js` **(protégé, une ligne)**.
- **COMB-17** : la puce « Deux frappes ! » et l'arrêt de « Continuer l'attaque » ne se déclenchent plus pendant l'approche, puisque l'ennemi n'y frappe pas. La condition du Grimoire « jauge pleine » ne change pas (décision v3.524). `js/systems/combat-engine.js` **(protégé, une ligne dans `enemyDoubleStrikeDangerous`)**.
- **COMB-18** : chaque condition du Grimoire a un libellé court (« Charge », « Deux frappes », « Allié blessé »…) pour la ligne de la règle jouée. Le libellé complet reste en infobulle. Mesuré dans Chromium : 0 libellé coupé sur 17, à 390 comme à 320 px (avant : 6 coupés à 390 px, 15 à 320 px). `js/data/grimoire-conditions.js`, `js/lang/data-fields.js`, `js/ui/combat-screen-view.js`.
- **COMB-20** : la recharge des capacités est affichée en rounds d'attente (N − 1). Le décompte tombe en fin de round, donc « recharge 1 » se rejoue au round suivant : la fiche affiche « Sans recharge ». `js/ui/heros-view.js`, `js/ui/heros-screens-view.js`.
- **COMB-21** : une ressource de classe abîmée dans une sauvegarde (texte, absente, non finie) est remise à 0 au lieu de rester bloquée. `js/systems/class-combat-system.js`.
- **COMB-22** : la Chitine du Dard apparaît dans « À gagner » de la préparation (« Chitine des profondeurs +1 », Chitine fendue comprise) et dans le panneau du secteur (« Butin de l'élite : »). La lecture est réunie dans `LivingMapManager.getEliteWinResource`, déjà utilisée à la victoire (même résultat). `js/systems/living-map-system.js`, `js/ui/sortie-prep-view.js`, `js/ui/living-map-view.js`.
- `js/lang/en.js` : 16 textes nouveaux et 4 remplacés, traduits. « Quoi de neuf » : une ligne.
- `tools/harness/round-harness.js` [454] : 31 contrôles. [260] : texte de l'attaque de base du Rôdeur mis à jour.

Vérifié dans Chromium à 390×844 et 320×568 :
- barre du haut en Tactique (5 éléments, aucun défilement horizontal, x1 → x2 au toucher) ;
- potion en Grimoire (attente puis bue : 120 → 236 PV) ;
- astuce au Campement (346×114 px à 390, 276×133 px à 320) ;
- « À gagner » du Dard ;
- aucune erreur, aucune icône manquante.

Laissés :
- COMB-1 et COMB-23 : repli du Grimoire et conseil doré sans Défense, puis campagne par classe. Décision de Seb.
- COMB-2 : « Varier » qui saute un contre, ajustement de l'option B de v3.653. Décision de Seb.
- COMB-5 (= SAVE-9) : ennemi gardé au rechargement. Décision de Seb.
- COMB-7 : ressource de classe coupée à 320 px. UI transversale, atelier d'abord.
- COMB-8 : célérité ennemie sans plafond. Il faudrait une nouvelle courbe d'équilibrage, l'accord de Seb et un banc des donjons 4 à 6 ; aucune règle écrite ne l'applique aux ennemis.
- COMB-9 : pronostic d'un héros sans arme (poids des potions). Recalibrage au banc, à décider : aucune règle écrite n'est contredite.

Contrôles : `node --check` sur chaque JS modifié ; round 6 357 OK, 0 échec (2 passes) ; boot 4 OK ; création 44 OK ; i18n 8 454 textes, 100 %, 0 orphelin ; parcours 212 OK. Aucun fichier ajouté. Fichier protégé touché : `combat-engine.js` (3 lignes : COMB-10, COMB-16, COMB-17).
