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

## Idée de Seb (2026-10-10) : l'initiative pour tous
- Aujourd'hui (`combat-engine.js`) : héros, puis compagnons (`alliesTurn`), puis ennemis (`enemiesTurn`, triés par
  célérité dans un groupe). La célérité remplit une jauge qui donne une frappe en plus (héros et ennemis).
- Les annonces sont pensées pour cet ordre : annonce au round N, impact au round N+1, l'équipe joue entre les deux
  pour contrer. Un ennemi plus rapide que le héros frapperait avant le contre : il faudrait revoir cette lecture.
- Touché : moteur (protégé), mode Manuel (choix de tous les alliés puis riposte), pronostic (CombatForecast),
  combats résolus des Petites Aventures, bancs, sens de la célérité (classe Rôdeur).
- Avis : gros chantier, à faire APRÈS la préparation de sortie. Variante légère : afficher l'ordre des tours.

## Décisions de Seb (2026-10-10) : préparation de sortie, option A
- Préparation par SORTIE (chasse, quête, donjon, élite de carte), jamais par combat.
- Mode verrouillé complètement pendant la sortie (pas de « reprendre la main ») : gagner de la place.
- Objets de combat : plus tard, discussion à part.
- Atelier : `atelier/preparation-sortie.html`. Mesure : sans la rangée du mode, la scène gagne 41 px (Tactique et Grimoire) ;
  « Continuer » et la vitesse passent en pastille dans la barre du haut.
- Trouvé en passant : `images/Icons/combat_status/target.png` (réglage Cible du Grimoire) n'existe pas, et
  `missing-icons.js` ne le voit pas (attribut src sans guillemets).

## v3.440.0 livrée : préparation de sortie
- Feuille avant chasse, quête, donjon, élite de carte ; mode figé ; rangée du mode retirée (+41 px de scène).
- Réglages déplacés des onglets vers la feuille. Pas de « Comme la dernière fois » (réglages déjà persistants).
- Restent ouverts : objets de combat (à discuter), effets de combat A/B/C, initiative.
- À revoir en jeu (Seb) : bouton « Comme la dernière fois » (mémoriser les potions à bonus) ; fond sombre façon Petites Aventures.

## Objets de combat — décisions de Seb (2026-10-10)
1. Rôle : B, répondre aux traits ennemis (Blindé, Bouclier, Enragé, Corrupteur, Vampirique, Silence), avec un ou deux
   objets à contrepartie (C, façon besace des Petites Aventures).
   Contrainte : les objets AIDENT, ils ne sont jamais requis. Sans objet, l'équilibrage reste celui d'aujourd'hui :
   aucun ennemi n'est durci pour les rendre nécessaires.
2. Places : 1 au départ, 2 plus tard ; la 2e s'ouvre par un niveau d'atelier au village (le joueur la gagne par la production).
3. Consommation : objets contre les traits consommés à la fin de la sortie (servi ou non) ; seule la Fiole noire est rendue si elle n'a pas servi.
4. Provenance : l'Apothicaire (préparations de combat, recette gagnée par commande, apparition avec le monde) ;
   comptées dans la capacité par jour ; la 2e place s'ouvre au niveau 4 de l'Apothicaire.
5. Puissance : le même contre qu'une règle du Grimoire, posé automatiquement (et reposé quand il retombe), sans
   compétence ni round. Premier lot : Huile de lame (Blindé), Baume froid (Enragé), Encens amer (Corrupteur),
   Sel de fer (Vampirique), Fiole noire (à contrepartie, touche combat-engine.js). Bouclier et Silence : second lot.
   Passif dans les deux modes. Tant que l'objet tient le trait, la condition du Grimoire correspondante est fausse
   (combat-auto-policy-system.js) : pas de compétence gaspillée, le conseil Tactique ne le propose plus.
6. Prix : option B (décision Seb), le double d'une potion à bonus, pour consommer la production. Recette dès le monde du trait.
   Baume froid (Enragé, Forêt) 8 Eau purifiée + 12 Blé, commande 80 Blé + 30 Eau purifiée ;
   Encens amer (Corrupteur, Forêt) 8 Eau purifiée + 12 Bois, commande 80 Bois + 30 Eau purifiée ;
   Huile de lame (Blindé, Désert) 10 Eau purifiée + 8 Fer, commande 60 Fer + 50 Eau purifiée ;
   Fiole noire (chute, Désert) 12 Eau purifiée + 2 Chitine, commande 6 Chitine + 60 Eau purifiée ;
   Sel de fer (Vampirique, Ruines) 12 Eau purifiée + 4 Lingots, commande 24 Lingots + 60 Eau purifiée.
   Chiffres de départ, recalés au banc (charge sur la production).
- Atelier : `atelier/objets-combat.html` (préparation : case Objet + « Ce que tu vas affronter » avec règle / objet / rien ;
  panneau Potions : préparations de combat ; combat : trait « contré » marqué de l'objet).
- Images en double signalées à Seb : Viande et Viande séchée (meat_icon.png), Eau et Eau purifiée (water_icon.png).

## v3.441.0 livrée : objets de combat, lot 1
- Baume froid, Encens amer, Huile de lame, Sel de fer. Mesure dans le changelog : le Baume froid est le plus fort
  (Cité début d'acte III 20→48 % au Chevalier), l'Huile pèse peu dans la Cité. Sans objet : inchangé.
- Reste : lot 2 (Fiole noire, combat-engine.js, accord de Seb), puis Bouclier et Silence ; icônes à dessiner.
