"use strict";
/* data/companion-talks.js — v3.597.0 (chantier « parler avec les compagnons », cadre validé par Seb le 31/10) :
   les conversations au feu. Les textes viennent de l'atelier des textes, une fois validés par Seb. */

/* Une conversation : id, companion, step (étape de l'Histoire atteinte), after (conversation faite avant), afterQuest (quête finie avant),
   lines (w : compagnon, "n" narrateur ; un nœud { choix: [{ t, suite }] } propose deux réponses),
   unlocks ({ quest, title } : la quête personnelle débloquée, data/companion-quests.js). Textes littéraux pour l'audit i18n. */
/* v3.599.0 : les 27 conversations de l'atelier des textes, intégrées avant relecture (accord de Seb du 31/10 :
   on corrigera après validation). step = étape de l'Histoire réclamée. */
function companionTalksData() {
  return [
    { id: "wenna_1", companion: "wenna", step: "forest_wenna", after: null, lines: [
      { w: "wenna", t: _t("Tout le monde se tait quand on parle de cette nuit-là. Toi aussi.") },
      { w: "wenna", t: _t("Moi, j'étais trop petite. Je me souviens d'une odeur. C'est tout.") },
      { choix: [
        { t: _t("Moi non plus, je ne me souviens de rien."), suite: [{ w: "wenna", t: _t("Alors on est deux. Ça fait moins bizarre.") }] },
        { t: _t("Je me souviens des flammes. Pas du reste."), suite: [{ w: "wenna", t: _t("Les flammes, c'est déjà beaucoup. Orwen dit que tu ne bougeais pas.") }] }] },
      { w: "wenna", t: _t("Brannoc dit que la lumière est tombée au nord, cette nuit-là. Et que le feu est venu après.") },
      { w: "wenna", t: _t("Je me demande si c'est la même chose. La lumière et le feu.") },
      { w: "n", t: _t("Elle tisonne les braises. Elle n'attend pas de réponse.") }] },
    { id: "wenna_2", companion: "wenna", step: "desert_05", after: "wenna_1", lines: [
      { w: "wenna", t: _t("Sarkel achète des noms. Des noms gravés dans la pierre. Qui achète des noms ?") },
      { w: "wenna", t: _t("Il dit qu'en dessous, il y avait un royaume. Des rois, des gens, des chèvres.") },
      { choix: [
        { t: _t("Les noms, ça se garde."), suite: [{ w: "wenna", t: _t("C'est ce que dit le vieux du Temple. Il dit de les laisser où ils sont.") }] },
        { t: _t("Les noms, ça se vend, si quelqu'un paie."), suite: [{ w: "wenna", t: _t("Sarkel dirait pareil. Il sourit quand il dit ça.") }] }] },
      { w: "wenna", t: _t("Tu crois qu'un jour, quelqu'un achètera le nom d'Aeswyn ?") },
      { w: "n", t: _t("Le vent passe sous la toile. Personne ne répond.") }] },
    { id: "wenna_3", companion: "wenna", step: "desert_08", after: "wenna_2", unlocks: { quest: "q_wenna_1", title: _t("La graine du Clos") }, lines: [
      { w: "wenna", t: _t("J'ai apporté quelque chose. Ne te moque pas.") },
      { w: "n", t: _t("Elle ouvre la main. Une graine noire, ridée, pas plus grosse qu'un ongle.") },
      { w: "wenna", t: _t("Elle vient du Clos. Du plus vieux sillon, celui qu'on n'a jamais labouré à nouveau.") },
      { choix: [
        { t: _t("Pourquoi tu l'as gardée ?"), suite: [{ w: "wenna", t: _t("Parce que tout le reste a brûlé. Pas elle.") }] },
        { t: _t("Rien ne pousse, ici."), suite: [{ w: "wenna", t: _t("C'est pour ça. Si elle pousse ici, elle poussera partout.") }] }] },
      { w: "wenna", t: _t("Il faut de l'eau, beaucoup. Et de la terre qui ne soit pas du sable.") },
      { w: "wenna", t: _t("Tu m'aides ? Pas tout de suite. Quand tu auras le temps.") }] },
    { id: "wenna_4", companion: "wenna", step: "ruines_07", after: "wenna_3", lines: [
      { w: "wenna", t: _t("À Aeswyn, on a rebâti trois maisons en douze hivers. Ici, une rue par nuit.") },
      { w: "wenna", t: _t("Edda dit que personne ne pose les pierres. Elles se posent.") },
      { choix: [
        { t: _t("Quelqu'un veut finir cette ville."), suite: [{ w: "wenna", t: _t("Alors il est patient. Ou il ne sait pas s'arrêter.") }] },
        { t: _t("Tant qu'elles ne tombent pas sur nous."), suite: [{ w: "wenna", t: _t("Tu parles comme Brannoc. Lui aussi, il regarde d'abord le toit.") }] }] },
      { w: "wenna", t: _t("Edda a gratté une pierre neuve, ce matin. Dessous, c'était bleu. Très peu. Comme une braise froide.") },
      { w: "wenna", t: _t("La lumière de cette nuit-là est passée ici aussi. Elle est restée dans les murs.") },
      { w: "n", t: _t("Elle pose la main sur la pierre du foyer, puis la retire. La pierre est tiède. C'est le feu, sans doute.") }] },
    { id: "wenna_5", companion: "wenna", step: "crypte_07", after: "wenna_4", afterQuest: "q_wenna_1", unlocks: { quest: "q_wenna_2", title: _t("La nuit du feu") }, lines: [
      { w: "wenna", t: _t("Sarkel laisse du pain aux morts. Il dit qu'ils s'en souviennent.") },
      { w: "wenna", t: _t("À Aeswyn, on n'a rien laissé. Il n'y avait pas de tombes. Il n'y avait plus rien.") },
      { w: "n", t: _t("Elle tourne un bout de toile entre ses doigts. Une bande de pansement, propre.") },
      { w: "wenna", t: _t("Trois familles ont fui dans les bois. Les autres ne sont jamais sorties du feu. Orwen ne dit jamais leurs noms.") },
      { choix: [
        { t: _t("Tu veux les écrire quelque part."), suite: [{ w: "wenna", t: _t("Ici. Là où on range ceux qu'on n'oublie pas. Même s'ils ne sont pas d'ici.") }] },
        { t: _t("Orwen a peut-être ses raisons."), suite: [{ w: "wenna", t: _t("Sûrement. Mais si personne ne les dit, à la fin, ils n'auront jamais existé.") }] }] },
      { w: "wenna", t: _t("Je connais deux noms. Il y en a d'autres. Je les trouverai.") },
      { w: "wenna", t: _t("Tu viens avec moi ? Je n'aime pas les couloirs. Toi, ils ne te font rien.") }] },
    { id: "wenna_6", companion: "wenna", step: "montagne_09", after: "wenna_5", afterQuest: "q_wenna_2", unlocks: { quest: "q_wenna_3", title: _t("Ce qu'elle fera après") }, lines: [
      { w: "wenna", t: _t("Ici, la pierre brûle toute seule. Sarkel dit qu'il y a des braises qui ne s'éteignent jamais.") },
      { w: "wenna", t: _t("Toute ma vie, j'ai soigné des brûlures. Je n'ai jamais allumé un feu.") },
      { choix: [
        { t: _t("Tu veux en ramener une au camp."), suite: [{ w: "wenna", t: _t("Oui. Un foyer qui tient tout l'hiver. Plus personne n'aurait à veiller dessus.") }] },
        { t: _t("Le feu, c'est ce qui a pris Aeswyn."), suite: [{ w: "wenna", t: _t("Je sais. C'est pour ça. Celui-là, je veux le choisir.") }] }] },
      { w: "wenna", t: _t("Je ne veux plus seulement réparer ce que les autres cassent. Je veux faire quelque chose qui reste.") },
      { w: "n", t: _t("Elle sourit, pour la première fois depuis longtemps sans s'en excuser.") }] },
    { id: "maddoc_1", companion: "maddoc", step: "desert_08", after: null, lines: [
      { w: "maddoc", t: _t("Tu ne m'as pas demandé pourquoi je boite.") },
      { choix: [
        { t: _t("Pourquoi tu boites ?"), suite: [{ w: "maddoc", t: _t("Le gouffre. Je l'ai sauté une fois. La deuxième fois, c'est lui qui a gagné.") }] },
        { t: _t("Ça ne me regarde pas."), suite: [{ w: "maddoc", t: _t("C'est bien. Ceux qui demandent veulent toujours quelque chose en échange.") }] }] },
      { w: "maddoc", t: _t("De l'autre côté, il y avait un village. Comme le tien. Plus petit.") },
      { w: "maddoc", t: _t("Une nuit, la lumière est tombée là-bas aussi. Bleue. Froide.") },
      { w: "n", t: _t("Il regarde le feu longtemps.") },
      { w: "maddoc", t: _t("Le lendemain, les bêtes avaient changé. Chez vous aussi, je suppose.") }] },
    { id: "maddoc_2", companion: "maddoc", step: "desert_10", after: "maddoc_1", lines: [
      { w: "maddoc", t: _t("Le vieux du Temple. Il savait que j'étais de l'autre côté.") },
      { w: "maddoc", t: _t("Il a tenu cette porte des années. Pour quelqu'un qui ne passait pas.") },
      { choix: [
        { t: _t("Il t'attendait."), suite: [{ w: "maddoc", t: _t("Non. Il attendait quelqu'un qui passerait. Moi, j'étais juste en chemin.") }] },
        { t: _t("Tu lui fais confiance ?"), suite: [{ w: "maddoc", t: _t("Il ne ment pas. Il ne dit pas tout. Ce n'est pas pareil.") }] }] },
      { w: "maddoc", t: _t("Il parle de la Tour comme on parle de chez soi.") },
      { w: "n", t: _t("Maddoc frotte sa jambe. Il ne dit plus rien, ce soir.") }] },
    { id: "maddoc_3", companion: "maddoc", step: "desert_12", after: "maddoc_2", unlocks: { quest: "q_maddoc_1", title: _t("Ce qu'il reste de l'autre côté") }, lines: [
      { w: "maddoc", t: _t("Mon village avait un puits. Je l'ai creusé avec mon frère. On avait dix ans.") },
      { w: "maddoc", t: _t("La nuit de la lumière, on a fui. Moi par le gouffre. Lui, je ne sais pas.") },
      { choix: [
        { t: _t("Tu veux y retourner."), suite: [{ w: "maddoc", t: _t("Je veux savoir. Ce n'est pas pareil non plus.") }] },
        { t: _t("Tu as peur de ce que tu trouveras."), suite: [{ w: "maddoc", t: _t("Oui. C'est pour ça que je te demande de venir.") }] }] },
      { w: "maddoc", t: _t("Le puits doit être encore là. Les puits, ça reste.") },
      { w: "maddoc", t: _t("Quand tu veux. Je marche lentement, mais je marche.") }] },
    { id: "maddoc_4", companion: "maddoc", step: "desert_18", after: "maddoc_3", lines: [
      { w: "maddoc", t: _t("Le roi était assis sur son trône depuis mille ans. Il attendait qu'on lui dise qu'il pouvait partir.") },
      { w: "maddoc", t: _t("Le vieux du Temple dit que la Tour était là avant le royaume. Avant le sable.") },
      { choix: [
        { t: _t("Tu le crois ?"), suite: [{ w: "maddoc", t: _t("Je crois qu'il l'a vue de plus près que nous. Ça suffit pour l'écouter.") }] },
        { t: _t("Une tour ne dure pas mille ans."), suite: [{ w: "maddoc", t: _t("Un roi non plus. Pourtant.") }] }] },
      { w: "maddoc", t: _t("Chez moi, on disait qu'au nord, il y a une porte que personne n'a construite.") },
      { w: "maddoc", t: _t("Je pensais que c'était pour faire peur aux enfants. Maintenant, je ne sais plus.") },
      { w: "n", t: _t("Il regarde vers le nord, là où le ciel est un peu plus sombre qu'ailleurs.") }] },
    { id: "maddoc_5", companion: "maddoc", step: "ruines_07", after: "maddoc_4", afterQuest: "q_maddoc_1", unlocks: { quest: "q_maddoc_2", title: _t("La trace du frère") }, lines: [
      { w: "maddoc", t: _t("Edda m'a montré son carnet. Sur une page, un mur qu'elle a dessiné à l'est.") },
      { w: "maddoc", t: _t("Sur le mur, un nom gravé au couteau. La même main que sur la margelle du puits.") },
      { w: "n", t: _t("Il pose sur la table une pierre plate, percée, qu'il a ramassée au puits. Il la fait tourner.") },
      { choix: [
        { t: _t("Ton frère est venu jusqu'ici."), suite: [{ w: "maddoc", t: _t("Ou quelqu'un qui grave comme lui. Je préfère la première idée.") }] },
        { t: _t("Ce n'est peut-être qu'un nom."), suite: [{ w: "maddoc", t: _t("Peut-être. Mais personne d'autre ne fait la barre du milieu trop longue.") }] }] },
      { w: "maddoc", t: _t("Le quartier n'est là qu'une nuit sur trois. Edda dit qu'elle saura quand.") },
      { w: "maddoc", t: _t("On y va ensemble. Si c'est lui, je veux quelqu'un à côté de moi.") }] },
    { id: "maddoc_6", companion: "maddoc", step: "montagne_08", after: "maddoc_5", afterQuest: "q_maddoc_2", unlocks: { quest: "q_maddoc_3", title: _t("Le retrouver") }, lines: [
      { w: "maddoc", t: _t("La flèche sous son nom montrait la montagne. On y est.") },
      { w: "maddoc", t: _t("Sarkel dit qu'il y a des tailleurs plus haut. Des gens qui ne descendent jamais.") },
      { choix: [
        { t: _t("Tu crois qu'il est avec eux."), suite: [{ w: "maddoc", t: _t("Il aimait tailler. Il disait que la pierre ne ment pas, qu'elle casse ou qu'elle tient.") }] },
        { t: _t("Et s'il ne veut pas qu'on le trouve ?"), suite: [{ w: "maddoc", t: _t("Alors je le saurai. C'est déjà plus que ce que j'ai aujourd'hui.") }] }] },
      { w: "maddoc", t: _t("J'ai son couteau. Je le lui rendrai. Ou je le garderai. On verra lequel de nous deux en a besoin.") },
      { w: "maddoc", t: _t("La montée est longue. Ma jambe n'aime pas ça. Elle viendra quand même.") }] },
    { id: "edda_1", companion: "edda", step: "ruines_03", after: null, lines: [
      { w: "edda", t: _t("Chez moi, une carte servait toute une vie. On la donnait à ses enfants.") },
      { w: "edda", t: _t("Ici, la mienne ne tient pas une nuit.") },
      { choix: [
        { t: _t("Pourquoi être venue, alors ?"), suite: [{ w: "edda", t: _t("Justement. Je voulais voir un endroit qui ne se laisse pas dessiner.") }] },
        { t: _t("Tu pourrais rentrer."), suite: [{ w: "edda", t: _t("Je pourrais. Mais je ne saurais jamais ce qu'il y a au bout de la rue qui se refait.") }] }] },
      { w: "edda", t: _t("Mon père disait qu'une carte, c'est une promesse : demain, ce sera encore là.") },
      { w: "n", t: _t("Elle ouvre son carnet sur une page à moitié effacée.") },
      { w: "edda", t: _t("Ici, personne ne promet rien. Même pas les murs.") }] },
    { id: "edda_2", companion: "edda", step: "ruines_06", after: "edda_1", lines: [
      { w: "edda", t: _t("Tout tourne autour d'une seule pierre. La pierre de seuil. Elle n'a jamais bougé.") },
      { w: "edda", t: _t("Les rues se refont autour d'elle. Comme si elle tenait la ville par le milieu.") },
      { choix: [
        { t: _t("Quelqu'un l'a posée là exprès."), suite: [{ w: "edda", t: _t("Quelqu'un qui savait que le reste bougerait. C'est ce qui m'inquiète.") }] },
        { t: _t("Ou elle est juste trop lourde."), suite: [{ w: "edda", t: _t("Maddoc a dit pareil. Il a essayé. Elle n'est pas lourde. Elle refuse.") }] }] },
      { w: "edda", t: _t("Le Veilleur ne passe jamais devant. Il fait le tour.") },
      { w: "n", t: _t("Elle trace un cercle dans la poussière, et un point au milieu. Elle efface le point.") }] },
    { id: "edda_3", companion: "edda", step: "ruines_10", after: "edda_2", unlocks: { quest: "q_edda_1", title: _t("La carte qui ne se finit pas") }, lines: [
      { w: "edda", t: _t("Chaque matin, un coin de ma carte est faux. Je le refais. Le lendemain, un autre.") },
      { w: "edda", t: _t("Ma craie s'use plus vite que la ville ne bouge. Je perds.") },
      { choix: [
        { t: _t("On peut t'aider à la tenir."), suite: [{ w: "edda", t: _t("Trois quartiers dans la même journée. Si on les relève assez vite, la carte tiendra une nuit.") }] },
        { t: _t("Une carte fausse, c'est déjà une carte."), suite: [{ w: "edda", t: _t("Sarkel en vendait. Moi, je ne sais pas. Je veux qu'elle soit vraie, au moins une fois.") }] }] },
      { w: "edda", t: _t("Il me faut des repères. De la pierre qui ne bouge pas, posée aux coins.") },
      { w: "edda", t: _t("Après, il faudra courir. Toi, tu cours bien.") }] },
    { id: "edda_4", companion: "edda", step: "crypte_01", after: "edda_3", lines: [
      { w: "edda", t: _t("Je croyais que ce serait plus facile, ici. Rien ne bouge.") },
      { w: "edda", t: _t("Mais ma main tremble. Elle a pris l'habitude de se dépêcher.") },
      { choix: [
        { t: _t("Tu peux prendre ton temps, maintenant."), suite: [{ w: "edda", t: _t("Oui. C'est ça qui est difficile. Je ne sais plus faire lentement.") }] },
        { t: _t("Ce qui dort ici ne bouge pas non plus."), suite: [{ w: "edda", t: _t("Pas encore. Ysolt dit qu'ils se lèvent toujours, un jour.") }] }] },
      { w: "edda", t: _t("En haut, la ville se refait. En bas, on range. Les deux veulent que rien ne se perde.") },
      { w: "n", t: _t("Elle dessine un couloir d'un seul trait. Il est droit. Elle le regarde longtemps, comme une chose rare.") }] },
    { id: "edda_5", companion: "edda", step: "crypte_07", after: "edda_4", afterQuest: "q_edda_1", unlocks: { quest: "q_edda_2", title: _t("Cartographier les dormeurs") }, lines: [
      { w: "edda", t: _t("Ysolt m'a demandé de dessiner où ils dorment. Chaque couloir a les siens.") },
      { w: "edda", t: _t("Personne ne m'avait jamais demandé de dessiner des gens.") },
      { choix: [
        { t: _t("C'est une carte pour qu'on ne les réveille pas."), suite: [{ w: "edda", t: _t("Ou pour qu'on sache qui on réveille, si on le fait. Les deux.") }] },
        { t: _t("Ils ne la liront jamais."), suite: [{ w: "edda", t: _t("Les cartes ne sont pas pour ceux qui sont dessus.") }] }] },
      { w: "edda", t: _t("Il faudra passer à côté d'eux sans un bruit. Toi devant, moi derrière, avec la craie.") }] },
    { id: "edda_6", companion: "edda", step: "montagne_14", after: "edda_5", afterQuest: "q_edda_2", unlocks: { quest: "q_edda_3", title: _t("La dernière page") }, lines: [
      { w: "edda", t: _t("Mon carnet est presque plein. Il me reste une page.") },
      { w: "edda", t: _t("J'ai dessiné une ville qui bouge, des morts qui dorment, une montagne qui brûle. Il manque quelque chose.") },
      { choix: [
        { t: _t("Il manque nous."), suite: [{ w: "edda", t: _t("Oui. Je l'ai dit une fois, là-bas. Je ne l'ai jamais fait.") }] },
        { t: _t("Garde-la pour la Tour."), suite: [{ w: "edda", t: _t("La Tour aura son carnet. Celle-là, c'est pour ce qu'on a déjà fait.") }] }] },
      { w: "edda", t: _t("Il me faut un endroit d'où l'on voit tout le chemin. Depuis Aeswyn.") }] },
    { id: "ysolt_1", companion: "ysolt", step: "crypte_03", after: null, lines: [
      { w: "ysolt", t: _t("Vous faites du bruit en dormant. Eux, jamais.") },
      { choix: [
        { t: _t("Tu ne dors pas ?"), suite: [{ w: "ysolt", t: _t("J'ai assez dormi. Quelqu'un doit rester éveillé.") }] },
        { t: _t("Ça te manque, le silence."), suite: [{ w: "ysolt", t: _t("Non. Le bruit, je l'avais oublié. Je le réapprends.") }] }] },
      { w: "ysolt", t: _t("Wenna ronfle un peu. Ne lui dis pas.") },
      { w: "n", t: _t("Elle a le carquois vide sur les genoux. Ses doigts comptent quelque chose sur le cuir, sans fin.") }] },
    { id: "ysolt_2", companion: "ysolt", step: "crypte_04", after: "ysolt_1", lines: [
      { w: "ysolt", t: _t("Sarkel croit que le pain, c'est pour les nourrir. Ce n'est pas ça.") },
      { w: "ysolt", t: _t("Le pain, ils s'en souviennent. L'odeur. La table. Quelqu'un qui coupe.") },
      { choix: [
        { t: _t("Toi aussi, tu t'en souviens."), suite: [{ w: "ysolt", t: _t("Un peu. Une table en bois. Une main sur la mienne. Pas le visage.") }] },
        { t: _t("Alors ils ne sont pas tout à fait partis."), suite: [{ w: "ysolt", t: _t("Personne ne part tout à fait, ici. C'est le problème. Et c'est bien aussi.") }] }] },
      { w: "ysolt", t: _t("Les noms, eux, s'en vont. On les oublie avant le reste.") },
      { w: "n", t: _t("Elle ne dit pas le sien. Elle sait que tu le connais.") }] },
    { id: "ysolt_3", companion: "ysolt", step: "crypte_09", after: "ysolt_2", unlocks: { quest: "q_ysolt_1", title: _t("Le carquois sans flèches") }, lines: [
      { w: "ysolt", t: _t("Tu regardes mon carquois. Tout le monde le regarde.") },
      { w: "ysolt", t: _t("J'avais des flèches. À chaque montée, j'en laissais une. Pour retrouver le chemin.") },
      { choix: [
        { t: _t("Il en manque une, alors."), suite: [{ w: "ysolt", t: _t("La dernière. Celle de la neuvième fois. Elle doit être au fond.") }] },
        { t: _t("Tu n'en as plus besoin."), suite: [{ w: "ysolt", t: _t("Peut-être. Mais elle est à moi. On ne laisse pas une chose à soi traîner chez les autres.") }] }] },
      { w: "ysolt", t: _t("Les alcôves du fond. Quelque chose y garde la place. Ça ne m'aime plus beaucoup.") }] },
    { id: "ysolt_4", companion: "ysolt", step: "crypte_16", after: "ysolt_3", afterQuest: "q_ysolt_1", unlocks: { quest: "q_ysolt_2", title: _t("La neuvième montée") }, lines: [
      { w: "ysolt", t: _t("Tu m'as tendu la main. Je l'ai prise. Je ne sais pas encore si c'était bien.") },
      { choix: [
        { t: _t("Tu peux encore changer d'avis."), suite: [{ w: "ysolt", t: _t("Non. Une fois levée, on ne choisit plus. On marche.") }] },
        { t: _t("Moi, je sais que c'était bien."), suite: [{ w: "ysolt", t: _t("Tu as la main chaude. C'est facile, pour toi.") }] }] },
      { w: "ysolt", t: _t("Il y a une forme dans la pierre, au fond. Ma taille. Je n'y suis pas retournée.") },
      { w: "ysolt", t: _t("Je voudrais la voir vide. Une fois. Pour compter la neuvième.") }] },
    { id: "ysolt_5", companion: "ysolt", step: "montagne_18", after: "ysolt_4", afterQuest: "q_ysolt_2", unlocks: { quest: "q_ysolt_3", title: _t("Les marches comptées ensemble") }, lines: [
      { w: "ysolt", t: _t("Ici, il fait chaud. J'avais oublié que la chaleur pouvait gêner.") },
      { w: "ysolt", t: _t("J'ai dit que je compterai. Je compte. Les jours, les pas, les feux.") },
      { choix: [
        { t: _t("Tu en es à combien ?"), suite: [{ w: "ysolt", t: _t("Beaucoup. Plus que huit. C'est la première fois que je dépasse huit.") }] },
        { t: _t("Pourquoi tu comptes ?"), suite: [{ w: "ysolt", t: _t("Pour savoir que ça avance. Couchée, rien n'avance.") }] }] },
      { w: "ysolt", t: _t("Je voudrais monter une fois avec vous tous. Et compter à voix haute.") }] },
    { id: "sarkel_1", companion: "sarkel", step: "montagne_03", after: null, lines: [
      { w: "sarkel", t: _t("Trente ans que je vends. Du sel, de l'eau, des noms. Je savais toujours à qui.") },
      { w: "sarkel", t: _t("Ces éclats-là, je ne sais pas.") },
      { choix: [
        { t: _t("Tu n'es pas obligé de les vendre."), suite: [{ w: "sarkel", t: _t("Tu dis ça comme si c'était simple. Je ne sais rien faire d'autre d'une chose qu'on garde.") }] },
        { t: _t("Tu trouveras un acheteur."), suite: [{ w: "sarkel", t: _t("J'en trouve toujours. C'est bien ça qui m'ennuie, cette fois.") }] }] },
      { w: "n", t: _t("Il sort un éclat de sa poche, le pèse dans sa main, et le remet.") }] },
    { id: "sarkel_2", companion: "sarkel", step: "montagne_05", after: "sarkel_1", lines: [
      { w: "sarkel", t: _t("Le vieux du Temple a taillé ici. Avant. Bien avant.") },
      { w: "sarkel", t: _t("Je l'ai vu dans sa main. Une main de tailleur, ça ne ment pas. Pleine de petites cicatrices blanches.") },
      { choix: [
        { t: _t("Il ne t'en a jamais parlé ?"), suite: [{ w: "sarkel", t: _t("Il ne parle de rien. Il paie, c'est tout. Il paie bien.") }] },
        { t: _t("Tu es monté pour lui."), suite: [{ w: "sarkel", t: _t("Pour voir sa coupe. Ce n'est pas pareil. Enfin. Un peu.") }] }] },
      { w: "sarkel", t: _t("S'il a taillé cette montagne, il savait ce qu'il y avait dedans. Et il est descendu quand même.") },
      { w: "n", t: _t("Sarkel regarde la paroi comme on regarde un client qui ne dit pas son prix.") }] },
    { id: "sarkel_3", companion: "sarkel", step: "montagne_06", after: "sarkel_2", unlocks: { quest: "q_sarkel_1", title: _t("Ce qu'il refuse de vendre") }, lines: [
      { w: "sarkel", t: _t("Tu as vu ma boîte. Tu la regardes depuis trois jours.") },
      { w: "sarkel", t: _t("Dedans, il y a mon premier éclat. Le premier qui est tombé comme il fallait.") },
      { choix: [
        { t: _t("Combien tu en veux ?"), suite: [{ w: "sarkel", t: _t("Ha. Rien. C'est bien ça le problème. Elle n'a pas de prix.") }] },
        { t: _t("Tu le gardes pour toi."), suite: [{ w: "sarkel", t: _t("Non. Pour la coupe du vieux. Je veux le poser à côté. Voir si ça tient la comparaison.") }] }] },
      { w: "sarkel", t: _t("Il faut monter jusqu'à sa coupe. Et je veux tailler une vraie pierre avant. Pas un éclat. Une pierre.") }] },
    { id: "sarkel_4", companion: "sarkel", step: "montagne_19", after: "sarkel_3", afterQuest: "q_sarkel_1", unlocks: { quest: "q_sarkel_2", title: _t("Ceux qui sont couchés là-haut") }, lines: [
      { w: "sarkel", t: _t("En bas, on laisse du pain aux morts. Ils s'en souviennent.") },
      { w: "sarkel", t: _t("Là-haut, ceux que le Dragon a triés attendent depuis plus longtemps que la Crypte. Personne ne leur a jamais rien laissé.") },
      { choix: [
        { t: _t("Tu veux les coucher, comme en bas."), suite: [{ w: "sarkel", t: _t("Je veux qu'ils arrêtent d'attendre. Coucher, c'est le mot d'Ysolt. Le mien, c'est fermer boutique.") }] },
        { t: _t("Ce ne sont pas les tiens."), suite: [{ w: "sarkel", t: _t("Non. Mais ils ont taillé avant moi. Entre gens du métier, on se doit bien ça.") }] }] },
      { w: "sarkel", t: _t("Du pain, de la pierre taillée. Et une clé. J'ai une clé. Je ne savais pas pour quoi, jusqu'ici.") }] }
  ];
}

window.companionTalksData = companionTalksData;
