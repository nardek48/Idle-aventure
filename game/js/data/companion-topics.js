"use strict";
/* data/companion-topics.js — v3.601.0 (atelier sujets-compagnons, mise en page M1 et T1 validées par Seb le 31/10) :
   les sujets libres au feu. toi : un souvenir par monde atteint ; monde : ce qu'il pense du monde où l'on est.
   Textes de l'atelier des textes, intégrés avant relecture (accord de Seb). Littéraux pour l'audit i18n. */
function companionTopicsData() {
  return {
  wenna: {
    toi: {
      forest: [{ w: "wenna", t: _t("Orwen m'a appris les plantes. Elle disait : une plante qui soigne peut aussi tuer, c'est la dose qui décide.") }, { w: "wenna", t: _t("Alors je pèse tout. Même ce que je dis.") }, { w: "n", t: _t("Elle sourit, comme si c'était une blague. Ce n'en est pas tout à fait une.") }],
      desert: [{ w: "wenna", t: _t("Avant toi, je n'avais jamais quitté la forêt. Le premier jour dans le sable, j'ai pleuré. De rage, hein. Pas de peur.") }, { w: "wenna", t: _t("Le sable rentre dans les bandages. Rien n'est propre, ici.") }],
      ruins: [{ w: "wenna", t: _t("Je tiens un carnet. Tout ce que je soigne, je l'écris. Les noms, les blessures, ce qu'ils ont dit.") }, { w: "wenna", t: _t("Le jour où je ne pourrai plus soigner, j'aurai au moins ça.") }],
      crypt: [{ w: "wenna", t: _t("Ici, je n'ai personne à soigner. Ça me fait peur, de ne servir à rien.") }, { w: "wenna", t: _t("Ysolt dit que ce n'est pas grave. Elle dit que le repos, c'est aussi un soin.") }],
      mountain: [{ w: "wenna", t: _t("Quand j'étais petite, j'avais un peu peur de toi. Tout le monde avait un peu peur.") }, { w: "wenna", t: _t("Plus maintenant. Tu ne parles pas beaucoup, mais tu reviens toujours.") }] },
    monde: {
      forest: [{ w: "wenna", t: _t("Avant la nuit du feu, il y avait des chemins partout. Maintenant, la forêt les reprend.") }, { w: "wenna", t: _t("Brannoc dit qu'elle se souvient de nous. Moi, je crois qu'elle nous attend.") }],
      desert: [{ w: "wenna", t: _t("Le vieux du Temple dit qu'un royaume dort sous le sable. Des rues, des puits, des gens.") }, { w: "wenna", t: _t("On marche sur leurs toits. J'essaie de marcher doucement.") }],
      ruins: [{ w: "wenna", t: _t("Les rues se refont la nuit, mais jamais les maisons des gens. Seulement les murs, les portes, les places.") }, { w: "wenna", t: _t("Comme si celui qui construit ne savait pas que quelqu'un devait y vivre.") }],
      crypt: [{ w: "wenna", t: _t("Ici, on ne brûle pas les morts. On les couche, on les range, on leur laisse du pain.") }, { w: "wenna", t: _t("À Aeswyn, le feu a tout pris. Ici, on garde. Je ne sais pas ce qui est le mieux.") }],
      mountain: [{ w: "wenna", t: _t("La pierre est chaude sous les pieds. Sarkel dit que la montagne respire.") }, { w: "wenna", t: _t("Elle sent le fer et la cendre. Comme la forge de Brannoc, en plus grand.") }] } },
  maddoc: {
    toi: {
      desert: [{ w: "maddoc", t: _t("Avant, j'étais puisatier. Je trouvais l'eau. On me payait en dattes.") }, { w: "maddoc", t: _t("Maintenant, je prends les coups à la place des autres. Le salaire est moins bon.") }],
      ruins: [{ w: "maddoc", t: _t("Ma jambe me fait mal quand il va pleuvoir. Ici, elle me fait mal tout le temps.") }, { w: "maddoc", t: _t("Je crois que c'est la pierre qui bouge. Ou moi qui vieillis.") }],
      crypt: [{ w: "maddoc", t: _t("Je n'aime pas les endroits fermés. Au fond du gouffre, j'ai attendu trois jours qu'on me trouve.") }, { w: "maddoc", t: _t("Personne n'est venu. Je suis remonté seul. Depuis, je préfère voir le ciel.") }],
      mountain: [{ w: "maddoc", t: _t("Mon frère et moi, on se battait pour savoir qui porterait le seau. Le plus lourd gagnait.") }, { w: "maddoc", t: _t("C'était toujours lui. Il trichait. Il mettait des pierres dans ses poches.") }] },
    monde: {
      desert: [{ w: "maddoc", t: _t("Le sable garde tout : les puits, les routes, les rois. Il rend parfois. Jamais ce qu'on cherche.") }, { w: "maddoc", t: _t("Les gens d'ici ne disent pas « hier ». Ils disent « avant le sable ».") }],
      ruins: [{ w: "maddoc", t: _t("Une ville qui se refait toute seule. Chez moi, on aurait payé cher pour ça.") }, { w: "maddoc", t: _t("Ici, personne ne veut y habiter. Ça devrait nous dire quelque chose.") }],
      crypt: [{ w: "maddoc", t: _t("Les morts d'ici sont rangés mieux que les vivants du Désert.") }, { w: "maddoc", t: _t("Ysolt les connaît tous. Moi, je préfère ne pas savoir leurs noms.") }],
      mountain: [{ w: "maddoc", t: _t("La roche est chaude. Les bêtes sont faites de pierre. Rien ici n'est né, tout a été taillé.") }, { w: "maddoc", t: _t("Je me demande qui tenait l'outil.") }] } },
  edda: {
    toi: {
      ruins: [{ w: "edda", t: _t("Je suis la troisième de ma famille à dessiner des cartes. La première à en rater une.") }, { w: "edda", t: _t("Ma mère dirait que ce n'est pas un échec. Que c'est une carte en cours.") }],
      crypt: [{ w: "edda", t: _t("J'avais peur du noir, petite. Mon père me donnait une craie et me disait de dessiner le noir.") }, { w: "edda", t: _t("Ça marchait. Le noir, une fois dessiné, ce n'est qu'une pièce de plus.") }],
      mountain: [{ w: "edda", t: _t("J'ai gardé tous mes carnets depuis Aeswyn. Ils pèsent plus lourd que mes affaires.") }, { w: "edda", t: _t("Si je tombe, garde-les. Pas moi, les carnets. Enfin, les deux, si tu peux.") }] },
    monde: {
      ruins: [{ w: "edda", t: _t("Il y a des quartiers qui reviennent toujours au même endroit. D'autres, jamais deux fois.") }, { w: "edda", t: _t("J'ai fini par leur donner des noms, comme à des bêtes. Celui de l'est, je l'appelle le Têtu.") }],
      crypt: [{ w: "edda", t: _t("Ici, chaque couloir est droit. Quelqu'un les a tracés à la règle, il y a très longtemps.") }, { w: "edda", t: _t("C'est la première fois que je trouve une carte déjà faite. Je la recopie quand même.") }],
      mountain: [{ w: "edda", t: _t("Les pentes ont chacune leur veine. Sarkel les sent, moi je les dessine.") }, { w: "edda", t: _t("Ce qui me trouble, c'est que les veines vont toutes vers le haut. Vers le sommet.") }] } },
  ysolt: {
    toi: {
      crypt: [{ w: "ysolt", t: _t("Avant de me coucher, j'avais un arc, un chien et une sœur. Dans cet ordre-là, je crois.") }, { w: "ysolt", t: _t("Le chien, je m'en souviens le mieux. C'est injuste pour ma sœur.") }],
      mountain: [{ w: "ysolt", t: _t("Je sens moins le froid qu'avant, et plus la chaleur. Ici, c'est presque trop.") }, { w: "ysolt", t: _t("Wenna m'a donné une couverture, quand même. Je l'ai gardée. Ça fait plaisir, une couverture.") }] },
    monde: {
      crypt: [{ w: "ysolt", t: _t("Chaque alcôve a son dormeur, et chaque dormeur sa manière de dormir.") }, { w: "ysolt", t: _t("Ils ne sont pas tristes. Ils attendent qu'on ne les oublie pas. C'est tout.") }],
      mountain: [{ w: "ysolt", t: _t("Ici, ceux qui attendent sont debout. C'est une drôle d'idée, attendre debout.") }, { w: "ysolt", t: _t("En bas, au moins, on nous laisse nous allonger.") }] } },
  sarkel: {
    toi: {
      mountain: [{ w: "sarkel", t: _t("J'ai commencé avec une carriole et une chèvre. La chèvre m'a quitté pour un berger du Désert.") }, { w: "sarkel", t: _t("Je ne lui en veux pas. Il payait mieux le foin.") }] },
    monde: {
      mountain: [{ w: "sarkel", t: _t("Ici, rien ne se vend : ni la pierre chaude, ni ce qui en sort. Tout le monde veut, personne ne paie.") }, { w: "sarkel", t: _t("Pour un marchand, c'est l'enfer. Pour un tailleur, je commence à comprendre.") }] } }
  };
}

window.companionTopicsData = companionTopicsData;

/* v3.605.0 (T2, demande de Seb) : « Et les autres ? » — ce que chaque compagnon pense de chacun des autres (20 avis). */
function companionAvisData() {
  return {
  wenna: {
    maddoc: [{ w: "wenna", t: _t("Maddoc fait semblant de ne pas avoir mal. Moi, je fais semblant de ne pas le voir.") }, { w: "wenna", t: _t("Un jour, il me laissera regarder sa jambe. Pas encore.") }],
    edda: [{ w: "wenna", t: _t("Edda dessine tout. Moi aussi, elle m'a dessinée. Je ne savais pas que je fronçais les sourcils comme ça.") }, { w: "wenna", t: _t("J'ai demandé à garder le dessin. Elle a dit : quand la carte sera finie.") }],
    ysolt: [{ w: "wenna", t: _t("Ysolt a les mains froides. Toujours. Je lui ai donné une couverture, même si ça ne sert à rien.") }, { w: "wenna", t: _t("Elle l'a pliée sur ses genoux. Elle la garde comme on garde un cadeau.") }],
    sarkel: [{ w: "wenna", t: _t("Sarkel compte tout ce qu'on lui doit. Mais quand je soigne quelqu'un, il ne compte jamais les bandages.") }, { w: "n", t: _t("Elle hausse les épaules, comme si ça réglait la question.") }] },
  maddoc: {
    wenna: [{ w: "maddoc", t: _t("La petite soigne vite et parle peu quand ça compte. Le reste du temps, elle parle pour deux.") }, { w: "maddoc", t: _t("Si mon frère l'avait connue, il aurait ri plus souvent.") }],
    edda: [{ w: "maddoc", t: _t("Edda dessine les rues avant qu'elles se refassent. Moi, je les traverse après. On fait la paire.") }, { w: "maddoc", t: _t("Elle ne se trompe presque jamais. Presque, c'est ce qui me garde éveillé.") }],
    ysolt: [{ w: "maddoc", t: _t("Ysolt marche comme quelqu'un qui connaît la fin du chemin. Ça me met mal à l'aise.") }, { w: "maddoc", t: _t("Mais elle ne recule jamais. Ça, je respecte.") }],
    sarkel: [{ w: "maddoc", t: _t("Je lui ai appris à tenir une pioche. Les deux mains, plus bas. Il m'a payé en me disant merci.") }, { w: "maddoc", t: _t("Venant de Sarkel, c'est le prix le plus cher que j'aie jamais reçu.") }] },
  edda: {
    wenna: [{ w: "edda", t: _t("Wenna veut toujours savoir ce qu'il y a au bout du chemin. Moi aussi. Sauf qu'elle, elle n'a pas peur de la réponse.") }, { w: "n", t: _t("Edda sourit, sans lever les yeux de son carnet.") }],
    maddoc: [{ w: "edda", t: _t("Maddoc ne parle pas beaucoup, mais il se met toujours entre moi et ce qui bouge. Même les murs.") }, { w: "edda", t: _t("J'ai dessiné sa silhouette dans un coin de chaque page. Il ne le sait pas.") }],
    ysolt: [{ w: "edda", t: _t("Ysolt connaît chaque couloir de la Crypte. Sans carte. Ça me vexe un peu.") }, { w: "edda", t: _t("Elle dit que les morts sont la carte. Je n'ai pas encore compris.") }],
    sarkel: [{ w: "edda", t: _t("Sarkel m'a vendu une carte fausse, il y a longtemps. Elle m'a menée jusqu'aux Ruines quand même.") }, { w: "edda", t: _t("Je ne lui ai jamais dit. Il le prendrait pour un compliment.") }] },
  ysolt: {
    wenna: [{ w: "ysolt", t: _t("Wenna ronfle. Un peu. Comme un chat au coin du feu.") }, { w: "ysolt", t: _t("Quand elle dort, je compte ses respirations. Ça m'aide à compter les miennes.") }],
    maddoc: [{ w: "ysolt", t: _t("Maddoc a peur de moi. Il le cache mal. C'est bien : ceux qui n'ont peur de rien ne reviennent pas.") }, { w: "n", t: _t("Elle le dit sans méchanceté. Comme on dit le temps qu'il fera.") }],
    edda: [{ w: "ysolt", t: _t("Edda dessine ceux qui dorment, et elle leur laisse de la place sur la page. Personne ne fait ça.") }, { w: "ysolt", t: _t("Elle m'a dessinée aussi. Debout.") }],
    sarkel: [{ w: "ysolt", t: _t("Sarkel apporte du pain aux morts et dit que c'est pour les affaires. Il ment mal.") }, { w: "ysolt", t: _t("Ils le savent. Ils l'aiment bien quand même.") }] },
  sarkel: {
    wenna: [{ w: "sarkel", t: _t("La petite ne marchande jamais. Ça me fend le cœur. Je lui fais des prix quand même. Ne lui dis pas.") }, { w: "sarkel", t: _t("Elle me rendrait la différence. Elle en est capable.") }],
    maddoc: [{ w: "sarkel", t: _t("Maddoc m'a appris à tailler. Je lui ai appris à acheter de l'eau sans se faire voler. On est quittes.") }, { w: "n", t: _t("Il réfléchit, puis corrige.") }, { w: "sarkel", t: _t("Presque quittes.") }],
    edda: [{ w: "sarkel", t: _t("Je lui ai vendu une carte fausse, autrefois. Elle ne m'en a jamais parlé. Ça me travaille.") }, { w: "sarkel", t: _t("Les clients qui se taisent, ce sont les pires. Ou les meilleurs.") }],
    ysolt: [{ w: "sarkel", t: _t("Je vends à tout le monde. Aux vivants, aux pressés, aux perdus. À elle, je n'ai jamais rien vendu.") }, { w: "sarkel", t: _t("Elle n'a besoin de rien. Ça devrait m'inquiéter. Ça me repose.") }] }
  };
}

window.companionAvisData = companionAvisData;

/* v3.607.0 (E3, S2) : « Et ce matin ? » — ce que chaque compagnon dit de l'événement du village en cours, par type. */
function companionMorningData() {
  return {
    wenna: { rumeur: _t("Une rumeur, à la Taverne ? Si c'est des bêtes, je prends des bandages. Si c'est un trésor, aussi."), demande: _t("Ils demandent toujours la même chose, les anciens : un peu plus. Et ils ont toujours raison."), marche: _t("Sarkel a monté son étal. Ne le regarde pas dans les yeux, sinon tu achètes."), fete: _t("Une fête ! J'ai déjà réservé ma place, près du pain.") },
    maddoc: { rumeur: _t("Les rumeurs de taverne, c'est moitié bière, moitié vrai. On ira voir la moitié vraie."), demande: _t("Le village demande. On donne. Chez moi, c'était pareil. Sauf qu'on n'avait rien."), marche: _t("Sarkel vend. Moi, je surveille qu'il rende la monnaie."), fete: _t("Une fête. Je resterai au bord. Quelqu'un doit garder la porte, même un soir de fête.") },
    edda: { rumeur: _t("Une rumeur, c'est une carte sans traits. Je vais la dessiner."), demande: _t("Aldric m'a demandé de recompter ses pieux. Il avait raison, il en manquait. Ça l'a contrarié."), marche: _t("Sarkel vend des cartes, aujourd'hui. Je vérifierai lesquelles sont vraies."), fete: _t("Je dessine les fêtes. Personne ne bouge assez vite pour que ce soit flou.") },
    ysolt: { rumeur: _t("Les vivants racontent des histoires sur les lieux. Les morts, eux, y restent."), demande: _t("Ils ont besoin de choses. C'est bien, d'avoir besoin de choses."), marche: _t("Sarkel m'a proposé un miroir. Je lui ai dit non merci. Il n'a pas insisté."), fete: _t("Une fête. Je compterai les rires. Il y en aura plus de huit.") },
    sarkel: { rumeur: _t("Une rumeur ? Je l'ai peut-être lancée. Pour les affaires. Mais elle est vraie, cette fois."), demande: _t("Les anciens paient en remerciements. Ça ne se revend pas. Ça se garde quand même."), marche: _t("Mon étal est monté. Pour toi, des prix d'ami. Enfin, d'ami qui paie."), fete: _t("Une fête, c'est un marché où personne ne paie. Je déteste. J'y vais quand même.") }
  };
}

window.companionMorningData = companionMorningData;
