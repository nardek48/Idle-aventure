"use strict";
/* ui/news-view.js — v3.592.0 : « Quoi de neuf » après une mise à jour (atelier quoi-de-neuf.html, choix A de Seb).
   - Une fenêtre centrée, une seule fois après une mise à jour, partie chargée, héros libre ;
     jamais pour un nouveau joueur (il découvre tout).
   - Les nouveautés depuis la dernière version vue sur cet appareil (préférence « newsSeen »),
     5 lignes au plus ; « Tout voir » ouvre la liste groupée par version.
   - Paramètres › Partie › Mises à jour : « Voir les nouveautés ».
   À chaque version visible pour le joueur : une ou deux lignes en tête de newsEntries(). */

/* [version, icône, texte] — la plus récente en premier. Textes littéraux : audit i18n. */
function newsEntries() {
  return [
    ["3.793.0", "scene/pa2_besace", _t("Petites Aventures : la Montagne et la Tour ont leurs propres mots (« Gravir la montagne », « Monter l'escalier »…) au lieu de ceux de la Forêt.")],
    ["3.792.0", "codex/codex_lore", _t("Tutoriels : la Montagne (le sol qui brûle, les veines de la carte) et les étages de la Tour s'expliquent aussi sur l'écran. 40 aides éclairent maintenant les vrais boutons.")],
    ["3.791.0", "codex/codex_lore", _t("Tutoriels : les écrans des Ruines et de la Crypte s'expliquent aussi sur l'écran (compagnons, Marché, murs qui bougent, obscurité, chantier errant, Cœur, gisants).")],
    ["3.790.0", "codex/codex_lore", _t("Tutoriels : les quêtes du village (zones, niveaux et améliorations du Champs, ateliers) s'affichent aussi sur l'écran.")],
    ["3.789.0", "codex/codex_lore", _t("Tutoriels : neuf aides de plus s'affichent sur l'écran, en éclairant les vrais boutons (silence, outre, nuée, Forge, pronostic, équipement, nuit et pièges des Petites Aventures, Terrain d'entraînement).")],
    ["3.788.0", "workshops/camp_kitchen", _t("Simplification des rations (4/4) : la Boulangerie et la Cuisine de camp ferment. Le pain et les rations en stock reviennent en blé, viande et eau. Les braises, le dernier camp et l'Apothicaire demandent maintenant du brut.")],
    ["3.787.0", "scene/pa2_besace", _t("Simplification des rations (3/4) : dans la besace des Petites Aventures, les trois rations sont gratuites et toujours là. Seule la place compte : Petite (1 place), Moyenne (2), Grande (3).")],
    ["3.786.0", "camp/camp_meal", _t("Simplification des rations (2/4) : au Camp, un seul bouton « Repas » remet toute l'équipe à plein, payé en blé, viande et eau selon les PV qui manquent. Le festin passe à côté, et les PV des compagnons s'affichent en anneaux : touche-en un pour lui parler.")],
    ["3.785.0", "resources/ration_icon", _t("Simplification des rations (1/4) : refaire un donjon, une élite de carte ou le mode libre ne demande plus de vivres. Les expéditions, les traversées et la Faille partent sans ration.")],
    ["3.784.0", "village_buildings/enchantress_tower", _t("Simplification : l'Enchanteresse ne relance plus la valeur des bonus. Elle remplace un bonus indésirable (Transmuer). Le Doigté de la boutique d'Éclats réduit maintenant le prix des transmutations.")],
    ["3.783.0", "system/upgrade", _t("« Quoi de neuf » ne s'ouvre plus tout seul : une ligne « Nouveautés » dans la fenêtre de retour, sinon une notification. La liste reste dans Paramètres. La fenêtre « La Forge a changé » est retirée.")],
    ["3.782.0", "system/offline_progress", _t("Pendant ton absence : la récolte et le butin des patrouilles sont faits à l'ouverture. La fenêtre n'est plus qu'un bilan, avec un bouton vers la suite ; la ration n'est proposée que si tes PV sont bas.")],
    ["3.781.0", "codex/codex_lore", _t("Tutoriels : sept aides de plus s'affichent sur l'écran, en éclairant les vrais boutons (Amélioration, Boutique, ration, Donjon, compagnons, braises, préparation de la sortie).")],
    ["3.780.0", "village_buildings/merchant_hall", _t("Simplification : les caravanes sont retirées. Aux Ruines et à la Crypte, la marchandise de Sarkel se livre depuis la carte d'étape (« Livrer au Marché »). La Halle marchande garde l'échoppe ; une caravane encore en route est livrée au chargement.")],
    ["3.779.0", "special_attacks/spell_ranks", _t("Simplification : les rangs des techniques et de la défense ne s'achètent plus, ils montent avec les mondes (rang 1 au Désert, jusqu'au rang 5 à la Tour). Les jalons des rangs deviennent des jalons d'entraînement et de reliques.")],
    ["3.778.0", "village_buildings/tavern", _t("Simplification : les contrats de la Taverne passent au tableau des missions (Quêtes › Annexes), avec « Livrer » sur place. La fiche de la Taverne en garde le résumé, ses niveaux donnent toujours plus de contrats.")],
    ["3.777.0", "subtabs/dungeon", _t("Simplification : les Marques du donjon sont retirées, le niveau du donjon règle déjà la difficulté. L'étape « Sous les racines » demande 5 vagues de la Tanière.")],
    ["3.776.0", "system/sortie_prep", _t("Simplification : les objets de combat contre les traits (Baume froid, Huile de lame, Acide mordant…) sont retirés, le Grimoire contre les traits. La Fiole noire reste.")],
    ["3.775.0", "quest_icons/exploration/faille", _t("Simplification : le Labyrinthe aux leviers des Ruines est retiré. La Faille, après la fin de l'Histoire, garde ses salles dans le noir et ses leviers.")],
    ["3.774.0", "classes/chaos", _t("Création du héros : la variante du Chaos s'ouvre maintenant quand un de tes héros a fini l'Histoire. Les héros du Chaos déjà créés ne changent pas.")],
    ["3.773.0", "menu_icons/map_menu", _t("Nouvelles images : les objets et les fins cachées des Petites Aventures, les fins de la Tour, la Forge des mondes, et une image propre pour le campement et la sortie du donjon, le repos, le stock, l'objectif et les fenêtres de confirmation.")],
    ["3.772.0", "menu_icons/village_menu", _t("Mode PC : l'en-tête de chaque écran devient un bandeau bas, le contenu commence plus haut. Bibliothèque, Journal et Paramètres sont groupés au bas du menu, la fiche des bâtiments passe en parchemin.")],
    ["3.772.0", "menu_icons/camp_menu", _t("Mode PC : les notifications s'affichent en bas à droite (à droite du combat), les ressources du haut portent leur nom, et le Camp range les Expéditions sous le feu.")],
    ["3.771.0", "menu_icons/map_menu", _t("Petites Aventures : un nouveau tutoriel explique les petites quêtes du chemin (la cache, le verrou et sa clé, les passages secrets, les fins imposées et cachées), à la première que tu croises.")],
    ["3.770.0", "menu_icons/village_menu", _t("Forge de la Tour : avant « La rue qui tient », le Givre bleu et le Verre de faille sont marqués introuvables, avec l'étape qui les ouvre, au lieu de paraître à portée.")],
    ["3.769.0", "menu_icons/quests_menu", _t("Le Seigneur de guerre orc frappe moins fort (comme les autres boss) mais tient plus longtemps : toujours un vrai combat, beaucoup moins de défaites sèches.")],
    ["3.768.0", "menu_icons/quests_menu", _t("Quêtes : le badge Facile, Moyen ou Difficile dit maintenant la vraie difficulté, mesurée sur des dizaines de parties. Le pronostic de combat est recalé pour les trois classes, il prévient mieux le Rôdeur.")],
    ["3.763.0", "classes/class_ranger", _t("Équilibre des classes : le Rôdeur encaisse un peu mieux et le Mage aussi, le Chevalier garde sa solidité. Les boss sont maintenant les mêmes pour les trois classes ; c'est le héros qui porte sa différence.")],
    ["3.761.0", "codex/codex_lore", _t("Tutoriels : les premiers (Campement, premier combat, Village, carte, Petite Aventure, Grimoire, talents) s'affichent sur l'écran lui-même. L'élément est éclairé, une bulle explique, « Suivant » ou un toucher sur l'élément pour avancer.")],
    ["3.760.0", "aether_icon", _t("Fil rouge : il propose aussi de construire ou d'améliorer un bâtiment du village dès que tu as de quoi le faire, et la prochaine quête annexe.")],
    ["3.759.0", "subtabs/talents", _t("Talents : l'écran prend le style du reste du jeu. Onglets Classe / Commandement du kit, points en tête de l'arbre, cadres sur l'arbre et le panneau du talent.")],
    ["3.758.0", "subtabs/talents", _t("Talents : le bouton « Apprendre » ne déborde plus de l'écran.")],
    ["3.757.0", "village_buildings/village_forge", _t("Village : les pastilles de niveau des cartes ne passent plus par-dessus les onglets quand la liste défile.")],
    ["3.756.0", "system/settings_game", _t("Petites Aventures : nouveau réglage « Jets de dés instantanés » (Paramètres) : le dé se pose tout de suite sur sa valeur. Il est aussi instantané si ton téléphone demande moins d'animations.")],
    ["3.755.0", "subtabs/dungeon", _t("Donjons : quand l'objectif de l'Histoire est tenu en plein run (Tanière, Cité engloutie), le combat s'arrête et tu choisis : sortir avec tout ton butin, ou continuer vers le boss. Au campement des donjons suivants, une ligne te dit que l'objectif est tenu.")],
    ["3.754.0", "village_buildings/village_forge", _t("Forge : un matériau fait par un atelier que l'Histoire n'a pas encore ouvert (le Verre trempé avant « Le verre des dunes ») est marqué introuvable, avec l'étape qui l'ouvre, au lieu d'envoyer vers un atelier fermé.")],
    ["3.749.0", "village_buildings/apothecary", _t("Apothicaire : la journée finie, « Presser » prépare une potion ou un objet de plus contre de l'or. Le prix double à chaque fois et revient le lendemain.")],
    ["3.748.0", "gold_icon", _t("Rafale : une élite de carte ne meurt plus deux fois, son or n'est plus compté en double.")],
    ["3.746.0", "dungeon/boss_crown", _t("La Liche des sépulcres retrouve ses PV d'avant : elle était devenue trop dure pour le Rôdeur.")],
    ["3.745.0", "gold_icon", _t("Bulle d'or : le « + » doré se rallume aussi quand ton or a doublé. Ses achats sont rangés en trois groupes (tout de suite, il manque quelque chose, plus tard), avec l'échoppe et l'Enchanteresse, et une carte par matériau qui bloque ton or.")],
    ["3.744.0", "combat_status/elite_surge", _t("Élites : celles de la Crypte et de la Montagne ont plus de PV, celles de la Tour plus de PV et frappent plus fort, pour rester un vrai défi avec la Forge des mondes.")],
    ["3.743.0", "village_buildings/village_forge", _t("Forge des mondes : une reforge renforce ton héros pour toujours (+0,5 % par reforge : PV au Désert, Défense aux Ruines, critique à la Crypte, dégâts à la Montagne, dégâts critiques à la Tour). 2 niveaux de Forge par monde, jusqu'à la Forge 10. Les boss de la Crypte, de la Montagne et de la Tour ont un peu plus de PV.")],
    ["3.742.0", "dungeon/boss_crown", _t("Boss plus longs : le Basilic, le Sphinx, Varrek, Nezzam et l'Orc tiennent plus longtemps et changent de rythme plus tôt. Un boss déjà vaincu annonce ses phases au pronostic : prépare-toi à sa rage.")],
    ["3.741.0", "system/settings_game", _t("Journal de test : il note aussi où part ton or (entraînement du héros, rangs de techniques, niveaux et sorts des compagnons).")],
    ["3.740.0", "village_buildings/caravan_market", _t("La caravane d'essai que l'Histoire demande (Ruines, Crypte) revient maintenant en 3 minutes au lieu de 10.")],
    ["3.739.0", "system/sortie_prep", _t("Préparer la sortie : « Tout préparer » n'emporte plus l'Huile de lame d'office (elle reste proposée) ; seul le Baume froid, utile face à un miroir, est ajouté automatiquement.")],
    ["3.738.0", "system/sortie_prep", _t("Préparer la sortie : « Ce que tu vas affronter » propose aussi les objets de combat qui contrent une situation (« Ou emporte : Baume froid »), avec ton stock ou l'endroit où le préparer, et un bouton pour l'emporter.")],
    ["3.737.0", "classes/class_ranger", _t("La Silhouette, face au Rôdeur : « elle se bat comme toi », elle ne se soigne donc pas, et elle a moins de PV. Le Rôdeur n'était plus capable de la battre ; il gagne maintenant près de 9 fois sur 10 (Chevalier et Mage inchangés).")],
    ["3.736.0", "system/grimoire", _t("Grimoire vivant : 3 règles actives, rangées en jeux que tu changes d'un toucher (un jeu de plus par monde). Avant chaque sortie, le pronostic coche les situations couvertes et propose d'ajouter la règle qui manque (« Tout préparer »). Tes règles 4 à 6 sont gardées dans un jeu « Mes autres règles ».")],
    ["3.735.0", "combat_stats/stat_health", _t("Pronostic « Avant de partir » : l'avertissement de PV bas se déclenche maintenant sous 50 % de tes PV, comme le rappel à l'acceptation d'une étape.")],
    ["3.734.0", "dungeon/dungeon_entrance", _t("Donjon : quand l'étape demande une Marque, l'écran d'entrée le rappelle, et partir sans Marque demande confirmation. Accepter une étape de combat sous 50 % de PV propose d'aller d'abord au feu.")],
    ["3.733.0", "camp/campfire", _t("Correctif : à l'étape « Les braises s'éveillent », le bouton de la carte de mission fait maintenant l'offrande aux braises. Avant, « Partir » renvoyait au Campement sans rien faire et on restait bloqué.")],
    ["3.732.0", "combat_status/heal_incoming", _t("Boss : leur soin rend maintenant 10 % de leurs PV max (au lieu de 15 % des PV qui leur restent). Un boss presque vaincu se soigne autant qu'un boss en pleine forme : contrer son soin compte à chaque phase.")],
    ["3.731.0", "classes/class_mage", _t("Mage : les ennemis ne se renforcent plus en reprenant ses PV en plus (ils tapaient jusqu'à 12 % plus fort que pour les autres classes). Sur « Les pentes » de la Montagne, il gagne près de 4 fois sur 5 au lieu de 3 sur 5.")],
    ["3.730.0", "combat_status/counter", _t("Contres : une Défense jouée contre une annonce (Charge, Silence, Exaltation) couvre aussi tes compagnons tant qu'elle dure, et une Charge contrée te rend le tour : tu frappes dans la foulée.")],
    ["3.729.0", "system/grimoire", _t("Grimoire : il ne montre plus que les situations que tu as déjà rencontrées en combat. Chaque nouvelle situation s'y ajoute avec un court message (« Nouvelle règle au Grimoire »).")],
    ["3.728.0", "living_map/carte_vivante", _t("Petites Aventures : l'écran prend le décor du monde de l'aventure (une aventure de la Tour ne s'affiche plus sur le fond de la Forêt), et la fuite a son propre chemin dans chaque monde.")],
    ["3.727.0", "living_map/carte_vivante", _t("Petites Aventures de la Tour : trois accroches à leur tour. Des pas qui redescendent vers un sac caché, une porte que personne ne tient, et une marche en trop qui mène à un palier que l'escalier ne montre pas.")],
    ["3.726.0", "living_map/carte_vivante", _t("Petites Aventures de la Crypte et de la Montagne : la boîte à mèches, la niche aux lampes cachée, la chapelle, la veine de la pioche (la lave attend pendant le détour), la source chaude, et des passages secrets.")],
    ["3.725.0", "living_map/carte_vivante", _t("Petites Aventures du Désert et des Ruines : à leur tour, les accroches agissent sur la carte. Le bât enterré, le pont de l'oued, la tour de guet cachée, l'arche murée, les pièces du socle, la cour au puits, et des passages secrets.")],
    ["3.724.0", "living_map/carte_vivante", _t("Petites Aventures de la Forêt : les accroches agissent sur la carte. Un trésor à aller chercher en arrière, une passerelle fermée à ouvrir ou forcer, une fin imposée, une fin cachée, et des passages secrets qu'une fouille peut révéler.")],
    ["3.723.0", "scene/pa2_besace", _t("Petites Aventures : nouvel écran « Prêt à partir ». La besace se lit d'un coup d'œil (usages, soins emportés), on ajoute plusieurs objets sans fermer, les pactes se règlent sur le même écran et le bouton de départ montre le vrai butin final. Seuls les objets que tu as, et ceux du monde, sont proposés.")],
    ["3.722.0", "menu_icons/menu_menu", _t("Les fenêtres passent sur le cadre parchemin de Seb : titre sur le parchemin, filets dorés, texte plus grand. Dans le fil rouge, « Pendant ce temps… » liste les autres choses à faire.")],
    ["3.721.0", "menu_icons/menu_menu", _t("Texte des boutons agrandi. Les derniers boutons à part (festin, Expéditions, « Tu es ici », Taverne, Hauts faits, reliques) prennent eux aussi le style cuivre et parchemin.")],
    ["3.720.0", "menu_icons/menu_menu", _t("Les prix, « Préparer » et « Relancer » prennent le bouton cuivre en petit. Un bouton au libellé trop long passe proprement sur deux lignes.")],
    ["3.719.0", "menu_icons/menu_menu", _t("Boutons unifiés sur les dessins de Seb : cuivre pour l'action principale, parchemin pour les autres. Ils prennent la largeur de leur texte (plus de boutons étirés) et une somme passe en deuxième ligne (« Offrir », « +8 Aether »).")],
    ["3.718.0", "system/forecast", _t("37 nouvelles icônes : chaque image ne sert plus qu'à une chose (Campement, Boutique des potions, caravanes, hauts faits, pronostic…) et les emojis des conseils sont remplacés par des images.")],
    ["3.717.0", "workshops/smithing_station", _t("Les paliers d'équipement de l'Histoire ne bloquent plus : ce sont neuf scènes avec tes compagnons et Aeswyn. Le pronostic « Avant de partir » dit ce qui est conseillé dans la zone (rareté, reforge de l'arme).")],
    ["3.716.0", "combat_status/counter", _t("Combats de groupe : le Grimoire voit l'annonce de chaque ennemi, pas seulement de ta cible, et contre celui qui frapperait le premier.")],
    ["3.715.0", "menu_icons/menu_menu", _t("Le cadre du haut et la barre du bas s'alignent sur les cartes : 4 px du bord de l'écran.")],
    ["3.714.0", "living_map/carte_vivante", _t("Le Périple rapporte davantage : 5 matériaux rares à l'arrivée au lieu de 4.")],
    ["3.713.0", "special_attacks/attack4", _t("Rôdeur : en combat auto et dans le conseil doré (Grimoire sans règle), Tir perforant passe en priorité dès qu'il est prêt, et la Concentration est gardée pour lui. Contres d'annonce, Défense et règles de ton Grimoire passent toujours devant.")],
    ["3.712.0", "menu_icons/menu_menu", _t("Bandeau du haut sans bordure noire autour du cadre ; sous l'onglet choisi, un filet lumineux et son losange remplacent l'ancienne lueur.")],
    ["3.711.0", "menu_icons/menu_menu", _t("Bandeau du haut et barre du bas plus nets : les pièces de Seb sont détourées proprement (plus de liseré clair) et les icônes du bas n'ont plus de fond.")],
    ["3.710.0", "menu_icons/menu_menu", _t("Nouveau bandeau du haut et nouvelle barre du bas, sur les dessins de Seb. Le « + » à côté de l'or ouvre « Ton or peut servir » et pulse quand une dépense t'attend (il remplace la bulle dorée).")],
    ["3.709.0", "special_attacks/attack4", _t("Rôdeur : Tir perforant traverse désormais sa cible, un second ennemi debout reçoit le même coup. Tutoriel de l'Amélioration : Précision et Volonté ont leur propre icône.")],
    ["3.708.0", "system/wrench_settings", _t("Outil d'administration plus fidèle : une étape d'Histoire forcée pose aussi l'équipement, les secteurs et les compteurs qu'elle demande.")],
    ["3.707.0", "menu_icons/camp_menu", _t("Petits écrans : la mission d'Histoire du Camp tient au-dessus de la barre du bas (« Accepter » visible dès l'ouverture), et l'écran de retour montre « Décharger » sans défiler.")],
    ["3.706.1", "menu_icons/camp_menu", _t("Petit écran en texte « Grande » : le bandeau illustré s'efface pour laisser la place aux boutons (« Accepter » du Camp n'est plus caché par la barre du bas).")],
    ["3.706.0", "village_buildings/caravan", _t("Écran de retour : une caravane rentrée s'y décharge d'un toucher. Entrepôt : un repère montre la part gardée par le Grand Ouvrage. Sac : nouveau tri « Intérêt », et le ▼ signale aussi un objet nettement moins bon.")],
    ["3.705.0", "menu_icons/quests_menu", _t("Quêtes, Boutique et Donjon s'affichent comme le Camp et le Village : un peu plus de largeur sur téléphone, et dans les Quêtes, les onglets (Histoire, Annexes, Aventure…) restent sous le bandeau replié quand on défile.")],
    ["3.704.0", "codex/codex_lore", _t("Aides : neuf nouvelles fiches (Taverne, événements du village, hauts faits, Bestiaire, quêtes des compagnons, Chaos, pronostic, préparation de sortie, équipement), une seule fois et rangées dans Tutoriels. Au Camp, la carte d'Histoire montre le récit de l'étape (pli « Récit »), et l'arbre de talents dit quand vient le prochain point.")],
    ["3.703.0", "menu_icons/menu_menu", _t("Fenêtres : sur petit écran, les aides tiennent mieux et une pastille « Suite ↓ » signale qu'il reste à lire ; au clavier, feuilles et fenêtres gardent le focus et le rendent en se fermant. Les Quêtes, la Boutique et le Donjon gagnent aussi de la largeur sur téléphone.")],
    ["3.702.0", "menu_icons/settings_menu", _t("Petits écrans : les pages gagnent de la largeur, les onglets restent sous la main en défilant, « Partir » et « Abandonner » ne se touchent plus, et les petits liens se touchent mieux. En combat avec compagnons, la ressource du héros s'affiche en entier.")],
    ["3.701.0", "menu_icons/bestiaire_menu", _t("Les faiblesses et résistances des ennemis disparaissent : chaque arme frappe toutes les créatures de la même façon, et le Bestiaire n'en parle plus.")],
    ["3.700.0", "menu_icons/bestiaire_menu", _t("Le Dragon ancien frappe moins fort face au Mage, et le pronostic prévient mieux un Mage sans arme. Le Bestiaire n'affiche plus de faiblesses pour les boss et les élites : elles n'ont pas d'effet sur eux.")],
    ["3.699.0", "combat_stats/stat_attack", _t("Combat de groupe : la faiblesse ou la résistance de l'ennemi frappé compte enfin, même s'il n'est pas le premier du groupe. L'Entrepôt dit où se cuisinent les rations.")],
    ["3.698.0", "menu_icons/bestiaire_menu", _t("Le Dragon ancien est moins coriace. Le pronostic d'une mission ne change plus d'une ouverture à l'autre, et le Bestiaire n'a plus qu'une fiche pour le Golem.")],
    ["3.697.0", "menu_icons/village_menu", _t("L'écran de retour survit à un rechargement, « Village & Production » s'ouvre dès la première visite du Village, les cartes d'achat payables ne sont plus voilées, et la 2e aventure des Ruines s'appelle « Nef ensevelie ».")],
    ["3.697.0", "menu_icons/map_menu", _t("Combat : « Régler d'un coup » vaut aussi pour une élite répétable de carte jugée sans danger. Les compagnons arrivés tard ouvrent leurs emplacements de relique plus tôt. Petite Aventure : annuler la préparation garde le même tirage pendant 4 h.")],
    ["3.696.0", "menu_icons/village_menu", _t("Équilibrage : le Golem du Sanctuaire scellé frappe moins fort, la Liche des sépulcres et le Porte-couronne de l'Ossuaire frappent plus fort, et l'échoppe est moins chère aux Ruines (une Rare à 17 500 or au lieu de 25 000). Les talents Faucon du Rôdeur donnent un conseil.")],
    ["3.695.0", "combat_status/counter", _t("Combat : le conseil doré (et le Grimoire sans règle) ne propose plus la Défense sans menace ; « Varier » ne saute plus un contre. Les ennemis très rapides des donjons 4 à 6 ne frappent plus deux fois à chaque round, et le pronostic compte les potions plus prudemment.")],
    ["3.694.0", "menu_icons/village_menu", _t("Économie : le Grand Ouvrage garde toujours assez de pierre pour la Forge que l'Histoire demande. Les potions se revendent au plus la valeur de leurs ingrédients (Soin mineur 16 or), prix affiché sur le bouton.")],
    ["3.693.0", "menu_icons/heroes_menu", _t("Compagnons : la première patrouille rapporte toujours sa relique, « Répartir de nouveau » prévient quand des reliques s'éteignent, et l'aperçu de « Tout offrir » compte la Mémoire vive. Les missions d'expédition affichent leur coût de départ.")],
    ["3.692.0", "combat_status/counter", _t("Combat : un contre réussi affiche de nouveau « CONTRÉ ! » sur l'ennemi. Ménage du code, sans autre changement.")],
    ["3.691.0", "menu_icons/settings_menu", _t("Premier lancement plus léger : images d'interface, icônes et bandeaux allégés sans perte visible ; le dictionnaire anglais n'est plus téléchargé par les joueurs francophones.")],
    ["3.690.0", "menu_icons/settings_menu", _t("Jeu en anglais : nombres à l'anglaise (5,000 · 12.3 k), deux-points et « Defence » corrigés. Lecteurs d'écran : messages annoncés, icônes de coût nommées, Entrée et Espace sur les liens « ressource manquante ».")],
    ["3.689.0", "subtabs/potions", _t("Combat : en Grimoire, la potion touchée hors de ton tour est bue au suivant ; la vitesse se règle aussi en Tactique ; après une défaite, l'astuce de ressource s'affiche au Campement.")],
    ["3.688.0", "system/offline_progress", _t("Écran de retour plus complet : ce que les ateliers ont pris, les sorties perdues par Entrepôt plein, le surplus versé au Grand Ouvrage et les PV rendus. Le jeu tourne aussi plus léger, au Camp comme en combat.")],
    ["3.687.0", "village_buildings/warehouse_expanded", _t("Entrepôt : quand le Grand Ouvrage limite un stock, les coûts le disent ; plus de fabrication perdue à sortie pleine. L'échoppe se renouvelle après un voyage, le festin coûte le prix de ton monde le plus loin.")],
    ["3.686.0", "system/save", _t("Sauvegarde plus sûre : « Effacer la partie » n'efface que ce héros, la copie de secours suit ta partie, la quantité d'entraînement est gardée, un import abîmé ne touche plus rien.")],
    ["3.685.0", "system/save", _t("Interface : textes pâles relus (défaite, butin du donjon, Vague, conseils), abandon de donjon confirmé, « Entrer » grisé sans vivres, Retour sur la carte vivante.")],
    ["3.684.0", "quests/quest_story", _t("Une quête liée qui attend un compagnon reste au tableau, verrouillée : « Il faut Sarkel dans le groupe ». Il ne part plus en patrouille tant qu'elle l'attend. Les étapes du Sommet interdit mènent au donjon, les cartes s'ouvrent sur le bon secteur.")],
    ["3.683.0", "codex/codex_lore", _t("Fenêtres d'aide corrigées : le combat attend qu'on les ferme, la création annonce les vrais PV et la vraie ATK, et plusieurs consignes (ration, nuit, Champs, Mémoire) disent enfin ce qui se passe. Textes clés plus lisibles.")],
    ["3.682.0", "menu_icons/map_menu", _t("Une élite engagée sur la carte doit être finie (ou fuie) avant de lancer une quête, une chasse ou un donjon.")],
    ["3.681.0", "menu_icons/menu_menu", _t("Deux fenêtres ouvertes : celle qui passe la main n'écrit plus rien, même si l'autre change de héros. « Recharger ici » rouvre ton héros.")],
    ["3.680.0", "menu_icons/heroes_menu", _t("Mes héros : fermer la création d'un nouveau héros ramène au héros en cours, sans laisser d'emplacement vide derrière.")],
    ["3.679.0", "menu_icons/heroes_menu", _t("Sac plein : une pièce offerte par l'Histoire n'est plus convertie en Aether, elle entre dans le sac en dépassement.")],
    ["3.678.0", "menu_icons/camp_menu", _t("Le feu de camp ne soigne plus pendant un combat d'élite engagé sur la carte, comme pour les donjons et les quêtes.")],
    ["3.677.0", "menu_icons/camp_menu", _t("En pleine sortie de combat (donjon, élite, quête, chasse), le Camp ne sert plus de repas : tu pars avec tes PV, comme annoncé.")],
    ["3.676.0", "menu_icons/map_menu", _t("Le geste Retour pendant un combat demande désormais si tu veux fuir, au lieu de quitter l'écran. Une élite ou un donjon en cours se reprend avec « Reprendre le combat ».")],
    ["3.675.0", "menu_icons/quests_menu", _t("La Boutique : si tu n'as plus l'or de ta première potion, Sarkel te la laisse. L'Histoire ne peut plus rester bloquée au colporteur.")],
    ["3.674.0", "menu_icons/map_menu", _t("Petites Aventures : un 20 naturel fait jaillir l'or du dé, un 1 naturel le fêle.")],
    ["3.673.0", "menu_icons/map_menu", _t("Petites Aventures : le dé est un vrai d20 en relief, noir, rouge et or. Il roule, puis se pose toujours face à toi, le résultat écrit en grand.")],
    ["3.672.0", "menu_icons/menu_menu", _t("La barre du bas prend les icônes dorées du nouveau kit : camp, quêtes, carte, village, héros et menu.")],
    ["3.671.0", "quest_icons/exploration/faille", _t("La faille : ses salles, couloirs, escaliers, son levier, sa source, son givre, sa veine et la salle du Reflet sont peints, avec son icône.")],
    ["3.670.0", "menu_icons/map_menu", _t("La Tour : les trois autres fins ont leurs planches peintes. Les quatre fins sont complètes.")],
    ["3.669.0", "menu_icons/map_menu", _t("La Tour : ses dix hauts faits ont leur icône.")],
    ["3.668.0", "menu_icons/map_menu", _t("La Tour : la fin « La forme au sommet » a ses deux planches peintes, et les six hauts faits de la faille ont leur icône.")],
    ["3.667.0", "menu_icons/map_menu", _t("La Tour : la vision de cette nuit-là a ses trois planches peintes.")],
    ["3.666.0", "menu_icons/map_menu", _t("Chapitre VI : l'ouverture de la Tour a ses trois planches peintes, vers le nord, la plaine grise et la porte.")],
    ["3.665.0", "memory/souffle_long", _t("Mémoires de la faille : le Souffle long et « Ce qu'il ne prend pas » ont leur vraie icône.")],
    ["3.664.0", "memory/feu_couve", _t("Nouvelles icônes : les dix Mémoires de la Tour, la voie de talents Varier et son emblème, l'état « Intouchable » de la silhouette, le festin et un nouveau Sceau.")],
    ["3.663.0", "menu_icons/village_menu", _t("Village : les dix bâtiments et les neuf ateliers ont aussi leur scène peinte. Tout le Village est peint.")],
    ["3.662.0", "menu_icons/village_menu", _t("Village : les six bâtiments de Production ont leur scène peinte, à droite de chaque ligne.")],
    ["3.661.0", "memory/braise_encore", _t("Nouvelles icônes : le givre bleu et le verre de faille, la braise d'Aeswyn, le feuillet du Veilleur, les deux sentiers coupés de la Tour et les dix Mémoires de la faille.")],
    ["3.660.0", "menu_icons/map_menu", _t("Petites Aventures de la Tour : les deux cartes de l'escalier ont leurs images, et les cases suivent maintenant les marches.")],
    ["3.659.0", "living_map/carte_vivante", _t("Nouvelles images : la carte des étages de la Tour, la silhouette, le Reflet, le Gardien qui répète, deux parcours de la Tour, et les icônes du Grimoire, du mode Tactique, des Sceaux et de la carte vivante.")],
    ["3.658.0", "menu_icons/settings_menu", _t("Icônes : chaque image ne sert plus qu'à une chose. Le Terrain d'entraînement, l'Enchanteresse et les compagnons reprennent leur propre image ; le Grimoire, le mode Tactique et quelques autres attendent la leur.")],
    ["3.657.0", "menu_icons/map_menu", _t("Élites à niveaux : bats une élite de carte pour ouvrir son niveau suivant. Plus le niveau est haut, plus elle est forte et plus elle rapporte : son matériau est multiplié par le niveau, l'or monte de 10 % par niveau.")],
    ["3.656.0", "menu_icons/camp_menu", _t("Le festin : au Camp, sous la phrase du jour, prépare un festin avec ton blé, ta viande et ton eau. Tout le groupe a +10 % de dégâts et de PV pendant 3 sorties.")],
    ["3.655.0", "menu_icons/camp_menu", _t("Le camp vit au rythme du jour : matin, journée, soir et nuit, selon tes sorties. Le bandeau change de lumière et la carte du feu a ses phrases du matin et de la journée.")],
    ["3.654.0", "menu_icons/quests_menu", _t("Grimoire : plus de listes déroulantes. La condition se choisit dans une liste avec son icône et sa description, l'action en tuiles, et « Contre » s'affiche avant même de choisir.")],
    ["3.653.0", "menu_icons/quests_menu", _t("Grimoire : nouveau réglage « Varier » à la préparation de sortie, dès la Tour. Ton héros évite de refaire la même technique quand une autre est prête, et le miroir de la Tour ne lui prend presque plus rien.")],
    ["3.652.0", "menu_icons/village_menu", _t("Échoppe moins chère à partir de la Crypte : une Épique y coûte 135 000 or (au lieu de 225 000), 180 000 en Montagne (au lieu de 810 000), et une Légendaire 1,05 million à la Tour (au lieu de 7 millions).")],
    ["3.651.0", "menu_icons/heroes_menu", _t("Héros : l'illustration du Terrain d'entraînement s'affiche aussi dans Équipement, Talents et Alliés.")],
    ["3.650.0", "menu_icons/camp_menu", _t("Les bulles en bas à droite sont plus petites, et chaque liste se termine au-dessus d'elles : plus aucun bouton coincé dessous.")],
    ["3.649.0", "menu_icons/journal_menu", _t("Journal plus lisible : des filtres (Histoire, Gains, Village, Combat), et chaque étape d'Histoire tient en un bloc avec son récit et ses gains.")],
    ["3.648.0", "menu_icons/heroes_menu", _t("Héros : l'onglet des compagnons s'appelle Alliés, comme dans Quêtes.")],
    ["3.647.0", "menu_icons/village_menu", _t("Village sur téléphone : Production, Bâtiments et Ateliers en lignes, le texte à gauche, l'image à droite. Les nouvelles illustrations arrivent bientôt.")],
    ["3.646.0", "menu_icons/village_menu", _t("Récits de patrouille : « au puits sec », « des marches de craie », plus de « à Le » ni « de Les ».")],
    ["3.645.0", "menu_icons/village_menu", _t("Patrouilles dans la Tour : tes compagnons peuvent partir sur les étages libérés, avec leurs récits de là-haut.")],
    ["3.644.0", "menu_icons/heroes_menu", _t("La Mémoire continue après la Tour : les niveaux 25 à 28 s\'ouvrent avec ton record dans la faille, et chaque étage franchi rapporte de l\'Aether. Six hauts faits de la faille.")],
    ["3.643.0", "menu_icons/village_menu", _t("Village et Héros plus nets : le choix « Avec toi / Au camp » sur la ligne des PV, le plafond de l'Entrepôt en petit, et plus de bouton grisé quand il n'y a rien à récolter.")],
    ["3.642.0", "menu_icons/heroes_menu", _t("Héros › Compagnons : la phrase d'aide en haut de l'écran est de nouveau lisible.")],
    ["3.641.0", "menu_icons/quests_menu", _t("Quêtes : les onglets s'appellent maintenant Annexes et Alliés, plus courts et lisibles sur les petits téléphones.")],
    ["3.640.0", "menu_icons/quests_menu", _t("La faille se souvient des mondes : dès l\'étage 2, chaque étage a sa règle (la soif, la relève, le sommeil, la chaleur, le miroir). Et le Souffle tient plus longtemps.")],
    ["3.639.0", "menu_icons/quests_menu", _t("Quêtes plus légères : un onglet Compagnons, les jalons et les étapes repliés, le prologue et les chapitres finis rangés dans « Déjà vécu ».")],
    ["3.639.0", "menu_icons/camp_menu", _t("Camp : la santé et les rations en tête du feu, et le Grimoire montre directement tes règles.")],
    ["3.638.0", "menu_icons/quests_menu", _t("Après la Question, la faille s\'ouvre : des étages sans fond, le Reflet tous les cinq étages, et ton record. Deux montées, une revient toutes les 6 h.")],
    ["3.637.0", "menu_icons/quests_menu", _t("La silhouette : à 30 %, la lumière passe vraiment à travers elle. Un round où rien ne la touche, annoncé un round avant.")],
    ["3.635.1", "menu_icons/camp_menu", _t("Au camp, le soir : trois phrases de Maddoc et d\'Ysolt réécrites.")],
    ["3.635.0", "menu_icons/quests_menu", _t("La Tour prend son temps : Terrain d\'entraînement 19 à 21 (jusqu\'à 230), les 5 étages et 2 escaliers, et à l\'acte III la Forge 7 avec l\'arme reforgée à 13.")],
    ["3.634.0", "menu_icons/heroes_menu", _t("Équilibre des classes : le Chevalier frappe 15 % plus fort, le Rôdeur 15 % moins fort, le Mage a 5 % de PV en plus. Les trois classes finissent l\'Histoire dans des temps proches.")],
    ["3.633.0", "menu_icons/heroes_menu", _t("Talents : la voie « Varier » s\'ouvre à la Tour, commune aux trois classes. Le plafond monte jusqu\'à 28 points : plus de points dormants en réserve.")],
    ["3.632.0", "menu_icons/achivment_menu", _t("La Tour : Mémoire 21 à 24 (le jalon 24 s\'ouvre avec ta réponse à la Question) et dix hauts faits de la Tour.")],
    ["3.631.0", "menu_icons/quests_menu", _t("La Tour, fin du chapitre VI : la vision de cette nuit-là, la Question et ses quatre fins, le nom du Veilleur, l\'épilogue. L\'Histoire est complète ; le jeu continue.")],
    ["3.630.0", "menu_icons/quests_menu", _t("La Tour, acte IV : « Seul », la faille et la silhouette, sans compagnon. Elle se bat comme toi : pose le contre de ta classe.")],
    ["3.629.0", "menu_icons/quests_menu", _t("La Tour, acte III : le Sommet interdit et son Reflet, qui garde ta dernière technique. Les sept Légendaires, la Forge 7 et un choix sur Aeswyn d\'avant.")],
    ["3.628.1", "menu_icons/heroes_menu", _t("Héros › Équipé : le détail de la pièce choisie reste de nouveau visible en bas de l\'écran, comme dans les Talents.")],
    ["3.628.0", "menu_icons/map_menu", _t("La Tour, fin de l\'acte II : l\'étage des gisants, le Gardien qui répète, le palier Légendaire et les feuillets du Veilleur au Codex.")],
    ["3.627.0", "menu_icons/map_menu", _t("La Tour, acte II : la carte des étages, l\'escalier (la Petite aventure de la Tour) et le Marché de la Tour.")],
    ["3.626.0", "menu_icons/quests_menu", _t("Chapitre VI : la Tour s\'ouvre à la fin de la Montagne. Acte I, « Le pied de la Tour » : la route du nord, le dernier camp, et celui qui attend.")],
    ["3.624.2", "menu_icons/quests_menu", _t("Les ouvertures du Désert, des Ruines, de la Crypte et de la Montagne ont leurs illustrations.")],
    ["3.624.1", "menu_icons/quests_menu", _t("Fin du chapitre V : la Tour est bien au nord, comme dans le prologue.")],
    ["3.624.0", "menu_icons/village_menu", _t("Aeswyn se repeuple : le bandeau du Village compte ses habitants, et sa phrase change à mesure que le village grandit.")],
    ["3.623.0", "menu_icons/quests_menu", _t("Ouvertures de chapitre : chaque nouveau monde s\'ouvre sur trois planches, à revoir dans Quêtes › Histoire.")],
    ["3.622.0", "menu_icons/map_menu", _t("Crypte et Montagne : l\'écran de la nuit dit ce qui a changé (gisants rendormis, lave et chaleur retombées) au lieu de « Rien n\'a bougé ».")],
    ["3.621.3", "menu_icons/map_menu", _t("Cartes vivantes : les explications précisent qu\'un secteur se libère aussi en battant l\'élite qui le garde.")],
    ["3.621.2", "menu_icons/quests_menu", _t("Correctif iPhone : le milieu des parchemins déchirés (quêtes, missions) ne disparaît plus derrière une bande sombre.")],
    ["3.621.1", "menu_icons/quests_menu", _t("Marques du corrompu : ce sont bien 5 vagues franchies qui comptent, plus 5 ennemis (une vague de deux ne compte plus double).")],
    ["3.621.0", "menu_icons/quests_menu", _t("Le Codex se découvre au fil de l\'histoire, sans en dire trop d\'avance. Le cadeau de Brannoc est bien une lame, faite pour ta classe.")],
    ["3.621.0", "menu_icons/quests_menu", _t("Explications corrigées : noms des réglages du Grimoire, raretés des caravanes, coût du sentier de la Montagne.")],
    ["3.620.0", "menu_icons/heroes_menu", _t("L\'habillage des cartes est terminé : le bouton de l\'équipe du Résumé prend aussi son cadre.")],
    ["3.619.1", "menu_icons/heroes_menu", _t("Correctif : le mannequin de l\'équipement et l\'image de la route de la Caravane sont de retour.")],
    ["3.619.0", "menu_icons/quests_menu", _t("Les quêtes, le tableau des missions, les contrats de la Taverne et l\'objectif de la Chronique deviennent des parchemins déchirés.")],
    ["3.618.1", "menu_icons/settings_menu", _t("Sur les cartes en parchemin, le vert des gains, l'or des récompenses et les sous-titres sont plus foncés, donc plus lisibles.")],
    ["3.618.0", "menu_icons/heroes_menu", _t("Les cartes des écrans prennent un fond de parchemin et un fin cadre de bronze. Les quêtes et les missions suivront, en parchemin déchiré.")],
    ["3.617.0", "menu_icons/settings_menu", _t("Lisibilité : l\'or, le vert des gains et le texte secondaire sont un peu plus foncés sur les cartes crème.")],
    ["3.616.3", "menu_icons/village_menu", _t("Les fiches ont un nouveau fond de parchemin crème, plus fin et plus léger.")],
    ["3.616.2", "menu_icons/village_menu", _t("Nouvelles icônes : les événements du village, les sujets au feu, les reliques des compagnons, les objets de l\'artisan, l\'entrée de donjon et le Sommet interdit.")],
    ["3.616.1", "menu_icons/village_menu", _t("Correctif : la description du Terrain d\'entraînement donne les bons plafonds (+10 pour la caractéristique de classe et l\'Endurance, environ +7 pour les autres).")],
    ["3.616.0", "menu_icons/village_menu", _t("Forêt : le Village s\'ouvre quand « La Meute affamée » est réussie, plus dès qu\'on l\'accepte. La Scierie, la Mine et les Champs ne s\'ouvrent plus sans leur expédition.")],
    ["3.616.0", "menu_icons/quests_menu", _t("« Comme la dernière fois » ne reprend plus la besace d\'une autre partie. Plusieurs aides des tutoriels sont corrigées (carte, Grimoire, compagnons, Terrain, petite aventure).")],
    ["3.615.2", "menu_icons/heroes_menu", _t("La Boutique d\'équipement reste à côté du Sac toute la partie, dans Héros › Équipement ; la Halle marchande la propose aussi.")],
    ["3.615.1", "menu_icons/heroes_menu", _t("Correctif : sur l\'écran Équipé, on peut de nouveau choisir n\'importe quel emplacement après en avoir touché un.")],
    ["3.615.0", "menu_icons/heroes_menu", _t("Chaque pièce d\'équipement a maintenant un niveau d\'objet (ilvl) : en coin sur son icône, et détaillé dans sa fiche. Environ 10 par monde, plus selon la rareté.")],
    ["3.614.0", "menu_icons/heroes_menu", _t("Entraînement : ta caractéristique de classe et l\'Endurance montent jusqu\'au plafond du Terrain ; les trois autres s\'arrêtent à 70 % de ce plafond.")],
    ["3.613.0", "menu_icons/heroes_menu", _t("L\'entraînement coûte quatre fois plus cher à partir du Désert : chaque palier du Terrain se gagne. Et les combats avec Wenna contre une élite seule comptent bien un par un.")],
    ["3.612.0", "menu_icons/village_menu", _t("Les bâtiments de production n'ont plus que 3 zones, qui montent plus haut à chaque monde. Dès le Désert, l'achat automatique les améliore avec ton surplus.")],
    ["3.611.0", "menu_icons/village_menu", _t("Caravanes : le trajet Long rapporte 2 matériaux rares à coup sûr, et chaque marché passe une commande du jour (+25 % d'or, +1 rare).")],
    ["3.610.0", "menu_icons/village_menu", _t("La part laissée au village par la caravane se règle (10 à 75 % du plafond) : plus de caravane bloquée faute de surplus.")],
    ["3.609.0", "menu_icons/village_menu", _t("Le Grand Ouvrage ouvre dès le Désert et se remplit tout seul : au-delà de 80 % du plafond (réglable), les matières brutes y partent au lieu d'être perdues.")],
    ["3.608.0", "camp/campfire", _t("La Grande ration ne demande plus de Sève d'Aeswyn : 1 Ration, 15 Viandes et 10 Eau à la Cuisine de camp.")],
    ["3.607.0", "menu_icons/village_menu", _t("Les événements du village ont des suites : livre une demande ou joue une rumeur, et le lendemain le village te le rend. Et au feu, demande à un compagnon « Et ce matin ? ».")],
    ["3.606.0", "menu_icons/village_menu", _t("L'artisan d'Aeswyn : fabrique au village une corde tressée, une trousse de maître et une torche résinée, meilleures pour les Petites Aventures. Et pendant son marché, Sarkel rachète tes ressources rares.")],
    ["3.605.0", "camp/campfire", _t("Au feu, un nouveau sujet : « Et les autres ? ». Demande à un compagnon ce qu'il pense de chacun des autres.")],
    ["3.604.0", "menu_icons/village_menu", _t("Ce matin à Aeswyn : à l'aube, un événement peut arriver au village pour 2 jours. Une rumeur de Taverne, une demande d'un ancien, le marché de Sarkel ou une fête.")],
    ["3.603.0", "menu_icons/map_menu", _t("Quêtes des compagnons : chaque étape a maintenant son propre lieu sur la carte, marqué du portrait. Une Petite Aventure ne fait avancer qu'une seule quête.")],
    ["3.602.0", "camp/campfire", _t("Les jours du monde : une nuit tombe toutes les 3 sorties (le jour est sur le bandeau du Camp). La nuit, la carte du monde où tu vis peut reprendre un secteur lointain ; la Palissade le protège.")],
    ["3.601.0", "camp/campfire", _t("Au feu, touche un compagnon : choisis de quoi parler. Ses souvenirs, ce qu'il pense du monde où vous êtes, sa quête.")],
    ["3.600.0", "menu_icons/map_menu", _t("Quêtes des compagnons : « J'y vais » mène au bon monde, et la carte vivante marque d'un portrait les lieux qui font avancer la quête.")],
    ["3.599.0", "camp/campfire", _t("Au feu, tes compagnons veulent te parler : 27 conversations sur eux, l'histoire et le monde, avec un choix de réponse.")],
    ["3.599.0", "quests/quest_side", _t("Chaque compagnon a ses quêtes personnelles (14 en tout), ouvertes par ses conversations. Chacune donne une relique unique.")],
    // v3.596.0 : les nouveautés des v3.594.0 et v3.595.0, annoncées ici pour qu'elles s'affichent aussi chez qui a déjà ouvert ces versions
    ["3.596.0", "camp/campfire", _t("Le Camp s'anime : chaque soir une phrase, et tes compagnons restés au camp autour du feu. Touche-les.")],
    ["3.596.0", "menu_icons/camp_menu", _t("Camp : un onglet « Le feu » réunit la santé, les rations et les compagnons.")],
    ["3.596.0", "menu_icons/map_menu", _t("La Carte est dans la barre du bas. Entre dans le donjon de n'importe quel monde atteint, sans y voyager.")],
    ["3.593.0", "menu_icons/bestiaire_menu", _t("Combat sur téléphone : chaque ennemi porte son nom sous lui, pas seulement la cible.")],
    ["3.592.0", "system/upgrade", _t("Après une mise à jour, cette fenêtre te dit ce qui a changé. Tu la retrouves dans Paramètres › Partie.")],
    ["3.591.0", "menu_icons/settings_menu", _t("Une roue des Paramètres sur l'accueil : importe une sauvegarde, change la langue ou la taille du texte avant de jouer.")],
    ["3.591.0", "system/reset", _t("Paramètres › Partie : cherche ou force une mise à jour.")],
    ["3.590.0", "system/warning", _t("« Abandonner » et « Effacer » sont cerclés de rouge : impossible de les confondre avec « Continuer ».")],
    ["3.589.0", "menu_icons/heroes_menu", _t("Combat : ta carte prend moins de place, l'arène et les monstres davantage.")],
    ["3.588.0", "menu_icons/journal_menu", _t("Sur téléphone, les titres et le récit de l'Histoire prennent les polices du jeu.")],
    ["3.586.0", "menu_icons/camp_menu", _t("Expéditions : une ligne par sorte (Donjon, Petites Aventures, Patrouilles, Caravane).")],
    ["3.584.0", "menu_icons/village_menu", _t("Plus de grand cadre : le décor du monde passe entre les blocs.")],
    ["3.581.0", "menu_icons/map_menu", _t("Chaque écran ouvre sur une illustration qui évolue avec ton aventure.")]
  ];
}

var NEWS_MAX_LINES = 5;

/* « 3.590.0 » < « 3.591.0 » : comparaison nombre par nombre */
function newsCompare(a, b) {
  var x = String(a || "0").split("."), y = String(b || "0").split(".");
  for (var i = 0; i < Math.max(x.length, y.length); i++) {
    var d = (Number(x[i]) || 0) - (Number(y[i]) || 0);
    if (d) return d;
  }
  return 0;
}

function newsSeenVersion() {
  return (window.Prefs && Prefs.has("newsSeen")) ? Prefs.getValue("newsSeen") : "";
}

function newsMarkSeen() {
  if (window.Prefs && typeof GAME_VERSION === "string") Prefs.setValue("newsSeen", GAME_VERSION);
}

/* Nouveautés plus récentes que la dernière version vue */
function newsUnseen() {
  var seen = newsSeenVersion();
  return newsEntries().filter(function (n) { return newsCompare(n[0], seen) > 0; });
}

/* Le héros est-il libre, et rien d'autre n'est-il ouvert ? (même esprit que la bannière de mise à jour) */
function newsCanShow() {
  if (typeof titleScreenResolved !== "undefined" && !titleScreenResolved) return false;
  if (!window.game || !game.heroId) return false;
  if (game.activeTab === "combat" || game.activeTab === "scene") return false;
  if (window.SceneRunManager && typeof SceneRunManager.isHeroEngaged === "function" && SceneRunManager.isHeroEngaged()) return false;
  // seules les fenêtres affichées comptent : certaines restent dans la page, masquées
  var open = document.querySelectorAll(".kwin-veil, .ksheet-backdrop, .prologue, #title-screen-root .title-screen-overlay");
  for (var i = 0; i < open.length; i++) if (open[i].getClientRects().length) return false;
  return true;
}

function newsRoot() {
  var root = document.getElementById("news-root");
  if (!root && document.body) { root = document.createElement("div"); root.id = "news-root"; document.body.appendChild(root); }
  return root;
}

function newsLineHTML(n) {
  return '<li><img src="images/Icons/' + n[1] + '.webp" alt=""><span>' + esc(n[2]) + '</span></li>';
}

/* Fenêtre « Quoi de neuf » : les nouveautés non vues, 5 au plus */
function openNewsWindow(list) {
  var root = newsRoot();
  if (!root) return;
  list = list || newsUnseen();
  var total = newsEntries().length;
  var h = '<div class="full-menu-overlay kwin-veil"><div class="kwin news-win" role="dialog" aria-label="' + esc(_t("Quoi de neuf")) + '">';
  h += kWinHeadHTML({ icon: '<img src="images/Icons/system/upgrade.webp" alt="">', title: esc(_t("Quoi de neuf")),
    sub: esc(_t("Depuis ta dernière visite · v{v}", { v: String(GAME_VERSION).replace(/\.0$/, "") })) });
  h += '<div class="kwin-body"><ul class="news-list">' + list.slice(0, NEWS_MAX_LINES).map(newsLineHTML).join("") + '</ul>';
  h += '<button type="button" class="klink news-more" onclick="openNewsList()">' + esc(_tn(total, "Tout voir ({n} nouveauté)", "Tout voir ({n} nouveautés)")) + '</button>';
  h += '<button type="button" class="kbtn primary" onclick="closeNews()">' + esc(_t("Compris")) + '</button></div></div></div>';
  root.innerHTML = h;
  newsMarkSeen(); // vue une fois : elle ne revient pas au prochain lancement
}

/* Liste complète, groupée par version (« Tout voir », Paramètres › Partie) */
function openNewsList() {
  var root = newsRoot();
  if (!root) return;
  var groups = [], last = null;
  newsEntries().forEach(function (n) {
    if (!last || last.v !== n[0]) { last = { v: n[0], items: [] }; groups.push(last); }
    last.items.push(n);
  });
  var h = '<div class="hf-sheet-bg"><div class="ksheet-backdrop" onclick="closeNews()"></div><div class="ksheet hf-sheet news-sheet" role="dialog" aria-label="' + esc(_t("Nouveautés")) + '">';
  h += kSheetHeadHTML({ icon: '<img src="images/Icons/system/upgrade.webp" alt="">', title: esc(_t("Nouveautés")), sub: esc(_t("Les dernières versions")), close: "closeNews()" });
  h += '<div class="ksheet-body">' + groups.map(function (g) {
    return '<div class="news-v">' + esc(_t("Version {v}", { v: g.v.replace(/\.0$/, "") })) + '</div><ul class="news-list">' + g.items.map(newsLineHTML).join("") + '</ul>';
  }).join("") + '</div></div></div>';
  root.innerHTML = h;
  newsMarkSeen();
}

function closeNews() {
  var root = document.getElementById("news-root");
  if (root) root.innerHTML = "";
}

/* Au lancement : premier lancement de l'appareil -> rien (nouveau joueur, ou ancien joueur sans repère :
   on lui montre les dernières nouveautés s'il a déjà progressé) ; sinon, s'il y a du nouveau, la fenêtre
   attend que le héros soit libre. */
var newsTimer = null;
function newsWatch() {
  if (newsTimer || typeof setInterval !== "function" || typeof document === "undefined") return;
  newsTimer = setInterval(function () {
    if (typeof titleScreenResolved !== "undefined" && !titleScreenResolved) return;
    if (!window.game || !game.heroId) return;
    if (!newsSeenVersion()) {
      var veteran = Number(game.heroLevel || 1) > 1 || Number(game.playTime || 0) > 600;
      if (!veteran) { newsMarkSeen(); clearInterval(newsTimer); newsTimer = null; return; }
      if (window.Prefs) Prefs.setValue("newsSeen", "3.580.0"); // ancien joueur : depuis les bandeaux illustrés
    }
    if (!newsUnseen().length) { clearInterval(newsTimer); newsTimer = null; return; }
    if (!newsCanShow()) return;
    clearInterval(newsTimer); newsTimer = null;
    // v3.783.0 (Seb 13/11, option A) : plus de fenêtre automatique ; la fenêtre de retour porte la ligne
    // « Nouveautés », sinon une notification, et la liste reste dans Paramètres › Voir les nouveautés
    newsMarkSeen();
    if (typeof showToast === "function") showToast(_t("Version {v} : les nouveautés sont dans Paramètres.", { v: String(GAME_VERSION).replace(/\.0$/, "") }), 3200);
  }, 2000);
}
if (typeof window !== "undefined" && typeof window.addEventListener === "function") window.addEventListener("load", newsWatch);

window.newsEntries = newsEntries;
window.newsCompare = newsCompare;
window.newsUnseen = newsUnseen;
window.openNewsWindow = openNewsWindow;
window.openNewsList = openNewsList;
window.closeNews = closeNews;
window.newsWatch = newsWatch;
