/* tools/audit/bestiaire-captures.js (23/10/2026, hors jeu) : captures du combat d'un monde, images actuelles puis nouvelles, pour les ateliers d'images.
   USAGE : node tools/audit/bestiaire-captures.js <lot> <dossier neuf> -> captures/bestiaire-<lot>/
   Le dossier neuf reprend les chemins du jeu (images/Enemies/slime.webp…) : seuls les fichiers présents y sont remplacés. */
var http=require("http"),fs=require("fs"),path=require("path");var chromium=require("playwright").chromium;
/* Scènes (nom, cap : libellés de l'atelier). solo : un ennemi seul ; boss : un boss de BOSS_DB (nomJeu / image / decor pour un boss de donjon bâti sur une base) ;
   groupe : plusieurs ennemis (compose : composé pour l'atelier, pas une rencontre du jeu) ; elite : élite de ELITE_DB, escorte comprise ; intro : capture aussi l'intro.
   q + i : vraie rencontre i de la quête q ; voie : compagnon à voie exigé par la quête, mis dans le groupe ; q + bossQuete : le boss de la quête q. decorMonde (lot) : décor du monde imposé (monde sans quête, on emprunte celle d'un autre). */
var LOTS={
 foret:{quete:"aq_story_coeur",monde:"forest",scenes:[
  {k:"slime",solo:"slime",nom:"Slime"},{k:"goblin",solo:"goblin",nom:"Gobelin"},{k:"spider",solo:"spider",nom:"Araignée géante"},
  {k:"wolf",solo:"wolf",nom:"Loup sauvage"},{k:"foresttroll",solo:"foresttroll",nom:"Troll des forêts"},{k:"bramble",solo:"bramble",nom:"Ronce animée"},
  {k:"slimeking",boss:"slimeking",intro:true,nom:"Roi Slime géant",cap:"Boss de la Lisière."},
  {k:"orcwarlord",boss:"orcwarlord",intro:true,nom:"Seigneur de guerre orc",cap:"Boss du Cœur de la forêt."},
  {k:"basilic",boss:"slimeking",nomJeu:"Basilic",image:"./images/Boss/basilic.webp",decor:"../images/Dungeons/donjon_poison/donjon_poison.webp",intro:true,nom:"Basilic",cap:"Boss de la Tanière du Basilic, dans le décor du donjon."},
  {k:"fileuse",elite:"araignee_marquee",intro:true,nom:"Fileuse",cap:"Élite « Les yeux blancs », avec sa vraie escorte d'araignée."},
  {k:"ronce",elite:"ronce_ardente",nom:"Ronce qui se souvient",cap:"Élite de la Forêt."},
  {k:"arbre_mere",elite:"arbre_mere",intro:true,nom:"Arbre-mère",cap:"Élite de la Forêt."},
  {k:"meute",groupe:["wolf","wolf"],nom:"Meute",cap:"La Meute affamée : deux loups, la seule rencontre de groupe de la Forêt."},
  {k:"trio_lisiere",groupe:["goblin","spider","slime"],compose:true,nom:"Trio Lisière",cap:"Gobelin, Araignée, Slime : groupe composé pour l'atelier (pas une rencontre du jeu)."},
  {k:"trio_coeur",groupe:["foresttroll","bramble","goblin"],compose:true,nom:"Trio Cœur",cap:"Troll, Ronce animée, Gobelin : groupe composé pour l'atelier (pas une rencontre du jeu)."}
 ]},
 desert:{quete:"aq_desert_nuee",monde:"desert",scenes:[
  {k:"scarab",solo:"scarab",nom:"Scarabée"},{k:"scorpion",solo:"scorpion",nom:"Scorpion"},{k:"sandworm",solo:"sandworm",nom:"Ver des sables"},{k:"sandwarrior",solo:"sandwarrior",nom:"Guerrier des sables"},
  {k:"sphinx",boss:"sphinx",intro:true,nom:"Le sphinx",cap:"Boss des Dunes et du Temple ensablé (et de la Cité engloutie)."},
  {k:"nezzam",q:"aq_desert_trone",bossQuete:true,voie:"maddoc",intro:true,nom:"Nezzam",cap:"Le trône de sable : Nezzam le Desséché, boss de quête, Maddoc dans le groupe (la quête l'exige)."},
  {k:"serment",elite:"serment_armure",intro:true,nom:"Le Serment",cap:"Élite du Désert."},
  {k:"dard",elite:"dard_profondeurs",nom:"Le Dard",cap:"Élite du Désert."},
  {k:"nuee1",q:"aq_desert_nuee",i:0,nom:"Nuée : 3 scarabées",cap:"La nuée, rencontre 1 : trois Scarabées."},
  {k:"nuee2",q:"aq_desert_nuee",i:1,nom:"Nuée : 2 guerriers",cap:"La nuée, rencontre 2 : deux Guerriers des sables."},
  {k:"trio_camp",groupe:["scorpion","sandworm","sandwarrior"],compose:true,nom:"Trio camp",cap:"Scorpion, Ver, Guerrier : groupe composé pour l'atelier (ils se combattent un par un en jeu)."}
 ]},
 ruines:{quete:"aq_ruines_couloirs",monde:"ruins",note:"Le Gardien du plan ne paraît que dans la fiche de combat du Labyrinthe aux leviers, pas sur l'écran de combat : voir les images brutes.",scenes:[
  {k:"skeleton",solo:"skeleton",nom:"Squelette"},{k:"ghoul",solo:"ghoul",nom:"Goule"},{k:"gargoyle",solo:"gargoyle",nom:"Gargouille"},{k:"zombie",solo:"zombie",nom:"Zombie"},{k:"batisseur",solo:"batisseur",nom:"Bâtisseur"},
  {k:"skeletonlord",boss:"skeletonlord",intro:true,nom:"Seigneur squelette",cap:"Boss des Couloirs effondrés et du Sanctuaire enseveli."},
  {k:"maitre",q:"aq_ruines_plan",bossQuete:true,intro:true,nom:"Maître d'œuvre",cap:"Le plan fait pierre : le Maître d'œuvre, boss de quête."},
  {k:"varrek",boss:"skeletonlord",nomJeu:"Varrek, le Garde scellé",image:"./images/Boss/varrek.webp",intro:true,nom:"Varrek",cap:"Boss du Sanctuaire scellé (le donjon n'a pas de décor propre : décor des Ruines)."},
  {k:"contremaitre",elite:"contremaitre",intro:true,nom:"Le Contremaître",cap:"Élite des Ruines, avec sa vraie escorte (Bâtisseur, Squelette)."},
  {k:"golem",elite:"golem",nom:"Le Golem",cap:"Élite des Ruines, avec sa vraie escorte (Zombie)."},
  {k:"couloirs5",q:"aq_ruines_couloirs",i:4,nom:"Couloirs 5",cap:"Les couloirs qui changent, rencontre 5 : Goule et deux Zombies."},
  {k:"batisseur4",q:"aq_ruines_batisseur",i:3,nom:"Bâtisseur 4",cap:"Celui qui pose les pierres, rencontre 4 : Bâtisseur et deux Squelettes."},
  {k:"salle3",q:"aq_ruines_salle",i:2,nom:"Salle 3",cap:"La salle qu'il évite, rencontre 3 : deux Gargouilles."},
  {k:"salle4",q:"aq_ruines_salle",i:3,nom:"Salle 4",cap:"La salle qu'il évite, rencontre 4 : deux Bâtisseurs et une Gargouille."}
 ]},
 montagne:{quete:"aq_story_coeur",monde:"mountain",decorMonde:true,note:"La Montagne n'a pas encore de quête : le combat emprunte une quête de la Forêt (barre de mission « Tenir le Cœur »), avec le décor de la Montagne.",scenes:[
  {k:"lavagolem",solo:"lavagolem",nom:"Golem de lave"},{k:"dragonling",solo:"dragonling",nom:"Dragonnet"},{k:"minordemon",solo:"minordemon",nom:"Démon mineur"},{k:"ifrit",solo:"ifrit",nom:"Ifrit"},
  {k:"ancientdragon",boss:"ancientdragon",intro:true,nom:"Dragon ancien",cap:"Boss de la Montagne brûlante."},
  {k:"trio_pentes",groupe:["lavagolem","dragonling","minordemon"],compose:true,nom:"Trio Pentes",cap:"Golem de lave, Dragonnet, Démon mineur : groupe composé pour l'atelier."},
  {k:"trio_antre",groupe:["ifrit","minordemon","dragonling"],compose:true,nom:"Trio Antre",cap:"Ifrit, Démon mineur, Dragonnet : groupe composé pour l'atelier."}
 ]},
 tour:{quete:"aq_story_coeur",monde:"tower",decorMonde:true,note:"La Tour n'a pas encore de quête : le combat emprunte une quête de la Forêt (barre de mission « Tenir le Cœur »), avec le décor de la Tour.",scenes:[
  {k:"arcanegolem",solo:"arcanegolem",nom:"Golem arcanique"},{k:"corruptmage",solo:"corruptmage",nom:"Mage corrompu"},{k:"hybrid",solo:"hybrid",nom:"Hybride"},{k:"guardian",solo:"guardian",nom:"Gardien"},
  {k:"archmage",boss:"archmage",intro:true,nom:"Archimage",cap:"Boss de la Tour du sorcier."},
  {k:"trio_sommet",groupe:["arcanegolem","corruptmage","hybrid"],compose:true,nom:"Trio Sommet",cap:"Golem arcanique, Mage corrompu, Hybride : groupe composé pour l'atelier."},
  {k:"trio_sanctuaire",groupe:["guardian","hybrid","corruptmage"],compose:true,nom:"Trio Sanctuaire",cap:"Gardien, Hybride, Mage corrompu : groupe composé pour l'atelier."}
 ]}
};
var LOT=LOTS[process.argv[2]];if(!LOT){console.error("Lot inconnu : "+process.argv[2]+" (lots : "+Object.keys(LOTS).join(", ")+")");process.exit(2);}
var NEUF=path.resolve(process.argv[3]||".");
var ROOT=require("../chemins.js").jeu(),OUT=require("../chemins.js").captures("bestiaire-"+process.argv[2]);fs.mkdirSync(OUT,{recursive:true});
var MIME={".html":"text/html",".js":"application/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".json":"application/json",".mp3":"audio/mpeg"};
var neuf=false;
var s=http.createServer(function(q,r){var p=decodeURIComponent(q.url.split("?")[0]).replace(/\/\.\//g,"/");if(p==="/")p="/index.html";
 var f=(neuf&&/^\/images\//.test(p)&&fs.existsSync(path.join(NEUF,p)))?path.join(NEUF,p):path.join(ROOT,p);
 fs.readFile(f,function(e,d){if(e){r.writeHead(404);return r.end();}r.writeHead(200,{"Content-Type":MIME[path.extname(p)]||"application/octet-stream","Cache-Control":"no-store"});r.end(d);});}).listen(0,async function(){
var b=await chromium.launch();var base="http://localhost:"+s.address().port;
for(var v=0;v<2;v++){neuf=v===1;
 var ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:"block",locale:"fr-FR"});
 var p=await ctx.newPage();p.on("pageerror",function(e){console.log("ERR",e.message)});
 await p.goto(base+"/index.html");
 await p.waitForFunction(function(){var t=document.getElementById("title-screen-root");return t&&t.innerHTML.length>0},null,{timeout:15000});
 await p.evaluate(function(){if(window.hidePwaBootGate)hidePwaBootGate();titleScreenNewGame();pendingHeroId="knight";pendingPlayerName="Aldric";confirmHeroSelection();});
 await p.waitForTimeout(600);
 for(var i=0;i<LOT.scenes.length;i++){var sc=LOT.scenes[i];
  var decor=await p.evaluate(function(a){var sc=a.sc;
   game.unlockedTabs=Object.assign({},game.unlockedTabs,{combat:true,map:true,village:true,more:true});
   if(game.adventureQuestRun&&game.adventureQuestRun.active)AdventureQuestManager.forfeit();
   game.heroHp=game.heroMaxHp||game.heroHp||100;
   WorldManager.worldIndex=Math.max(0,WORLDS.findIndex(function(w){return w.id===a.monde}));WorldManager.adventureIndex=0;
   if(window.CombatActors)CombatActors._holdSpawn=false;
   ["maddoc"].forEach(function(id){var st=CompanionManager.state(id),d=COMPANIONS_DB[id];st.unlocked=st.present=sc.voie===id;st.voie=sc.voie===id?d.defaultVoie:null;}); // voie : compagnon exigé par la quête
   var qid=sc.q||a.quete;AdventureQuestManager.start(qid); // vraie quête du monde : décor, barre de mission
   if(window.CombatActors)CombatActors._holdSpawn=false;game.enemies=[];
   function bati(id,boss){WorldManager.enemyIndex=boss?99:0;var e=WorldManager.generateEnemy();var d=boss?BOSS_DB[id]:ENEMY_DB[id];
    e.id=id;e.name=d.name;e.asset=d.asset;e.image=d.image;e.resists=d.resists;e.weak=d.weak;e.stats=d.stats;e.archetype=null;return e;}
   if(sc.q){var quest=ADVENTURE_QUESTS[qid],pr=game.adventureQuestProgress[qid]; // vraie rencontre, ou boss de la quête
    quest.steps.forEach(function(st){if(st.type!=="bossKill")pr[st.id]=sc.bossQuete?st.target:sc.i;});
    AdventureQuestManager.spawnRunEnemy(quest);
    var bo=CombatActors.enemies().filter(function(x){return x.isBoss})[0];if(bo)CombatEngine.checkPhases(bo);}
   else if(sc.elite)EliteManager.spawn(sc.elite,a.monde,0);
   else{var foes=sc.solo?[bati(sc.solo,false)]:sc.boss?[bati(sc.boss,true)]:sc.groupe.map(function(id){return bati(id,false)});
    if(sc.nomJeu){foes[0].name=sc.nomJeu;foes[0].image=sc.image;}
    CombatEngine.spawnGroup(foes);}
   switchTab("combat");if(typeof renderAll==="function")renderAll();
   var w=WORLDS.filter(function(x){return x.id===a.monde})[0];var decor=sc.decor||(a.decorMonde&&w?w.combatMap:null); // décor du donjon, ou du monde imposé
   if(decor)document.documentElement.style.setProperty("--world-combat-map",'url("'+decor+'")');
   return decor;
  },{sc:sc,monde:LOT.monde,quete:LOT.quete,decorMonde:!!LOT.decorMonde});
  await p.waitForTimeout(900);
  for(var k=0;k<6;k++){var bt=p.locator("#tutorial-modal-root button",{hasText:"Compris"});if(!(await bt.count())||!(await bt.first().isVisible()))break;await bt.first().click();await p.waitForTimeout(250);}
  // Intro de boss ou d'élite : capturée si demandée, puis fermée comme un joueur ; bandeaux retirés
  if(await p.locator(".bm-intro").count()){await p.waitForTimeout(400);if(sc.intro)await p.screenshot({path:path.join(OUT,(neuf?"neuf_":"actuel_")+sc.k+"_intro.png")});await p.evaluate(function(){closeBossIntro()});await p.waitForTimeout(600);}
  await p.evaluate(function(){if(typeof bossMomentClearTimers==="function")bossMomentClearTimers();var r=typeof getBossBlockingRoot==="function"&&getBossBlockingRoot();if(r)r.innerHTML="";if(typeof renderAll==="function")renderAll();});
  await p.evaluate(function(d){if(d)document.documentElement.style.setProperty("--world-combat-map",'url("'+d+'")');},decor);
  await p.waitForTimeout(400);
  await p.screenshot({path:path.join(OUT,(neuf?"neuf_":"actuel_")+sc.k+".png")});
 }
 await ctx.close();}
fs.writeFileSync(path.join(OUT,"scenes.json"),JSON.stringify({lot:process.argv[2],monde:LOT.monde,note:LOT.note||"",scenes:LOT.scenes}));console.log("ok "+OUT);await b.close();s.close();});
