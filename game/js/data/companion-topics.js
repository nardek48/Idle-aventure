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
