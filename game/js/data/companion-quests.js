"use strict";
/* data/companion-quests.js — v3.598.0 (chantier « parler avec les compagnons », 14 quêtes validées par Seb le 31/10) :
   les quêtes personnelles. Les déroulés et les textes viennent de l'atelier des textes, une fois validés. */

/* Une quête : id, companion, title, blurb, relic (clé de COMPANION_RELIC_UNIQUES), steps.
   Une conversation la débloque (companion-talks.js, unlocks: { quest: id, title }). Types d'étape :
   - deliver : { res: { eau: 10 } }, ressources données depuis l'Entrepôt ;
   - run : { world: "desert", count: 1 }, Petites Aventures ou parcours réussis dans ce monde, le compagnon dans l'équipe ;
   - elite : { world: "desert", count: 1 }, élites de la carte vivante de ce monde vaincues, le compagnon dans l'équipe ;
   - scene : { lines: [...] }, une scène au format des conversations.
   Chaque étape a un label (ce qu'il faut faire). La relique est donnée à la fin de la dernière étape. */
/* v3.599.0 : les 14 quêtes, intégrées avant relecture (accord de Seb du 31/10). Quantités : environ 10 % de
   l'Entrepôt du monde, à juger en jeu. */
function companionQuestsData() {
  return [
    { id: "q_wenna_1", companion: "wenna", relic: "wenna_pousse", title: _t("La graine du Clos"),
      blurb: _t("Wenna veut faire pousser une graine du Clos au milieu du sable."),
      steps: [
        { type: "deliver", label: _t("Rapporter de l'eau pour la graine"), res: { eau: 150 } },
        { type: "run", label: _t("Trouver de la terre noire : une Petite Aventure du Désert"), world: "desert", count: 1 },
        { type: "scene", label: _t("Planter la graine près du puits"), lines: [
          { w: "n", t: _t("Wenna creuse au pied du puits, avec ses mains. Elle verse l'eau doucement, comme on fait boire un malade.") },
          { w: "wenna", t: _t("Maintenant, on attend.") },
          { w: "n", t: _t("Au matin, une pousse verte sort du sable.") },
          { w: "wenna", t: _t("Je savais.") }] }] },
    { id: "q_wenna_2", companion: "wenna", relic: "wenna_ruban", title: _t("La nuit du feu"),
      blurb: _t("Wenna veut laisser les noms des disparus d'Aeswyn là où l'on garde ceux qu'on n'oublie pas."),
      steps: [
        { type: "scene", label: _t("Raconter cette nuit à Wenna"), lines: [
          { w: "wenna", t: _t("Raconte-moi ce que tu as vu. Même les petites choses.") },
          { w: "n", t: _t("Tu racontes les flammes. Elle écrit tout sur une bande de toile, très serré.") },
          { w: "wenna", t: _t("C'est peu. C'est déjà plus que rien.") }] },
        { type: "deliver", label: _t("Apporter du pain et du bois pour la crypte"), res: { pain: 10, bois: 200 } },
        { type: "run", label: _t("Descendre jusqu'à une alcôve sans nom : une Petite Aventure de la Crypte"), world: "crypt", count: 1 },
        { type: "scene", label: _t("Lire les noms"), lines: [
          { w: "n", t: _t("Devant l'alcôve sans nom, Wenna déroule la toile. Elle lit les noms qu'elle a retrouvés, un par un.") },
          { w: "wenna", t: _t("Il en manque un. Personne au camp ne s'en souvient.") },
          { w: "n", t: _t("Elle pose la toile dans l'alcôve, avec une tranche de pain. Elle garde la dernière bande et la noue en ruban.") },
          { w: "wenna", t: _t("Pour quand je l'oublierai.") }] }] },
    { id: "q_wenna_3", companion: "wenna", relic: "wenna_braise", title: _t("Ce qu'elle fera après"),
      blurb: _t("Wenna veut rapporter au camp un feu qui ne s'éteint pas."),
      steps: [
        { type: "elite", label: _t("Prendre une braise vive : vaincre une élite de la Montagne"), world: "mountain", count: 1 },
        { type: "deliver", label: _t("Apporter de quoi bâtir un foyer de pierre"), res: { fer: 300, pierre: 300 } },
        { type: "scene", label: _t("Allumer le foyer au camp"), lines: [
          { w: "n", t: _t("Au camp d'Aeswyn, Wenna pose la braise au fond du foyer neuf. Orwen la regarde faire et ne dit rien.") },
          { w: "wenna", t: _t("Le feu de cette nuit-là, je ne l'ai pas choisi. Celui-là, oui.") },
          { w: "n", t: _t("Le foyer prend. Il tiendra tout l'hiver.") }] }] },
    { id: "q_maddoc_1", companion: "maddoc", relic: "maddoc_pierre", title: _t("Ce qu'il reste de l'autre côté"),
      blurb: _t("Maddoc veut revoir le puits de son village, de l'autre côté du gouffre."),
      steps: [
        { type: "run", label: _t("Traverser jusqu'au village de Maddoc : deux Petites Aventures du Désert"), world: "desert", count: 2 },
        { type: "elite", label: _t("Chasser ce qui s'est installé au puits : vaincre une élite du Désert"), world: "desert", count: 1 },
        { type: "scene", label: _t("Le puits"), lines: [
          { w: "n", t: _t("Le puits est là. Sur la margelle, deux noms gravés à la pointe d'un couteau.") },
          { w: "n", t: _t("L'un est vieux. L'autre est récent.") },
          { w: "maddoc", t: _t("Il est passé ici. Après.") },
          { w: "n", t: _t("Maddoc ramasse une pierre percée au fond du seau, et la garde.") }] }] },
    { id: "q_maddoc_2", companion: "maddoc", relic: "maddoc_couteau", title: _t("La trace du frère"),
      blurb: _t("Le nom du frère de Maddoc est gravé sur un mur des Ruines."),
      steps: [
        { type: "scene", label: _t("Montrer le nom à Edda"), lines: [
          { w: "edda", t: _t("Je l'ai déjà vu. Gravé pareil, la barre du milieu trop longue. Sur un mur, à l'est.") },
          { w: "maddoc", t: _t("Quand ?") },
          { w: "edda", t: _t("Le quartier n'est là qu'une nuit sur trois. Je te dirai.") }] },
        { type: "run", label: _t("Aller au quartier du mur : une Petite Aventure des Ruines"), world: "ruins", count: 1 },
        { type: "elite", label: _t("Ce qui s'est relevé dans le quartier : vaincre une élite des Ruines"), world: "ruins", count: 1 },
        { type: "scene", label: _t("Le mur"), lines: [
          { w: "n", t: _t("Sous le nom, une flèche gravée qui montre le nord-est. La montagne.") },
          { w: "n", t: _t("Au pied du mur, un couteau court, le manche entouré d'un cordon rouge.") },
          { w: "maddoc", t: _t("C'est le sien. Je l'ai affûté cent fois.") }] }] },
    { id: "q_maddoc_3", companion: "maddoc", relic: "maddoc_noms", title: _t("Le retrouver"),
      blurb: _t("La flèche gravée montrait la montagne. Maddoc monte."),
      steps: [
        { type: "scene", label: _t("Maddoc veut monter seul"), lines: [
          { w: "maddoc", t: _t("Je monte seul.") },
          { w: "n", t: _t("Tu prends ton sac. Il te regarde, puis il regarde sa jambe.") },
          { w: "maddoc", t: _t("Bon. Pas seul.") }] },
        { type: "run", label: _t("Monter jusqu'au camp des tailleurs : deux Petites Aventures de la Montagne"), world: "mountain", count: 2 },
        { type: "scene", label: _t("Le frère"), lines: [
          { w: "n", t: _t("Plus haut, un abri de pierre. Un homme taille une pierre, seul. Il a les gestes de Maddoc.") },
          { w: "n", t: _t("Ils ne disent pas grand-chose. Le frère ne redescendra pas. Il a trouvé une pierre qui ne ment pas.") },
          { choix: [
            { t: _t("Insister pour qu'il redescende."), suite: [{ w: "maddoc", t: _t("Laisse. Il a choisi, comme moi.") }] },
            { t: _t("Le laisser à sa pierre."), suite: [{ w: "maddoc", t: _t("Merci. Je n'aurais pas su le dire.") }] }] },
          { w: "n", t: _t("Avant de partir, ils gravent leurs deux noms côte à côte, sur la même pierre.") },
          { w: "maddoc", t: _t("Il est vivant. C'est assez. C'est plus qu'assez.") }] }] },
    { id: "q_edda_1", companion: "edda", relic: "edda_craie", title: _t("La carte qui ne se finit pas"),
      blurb: _t("Edda veut que sa carte des Ruines tienne une nuit entière."),
      steps: [
        { type: "deliver", label: _t("Apporter de la pierre pour les repères d'Edda"), res: { pierre: 250 } },
        { type: "run", label: _t("Relever trois quartiers : trois Petites Aventures des Ruines"), world: "ruins", count: 3 },
        { type: "scene", label: _t("Une nuit entière"), lines: [
          { w: "n", t: _t("Le matin, Edda déplie sa carte. Elle la compare à la ville, rue par rue.") },
          { w: "edda", t: _t("Elle a tenu. Toute une nuit.") },
          { w: "n", t: _t("Sa craie est toujours aussi longue qu'hier. Elle la regarde, puis la range.") },
          { w: "edda", t: _t("Elle ne s'use plus. Je ne veux pas savoir pourquoi.") }] }] },
    { id: "q_edda_2", companion: "edda", relic: "edda_carte", title: _t("Cartographier les dormeurs"),
      blurb: _t("Edda dessine la Crypte couloir par couloir, avec ceux qui y dorment."),
      steps: [
        { type: "run", label: _t("Passer près des dormeurs : deux Petites Aventures de la Crypte"), world: "crypt", count: 2 },
        { type: "elite", label: _t("Un dormeur s'est levé : vaincre une élite de la Crypte"), world: "crypt", count: 1 },
        { type: "scene", label: _t("La carte finie"), lines: [
          { w: "n", t: _t("Edda trace le dernier couloir, et une petite marque dans chaque alcôve.") },
          { w: "edda", t: _t("Sur cette carte-là, rien ne bouge. C'est presque reposant.") },
          { w: "n", t: _t("Elle ajoute une alcôve vide, à la taille de quelqu'un. Elle ne dit pas qui.") }] }] },
    { id: "q_edda_3", companion: "edda", relic: "edda_page", title: _t("La dernière page"),
      blurb: _t("Il reste une page au carnet d'Edda. Elle sait ce qu'elle veut y mettre."),
      steps: [
        { type: "elite", label: _t("Dégager le sommet : vaincre une élite de la Montagne"), world: "mountain", count: 1 },
        { type: "run", label: _t("Trouver d'où l'on voit tout le chemin : une Petite Aventure de la Montagne"), world: "mountain", count: 1 },
        { type: "scene", label: _t("La dernière page"), lines: [
          { w: "n", t: _t("D'en haut, on voit tout : la fumée de la Montagne, le gris des Ruines, la ligne du Désert, et très loin, une tache verte.") },
          { w: "edda", t: _t("Aeswyn.") },
          { w: "n", t: _t("Elle dessine le chemin d'un seul trait. Puis, dessus, de petites silhouettes, une par une.") },
          { w: "edda", t: _t("Il y manquait nous.") },
          { w: "n", t: _t("Elle détache la page et te la tend.") },
          { w: "edda", t: _t("Celle-là, tu la gardes. Moi, je recommence un carnet.") }] }] },
    { id: "q_ysolt_1", companion: "ysolt", relic: "ysolt_fleche", title: _t("Le carquois sans flèches"),
      blurb: _t("La dernière flèche d'Ysolt est restée au fond, dans les alcôves."),
      steps: [
        { type: "run", label: _t("Descendre aux alcôves du fond : une Petite Aventure de la Crypte"), world: "crypt", count: 1 },
        { type: "elite", label: _t("Ce qui garde la place : vaincre une élite de la Crypte"), world: "crypt", count: 1 },
        { type: "scene", label: _t("La flèche"), lines: [
          { w: "n", t: _t("Dans le mur, au fond, une flèche plantée. Les plumes sont grises. Elle n'a pas bougé.") },
          { w: "ysolt", t: _t("La neuvième.") },
          { w: "n", t: _t("Elle la retire. Elle ne la remet pas dans le carquois. Elle la garde dans la main.") },
          { w: "ysolt", t: _t("Celle-là, je ne la laisse plus.") }] }] },
    { id: "q_ysolt_2", companion: "ysolt", relic: "ysolt_marche", title: _t("La neuvième montée"),
      blurb: _t("Ysolt veut revoir, vide, la forme à sa taille dans la pierre."),
      steps: [
        { type: "deliver", label: _t("Apporter de quoi faire des lampes"), res: { cire_sepulcre: 3, bois: 200 } },
        { type: "run", label: _t("Descendre jusqu'à la salle de la Pleureuse : deux Petites Aventures de la Crypte"), world: "crypt", count: 2 },
        { type: "scene", label: _t("L'alcôve vide"), lines: [
          { w: "n", t: _t("La forme dans la pierre est là, à la taille d'Ysolt. Vide.") },
          { w: "ysolt", t: _t("Elle m'allait bien.") },
          { w: "n", t: _t("Elle détache un éclat du rebord, là où elle posait les pieds.") },
          { w: "ysolt", t: _t("La neuvième. Je la compte, maintenant.") }] }] },
    { id: "q_ysolt_3", companion: "ysolt", relic: "ysolt_carquois", title: _t("Les marches comptées ensemble"),
      blurb: _t("Ysolt veut monter une fois avec tout le monde, et compter à voix haute."),
      steps: [
        { type: "elite", label: _t("Monter avec elle : vaincre une élite de la Montagne"), world: "mountain", count: 1 },
        { type: "run", label: _t("Chaque pas est une marche : une Petite Aventure de la Montagne"), world: "mountain", count: 1 },
        { type: "scene", label: _t("En haut"), lines: [
          { w: "ysolt", t: _t("Sept. Huit.") },
          { w: "n", t: _t("Elle s'arrête une seconde, comme devant une porte.") },
          { w: "ysolt", t: _t("Neuf. Dix.") },
          { w: "n", t: _t("Sarkel lui tend un carquois plein. Il l'a garni pendant la montée, flèche par flèche, sans rien dire.") },
          { w: "ysolt", t: _t("Je ne m'arrête plus à huit.") }] }] },
    { id: "q_sarkel_1", companion: "sarkel", relic: "sarkel_secret", title: _t("Ce qu'il refuse de vendre"),
      blurb: _t("Sarkel veut poser une vraie pierre taillée à côté de l'ancienne coupe du Veilleur."),
      steps: [
        { type: "deliver", label: _t("Apporter de quoi tailler une vraie pierre"), res: { pierre: 300, fer: 200 } },
        { type: "run", label: _t("Monter jusqu'à l'ancienne coupe du Veilleur : une Petite Aventure de la Montagne"), world: "mountain", count: 1 },
        { type: "scene", label: _t("La coupe du vieux"), lines: [
          { w: "n", t: _t("La coupe du Veilleur est nette, droite, sans un éclat de trop.") },
          { w: "n", t: _t("Sarkel pose sa pierre à côté. Elle est moins bonne. Il la regarde longtemps.") },
          { w: "sarkel", t: _t("Elle reste là quand même.") },
          { w: "n", t: _t("Il referme sa boîte sur son premier éclat.") },
          { w: "sarkel", t: _t("Celui-là ne se vend pas. C'est le premier que je n'ai pas acheté.") }] }] },
    { id: "q_sarkel_2", companion: "sarkel", relic: "sarkel_cle", title: _t("Ceux qui sont couchés là-haut"),
      blurb: _t("Personne n'a jamais laissé de pain à ceux que le Dragon a triés. Sarkel veut le faire."),
      steps: [
        { type: "deliver", label: _t("Apporter du pain et de la pierre taillée"), res: { pain: 15, bloc: 10 } },
        { type: "elite", label: _t("Ce qui garde leur salle : vaincre une élite de la Montagne"), world: "mountain", count: 1 },
        { type: "scene", label: _t("Fermer la salle"), lines: [
          { w: "n", t: _t("Sarkel pose le pain sur la pierre, devant eux. Il ne dit pas de prière. Il n'en connaît pas.") },
          { w: "sarkel", t: _t("Voilà. C'est payé.") },
          { w: "n", t: _t("Il ferme la salle avec une vieille clé de fer. Elle tourne du premier coup.") },
          { w: "sarkel", t: _t("Maintenant, ils peuvent arrêter d'attendre.") }] }] }
  ];
}

window.companionQuestsData = companionQuestsData;
