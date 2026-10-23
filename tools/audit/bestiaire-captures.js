/* tools/audit/bestiaire-captures.js (23/10/2026, hors jeu) : captures du combat d'un monde, images actuelles puis nouvelles, pour les ateliers d'images.
   USAGE : node tools/audit/bestiaire-captures.js <lot> <dossier neuf> -> captures/bestiaire-<lot>/
   Le dossier neuf reprend les chemins du jeu (images/Enemies/slime.webp…) : seuls les fichiers présents y sont remplacés. */
var http=require("http"),fs=require("fs"),path=require("path");var chromium=require("playwright").chromium;
/* Scènes (nom, cap : libellés de l'atelier). solo : un ennemi seul ; boss : un boss de BOSS_DB (nomJeu / image / decor pour un boss de donjon bâti sur une base) ;
   groupe : plusieurs ennemis (compose : composé pour l'atelier, pas une rencontre du jeu) ; elite : élite de ELITE_DB, escorte comprise ; intro : capture aussi l'intro. */
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
  await p.evaluate(function(a){var sc=a.sc;
   game.unlockedTabs=Object.assign({},game.unlockedTabs,{combat:true,map:true,village:true,more:true});
   if(game.adventureQuestRun&&game.adventureQuestRun.active)AdventureQuestManager.forfeit();
   game.heroHp=game.heroMaxHp||game.heroHp||100;
   WorldManager.worldIndex=Math.max(0,WORLDS.findIndex(function(w){return w.id===a.monde}));WorldManager.adventureIndex=0;
   if(window.CombatActors)CombatActors._holdSpawn=false;
   AdventureQuestManager.start(a.quete); // vraie quête du monde : décor, barre de mission
   if(window.CombatActors)CombatActors._holdSpawn=false;game.enemies=[];
   function bati(id,boss){WorldManager.enemyIndex=boss?99:0;var e=WorldManager.generateEnemy();var d=boss?BOSS_DB[id]:ENEMY_DB[id];
    e.id=id;e.name=d.name;e.asset=d.asset;e.image=d.image;e.resists=d.resists;e.weak=d.weak;e.stats=d.stats;e.archetype=null;return e;}
   if(sc.elite)EliteManager.spawn(sc.elite,a.monde,0);
   else{var foes=sc.solo?[bati(sc.solo,false)]:sc.boss?[bati(sc.boss,true)]:sc.groupe.map(function(id){return bati(id,false)});
    if(sc.nomJeu){foes[0].name=sc.nomJeu;foes[0].image=sc.image;}
    CombatEngine.spawnGroup(foes);}
   switchTab("combat");if(typeof renderAll==="function")renderAll();
   if(sc.decor)document.documentElement.style.setProperty("--world-combat-map",'url("'+sc.decor+'")'); // décor du donjon
  },{sc:sc,monde:LOT.monde,quete:LOT.quete});
  await p.waitForTimeout(900);
  for(var k=0;k<6;k++){var bt=p.locator("#tutorial-modal-root button",{hasText:"Compris"});if(!(await bt.count())||!(await bt.first().isVisible()))break;await bt.first().click();await p.waitForTimeout(250);}
  // Intro de boss ou d'élite : capturée si demandée, puis fermée comme un joueur ; bandeaux retirés
  if(await p.locator(".bm-intro").count()){await p.waitForTimeout(400);if(sc.intro)await p.screenshot({path:path.join(OUT,(neuf?"neuf_":"actuel_")+sc.k+"_intro.png")});await p.evaluate(function(){closeBossIntro()});await p.waitForTimeout(600);}
  await p.evaluate(function(){if(typeof bossMomentClearTimers==="function")bossMomentClearTimers();var r=typeof getBossBlockingRoot==="function"&&getBossBlockingRoot();if(r)r.innerHTML="";if(typeof renderAll==="function")renderAll();});
  await p.evaluate(function(d){if(d)document.documentElement.style.setProperty("--world-combat-map",'url("'+d+'")');},sc.decor||null);
  await p.waitForTimeout(400);
  await p.screenshot({path:path.join(OUT,(neuf?"neuf_":"actuel_")+sc.k+".png")});
 }
 await ctx.close();}
fs.writeFileSync(path.join(OUT,"scenes.json"),JSON.stringify({lot:process.argv[2],monde:LOT.monde,scenes:LOT.scenes}));console.log("ok "+OUT);await b.close();s.close();});
