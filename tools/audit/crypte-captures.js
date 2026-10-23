/* tools/audit/crypte-captures.js (23/10/2026, hors jeu) : captures du combat de Crypte, images actuelles puis nouvelles, pour atelier/crypte-images.html.
   USAGE : node tools/audit/crypte-captures.js <dossier des nouvelles images> -> captures/crypte-images/ */
var http=require("http"),fs=require("fs"),path=require("path");var chromium=require("playwright").chromium;
var ROOT=require("../chemins.js").jeu(),OUT=require("../chemins.js").captures("crypte-images");fs.mkdirSync(OUT,{recursive:true});
var NEUF=path.resolve(process.argv[2]||".");
// Chemin du jeu -> nouvelle image (1.webp … 5.webp, ordre des images fournies par Seb)
var REMPLACE={"/images/Enemies/spectre.webp":"1.webp","/images/Enemies/wraith.webp":"2.webp","/images/Enemies/necromancer.webp":"3.webp","/images/Enemies/deadknight.webp":"4.webp","/images/Boss/Lord_Necro.webp":"5.webp"};
// Scènes : un ennemi seul (portrait plein), puis le groupe (rangée de portraits)
var SCENES=[["spectre",["spectre"]],["wraith",["wraith"]],["necromancer",["necromancer"]],["deadknight",["deadknight"]],["necrosupreme",["necrosupreme"]],["groupe",["rencontre3"]]];
var MIME={".html":"text/html",".js":"application/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".json":"application/json",".mp3":"audio/mpeg"};
var neuf=false;
var s=http.createServer(function(q,r){var p=decodeURIComponent(q.url.split("?")[0]).replace(/\/\.\//g,"/");if(p==="/")p="/index.html";var f=(neuf&&REMPLACE[p])?path.join(NEUF,REMPLACE[p]):path.join(ROOT,p);
 fs.readFile(f,function(e,d){if(e){r.writeHead(404);return r.end();}r.writeHead(200,{"Content-Type":MIME[path.extname(p)]||"application/octet-stream","Cache-Control":"no-store"});r.end(d);});}).listen(0,async function(){
var b=await chromium.launch();var base="http://localhost:"+s.address().port;
for(var v=0;v<2;v++){neuf=v===1;
 var ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:"block",locale:"fr-FR"});
 var p=await ctx.newPage();p.on("pageerror",function(e){console.log("ERR",e.message)});
 await p.goto(base+"/index.html");
 await p.waitForFunction(function(){var t=document.getElementById("title-screen-root");return t&&t.innerHTML.length>0},null,{timeout:15000});
 await p.evaluate(function(){if(window.hidePwaBootGate)hidePwaBootGate();titleScreenNewGame();pendingHeroId="knight";pendingPlayerName="Aldric";confirmHeroSelection();});
 await p.waitForTimeout(600);
 for(var i=0;i<SCENES.length;i++){
  await p.evaluate(function(ids){
   game.unlockedTabs=Object.assign({},game.unlockedTabs,{combat:true,map:true,village:true,more:true});
   if(game.adventureQuestRun&&game.adventureQuestRun.active)AdventureQuestManager.forfeit();
   game.heroHp=game.heroMaxHp||game.heroHp||100;
   WorldManager.worldIndex=WORLDS.findIndex(function(w){return w.id==="crypt"});WorldManager.adventureIndex=0;
   AdventureQuestManager.start("aq_crypte_sepulcres"); // vraie quête de Crypte : décor, barre de mission, dormeurs
   if(ids[0]==="rencontre3"){game.adventureQuestProgress.aq_crypte_sepulcres.rencontres_sepulcres=2;if(window.CombatActors)CombatActors._holdSpawn=false;game.enemies=[];AdventureQuestManager.spawnRunEnemy(ADVENTURE_QUESTS.aq_crypte_sepulcres);}
   else{var foes=ids.map(function(id){var boss=!!BOSS_DB[id];WorldManager.enemyIndex=boss?99:0;var e=WorldManager.generateEnemy();var d=boss?BOSS_DB[id]:ENEMY_DB[id];
    e.id=id;e.name=d.name;e.asset=d.asset;e.image=d.image;e.resists=d.resists;e.weak=d.weak;e.stats=d.stats;e.archetype=null;return e;});
    if(window.CombatActors)CombatActors._holdSpawn=false;game.enemies=[];CombatEngine.spawnGroup(foes);}
   switchTab("combat");if(typeof renderAll==="function")renderAll();
  },SCENES[i][1]);
  await p.waitForTimeout(900);
  // Ferme les tutoriels éventuels (premier combat)
  for(var k=0;k<6;k++){var bt=p.locator("#tutorial-modal-root button",{hasText:"Compris"});if(!(await bt.count())||!(await bt.first().isVisible()))break;await bt.first().click();await p.waitForTimeout(250);}
  // Intro de boss : capturée à part, puis fermée comme un joueur (toucher)
  if(await p.locator(".bm-intro").count()){await p.waitForTimeout(400);if(SCENES[i][0]==="necrosupreme")await p.screenshot({path:path.join(OUT,(neuf?"neuf_":"actuel_")+SCENES[i][0]+"_intro.png")});await p.evaluate(function(){closeBossIntro()});await p.waitForTimeout(600);}
  await p.screenshot({path:path.join(OUT,(neuf?"neuf_":"actuel_")+SCENES[i][0]+".png")});
 }
 await ctx.close();}
console.log("ok "+OUT);await b.close();s.close();});
