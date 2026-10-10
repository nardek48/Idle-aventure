# Pistes : ressenti des combats (ouvert le 2026-10-10, v3.438.1)

Retour de Seb : combats « bien mais il manque un petit quelque chose », « un peu plats et courts ».
Rien n'est décidé : options en attente de validation.

## Constat, retour visuel (`js/ui/combat-screen-view.js`)
- Présent : chiffres flottants (critique, brûlure, soin, bloqué), flash de coup, secousse au critique,
  écrasement sur charge, tampons (soin, silence, corruption), annonces ennemies, vibrations.
- Absent : aucun son dans le jeu ; mort d'ennemi = simple fondu gris de 0,6 s (`.cbx-foe.is-dead`) ;
  aucun geste de l'attaquant (seule la cible réagit), le moteur ne dit pas qui frappe.

## Pistes visuelles (chiffrées le 2026-10-10)
- A. Coup de grâce : arrêt sur image ~80 ms, flash, éclatement CSS, or et XP qui s'envolent. ~1 session, aucun fichier protégé.
- B. Gestes d'attaque : la carte avance quand elle frappe, l'ennemi bondit. 1 à 2 sessions, savoir qui agit (moteur protégé ?).
- C. Sons Web Audio synthétisés + réglage. 2 sessions, nouveau fichier JS + état sauvegardé (`save-system.js` protégé).
- Ordre recommandé : A, puis B, puis C. Prototype dans `atelier/` d'abord.

## Constat, durée et tension (campagne-lot --combats --n 2, 6 parties, 36 h simulées)
- Round = 1,5 s à x1 (`ROUND_INTERVAL_MS`, `combat-engine.js`).
- Combats normaux : médiane 2 à 3 rounds (p90 3 à 7), soit 3 à 4,5 s à x1 ; PV perdus médians ≈ 0 %.
- Boss : 6 à 21 rounds, 15 à 45 % de PV perdus : là, la tension existe.
- Les charges ennemies arrivent après 3 à 5 rounds (`ENEMY_CHARGE_ROUNDS_MIN/MAX`) : un ennemi normal
  meurt presque toujours AVANT de jouer son coup spécial. Cause probable du côté « plat ».
- Attention : le soin au camp pèse déjà 9 à 14 h sur 36 h. Augmenter les dégâts ennemis allonge ce temps mort.

## Rations et temps au camp (vérifié le 2026-10-10)
- Au Campement, `CampManager.eatRation` rend `healPct` des PV max (Petite ration 35 %), fabriquée à la Cuisine de camp.
- La campagne simulée (`tools/sim/campagne-harness.js`, `healUp`) ne mange JAMAIS de ration au camp : elle attend
  la régénération naturelle. Les rations ne sont fabriquées que si une sortie l'exige, et mangées seulement en expédition.
  Le chiffre « soin au camp 9 à 14 h » est donc pessimiste.
- Idée de Seb : la Forêt reste comme aujourd'hui ; l'annonce avancée des ennemis normaux arrive plus tard,
  quand les rations sont plus simples à produire. Il existe déjà des seuils par monde (`*_MIN_WORLD_INDEX`).

## Robot recalé : repas au camp (2026-10-10)
- `campagne-harness.js` : `mangerAuCamp()` dans `healUp`. Au-delà de 20 % de PV manquants, le robot mange la plus
  grosse ration qui ne déborde pas trop (réserve de 1 par type pour les vivres) et cuisine avec le stock présent.
  `--attendre-camp` rend l'ancien comportement.
- Lot `--combats --n 2` (6 parties), avant → après :
  temps total médian 36 → 35 h ; soin au camp 9,4 → 5,4 h ; carte : lendemain 6,1 → 8,5 h ; combat 0,9 h.
  Rations au camp : 19 à 52 Petites rations mangées par partie, 2,5 à 6 h d'attente évitées.
- Lecture : le temps gagné au camp est repris par l'attente du lendemain sur la carte (plafond du jour) et par la
  production. La durée de campagne est tenue par ces rythmes journaliers, pas par le soin.

## v3.439.0 livrée : premier coup spécial avancé hors Forêt
- Désert : 72 % des combats normaux voient un coup spécial (22 % avant), Ruines 59 % (34 %). PV perdus, durée et morts stables.
- Limite : le coup spécial REMPLACE la frappe (charge ×1,3, bouclier et silence sans dégâts), donc pas plus de danger.
  Si les combats restent plats en jeu : pistes visuelles A/B/C ci-dessus, ou rendre la charge plus punitive.

## Idée de Seb (2026-10-10) : la préparation de sortie
- Avant chaque sortie (pas avant chaque combat) : le mode (figé ensuite), les potions, peut-être des objets,
  le rôle des compagnons. Concentrer là les réglages aujourd'hui éparpillés.
- Existant vérifié : les règles du Grimoire sont déjà figées pendant une sortie ; les potions à bonus sont déjà
  « par sortie » ; la besace des Petites Aventures existe (Armure de voyage, Fiole noire servent en combat).
- Rôles : Wenna soutien, Edda finisseuse (fixes) ; Maddoc a deux voies (Devant/garde, Derrière/assaut),
  changement payant ×3 (décision D4b, close). Un choix gratuit à la sortie rouvrirait cette décision.
- Options proposées : A = préparation avec les réglages existants déplacés ; B = A + voie de Maddoc à la sortie ;
  C = vrais rôles au choix pour chaque compagnon (nouvelles compétences). Recommandé : A.
