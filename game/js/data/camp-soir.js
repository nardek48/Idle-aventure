"use strict";
/* data/camp-soir.js — v3.595.0 (chantier « un camp qui évolue », C1 et C2 validés par Seb le 31/10) :
   la phrase du soir au Camp, et ce que dit chaque compagnon quand on le touche. Ton validé sur la Forêt et le Désert. */

/* Un monde par case (Forêt, Désert, Ruines, Crypte, Montagne, Tour). lieu : phrases sans compagnon ;
   une clé par compagnon : ses phrases du soir ; tap : sa phrase au toucher. Textes littéraux pour l'audit i18n. */
function campSoirData() {
  return [
    { lieu: [_t("Le feu tient. Quelqu'un a rentré du bois avant la pluie."), _t("Une chouette, quelque part. Puis plus rien. Le feu craque."), _t("Orwen a laissé une écuelle au chaud, contre les pierres.")],
      wenna: [_t("Wenna compte les braises à voix basse. Elle recommence quand elle se trompe."), _t("Wenna a ramené une pomme de pin. Elle la retourne, cherche par où elle s'ouvre."), _t("Wenna regarde la lisière. Elle demande si les loups dorment, eux aussi.")],
      tap: { wenna: _t("« Toi aussi, tu entends les arbres, la nuit ? Moi, des fois. »") } },
    { lieu: [_t("Le vent tourne. Le sable siffle sous la toile, puis se tait."), _t("Au puits, quelqu'un compte les seaux. Personne ne le contredit."), _t("La nuit est froide, ici. Le feu fait ce qu'il peut.")],
      wenna: [_t("Wenna verse du sable d'une main dans l'autre. Elle dit qu'il est plus fin qu'à la maison."), _t("Wenna a gardé sa part d'eau. Elle la regarde au lieu de la boire."), _t("Wenna demande à Sarkel combien coûte une étoile. Il ne répond pas.")],
      maddoc: [_t("Maddoc s'est assis dos au vent. Il étire sa jambe, lentement, sans un bruit."), _t("Maddoc boit à petites gorgées. Il ne remercie personne. Il garde l'outre près de lui."), _t("Maddoc regarde vers le nord, vers le gouffre. Il ne dit pas ce qu'il cherche.")],
      tap: { wenna: _t("« Sarkel dit qu'il y a quelqu'un sous le sable. Tu crois qu'il a froid ? »"), maddoc: _t("« Le sable avance, la nuit. Le matin, il fait semblant que non. »") } },
    { lieu: [_t("Les colonnes font de longues ombres. Elles ne tombent plus tout à fait au même endroit qu'hier."), _t("Un mur s'écroule quelque part, loin. Personne ne lève la tête."), _t("Le feu éclaire une inscription à moitié effacée. On lit une date, pas le reste.")],
      wenna: [_t("Wenna essaie de lire une inscription à voix haute. Elle invente les mots qui manquent."), _t("Wenna a trouvé une tuile peinte. Elle la frotte avec sa manche pour voir la couleur.")],
      maddoc: [_t("Maddoc a calé son dos contre une colonne. Il dit qu'au moins celle-là ne bouge pas."), _t("Maddoc taille un bâton. Il le mesure contre sa jambe, et recommence.")],
      edda: [_t("Edda trace à la craie, sur une dalle, le plan de la journée. Elle efface un couloir, en ajoute deux."), _t("Edda dort assise, sa carte roulée sous le bras."), _t("Edda compte les pas jusqu'à la colonne la plus proche. Elle note le chiffre et fronce les sourcils.")],
      tap: { wenna: _t("« Tu crois qu'ils habitaient là, avant ? Ils mangeaient quoi ? »"), maddoc: _t("« Ici, le chemin d'hier ne mène plus nulle part. »"), edda: _t("« Les murs ont encore bougé cette nuit. J'ai noté où. »") } },
    { lieu: [_t("On parle bas, ici, sans que personne l'ait demandé."), _t("Le froid monte du sol. Le feu tient, mais il ne réchauffe pas loin."), _t("Quelque part sous les dalles, une pierre a bougé. Puis le silence.")],
      wenna: [_t("Wenna s'est rapprochée du feu plus que d'habitude. Elle ne pose pas de question, ce soir."), _t("Wenna regarde Ysolt longtemps, puis lui tend la moitié de son pain. Ysolt ne le prend pas.")],
      maddoc: [_t("Maddoc garde sa lame sur les genoux. Il dit que c'est pour le froid."), _t("Maddoc a compté les sorties de la salle. Il les recompte.")],
      edda: [_t("Edda ne dessine pas, ce soir. Elle dit que les morts n'aiment pas qu'on les mette sur une carte."), _t("Edda recopie les noms gravés sur les dalles, à la lueur des braises.")],
      ysolt: [_t("Ysolt se tient au bord de la lumière. Elle ne s'approche jamais tout à fait du feu."), _t("Ysolt passe les doigts sur son carquois vide, un par un, comme si elle comptait des flèches."), _t("Ysolt écoute le sol. Elle dit qu'ils dorment, et qu'il vaut mieux qu'ils continuent.")],
      tap: { wenna: _t("« Elle mange jamais, Ysolt ? »"), maddoc: _t("« J'aime pas les endroits où on chuchote. »"), edda: _t("« Je garde les noms. Quelqu'un doit les garder. »"), ysolt: _t("« Ne marchez pas si fort. Ils dorment, en bas. »") } },
    { lieu: [_t("Le sol est tiède sous les couvertures. Plus haut, la montagne gronde, puis se calme."), _t("La cendre tombe comme une neige grise. Elle ne fond pas."), _t("Le feu brûle un charbon trouvé là. Il brûle trop bien.")],
      wenna: [_t("Wenna a posé une pierre noire près du feu pour voir si elle fond. Elle attend."), _t("Wenna s'est endormie la tête sur l'épaule de Maddoc. Il ne bouge pas.")],
      maddoc: [_t("Maddoc respire mal, ici. Il le dit une fois, puis plus jamais."), _t("Maddoc a enveloppé sa jambe dans un chiffon mouillé. La vapeur monte.")],
      edda: [_t("Edda trace la pente sur sa carte. Elle dit que la montagne a changé depuis le matin."), _t("Edda a perdu sa craie dans une fissure. Elle en taille une autre dans une pierre blanche.")],
      ysolt: [_t("Ysolt regarde vers le sommet longtemps. Elle ne dit rien."), _t("Ysolt est la seule que la chaleur ne gêne pas.")],
      sarkel: [_t("Sarkel range ses sacs par prix. Il en déplace un, puis le remet."), _t("Sarkel parle du vieux, à mi-voix, puis change de sujet pour le prix du sel."), _t("Sarkel dit qu'il sait où sont couchés ceux qui sont montés avant. Il ne dit pas combien ça coûte.")],
      tap: { wenna: _t("« On voit la Tour, d'ici ? »"), maddoc: _t("« Au-dessus, ça brûle. En dessous aussi. On est au milieu. »"), edda: _t("« Ma carte s'arrête ici. Après, je n'ai plus de papier. »"), ysolt: _t("« Là-haut, j'ai déjà compté les marches. Je ne me souviens plus du nombre. »"), sarkel: _t("« Tout se vend. Presque tout. Ça, non. »") } },
    { lieu: [_t("Le dernier feu avant la Tour. Personne ne parle de demain."), _t("Le vent siffle entre les pierres. Il vient d'en haut."), _t("Au-dessus du camp, une lumière. Bleue. Froide. Sans forme.")],
      wenna: [_t("Wenna regarde la Tour sans rien demander. C'est la première fois.")],
      maddoc: [_t("Maddoc aiguise sa lame longtemps, plus longtemps qu'il ne faut.")],
      edda: [_t("Edda a laissé blanche la dernière page de sa carte.")],
      ysolt: [_t("Ysolt reste tournée vers la Tour. Son carquois est posé à côté d'elle, pour la première fois.")],
      sarkel: [_t("Sarkel ne vend rien, ce soir. Il donne une outre à chacun, et ne compte pas.")],
      tap: { wenna: _t("« Quand ce sera fini, on rentre ? Tous ? »"), maddoc: _t("« Je boite. Je ne tombe pas. »"), edda: _t("« Il n'y a pas de carte pour là-haut. On en fera une. »"), ysolt: _t("« Cette fois, je compte les marches avec toi. »"), sarkel: _t("« Le vieux est là-haut. Il t'attend depuis longtemps. »") } }
  ];
}

/* Un compagnon revenu dans un monde où il n'a pas encore de phrase (Edda en Forêt, par exemple). */
function campSoirAny() {
  return {
    wenna: { soir: [_t("Wenna tisonne le feu avec un bâton. Elle fait monter des étincelles, exprès.")], tap: _t("« On reste combien de temps, ici ? »") },
    maddoc: { soir: [_t("Maddoc s'est assis dos au feu. Il surveille la nuit.")], tap: _t("« Je boite. Je ne tombe pas. »") },
    edda: { soir: [_t("Edda recopie sa carte au propre, à la lueur du feu.")], tap: _t("« Ici aussi, les chemins changent. Moins vite. »") },
    ysolt: { soir: [_t("Ysolt se tient à l'écart, là où la lumière s'arrête.")], tap: _t("« Ne marchez pas si fort. »") },
    sarkel: { soir: [_t("Sarkel compte ses pièces, deux fois. Il sourit à la deuxième.")], tap: _t("« Ça fera trente. Bon. Vingt. »") }
  };
}

window.campSoirData = campSoirData;
window.campSoirAny = campSoirAny;
