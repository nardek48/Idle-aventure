/* tools/audit/crypte-ombres-captures.js (23/10/2026, hors jeu) : rendu des dormeurs de Crypte, nouvelles images, CSS du jeu puis variantes A et B,
   même combat pour les trois (dormeurs identiques). Pour atelier/crypte-ombres.html. USAGE : node tools/audit/crypte-ombres-captures.js <dossier des nouvelles images> */
var http=require("http"),fs=require("fs"),path=require("path");var chromium=require("playwright").chromium;
var ROOT=require("../chemins.js").jeu(),OUT=require("../chemins.js").captures("crypte-ombres");fs.mkdirSync(OUT,{recursive:true});
var NEUF=path.resolve(process.argv[2]||".");
var REMPLACE={"/images/Enemies/spectre.webp":"1.webp","/images/Enemies/wraith.webp":"2.webp","/images/Enemies/necromancer.webp":"3.webp","/images/Enemies/deadknight.webp":"4.webp","/images/Boss/Lord_Necro.webp":"5.webp"};
// Variantes CSS, injectées après le CSS du jeu. A : le dormeur ignore l'assombrissement de profondeur.
// B : A + sommeil en brume claire + pastille éclaircie. C : B adouci (brume moins claire).
var VARIANTES={
 jeu:"",
 A:".cbx-stage .cbx-foe.is-asleep { filter: none; }",
 B:".cbx-stage .cbx-foe.is-asleep { filter: none; }\n.cbx-foe.is-asleep .cbx-foe-img { filter: brightness(1) contrast(.8) saturate(.3) blur(1px); }\n.cbx-ini-p.is-asleep { filter: grayscale(1) brightness(.85); }",
 C:".cbx-stage .cbx-foe.is-asleep { filter: none; }\n.cbx-foe.is-asleep .cbx-foe-img { filter: brightness(.85) contrast(.85) saturate(.35) blur(1px); }\n.cbx-ini-p.is-asleep { filter: grayscale(1) brightness(.8); }"
};
var SCENES=[
 {k:"sep1",q:"aq_crypte_sepulcres",i:0},{k:"groupe",q:"aq_crypte_sepulcres",i:2},{k:"ysolt1",q:"aq_crypte_ysolt",i:0,ysolt:true},
 {k:"appel5",q:"aq_crypte_appel",i:4},{k:"chaines3",q:"aq_crypte_chaines",i:2},{k:"retient_p1",q:"aq_crypte_retient",boss:true}
];
var MIME={".html":"text/html",".js":"application/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".json":"application/json",".mp3":"audio/mpeg"};
var s=http.createServer(function(q,r){var p=decodeURIComponent(q.url.split("?")[0]).replace(/\/\.\//g,"/");if(p==="/")p="/index.html";var f=REMPLACE[p]?path.join(NEUF,REMPLACE[p]):path.join(ROOT,p);
 fs.readFile(f,function(e,d){if(e){r.writeHead(404);return r.end();}r.writeHead(200,{"Content-Type":MIME[path.extname(p)]||"application/octet-stream","Cache-Control":"no-store"});r.end(d);});}).listen(0,async function(){
var b=await chromium.launch();var base="http://localhost:"+s.address().port;var MESURES={};
var ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:"block",locale:"fr-FR",reducedMotion:"reduce"});
var p=await ctx.newPage();p.on("pageerror",function(e){console.log("ERR",e.message)});
await p.goto(base+"/index.html");
await p.waitForFunction(function(){var t=document.getElementById("title-screen-root");return t&&t.innerHTML.length>0},null,{timeout:15000});
await p.evaluate(function(){if(window.hidePwaBootGate)hidePwaBootGate();titleScreenNewGame();pendingHeroId="knight";pendingPlayerName="Aldric";confirmHeroSelection();
 var st=document.createElement("style");st.id="variante";document.head.appendChild(st);});
await p.waitForTimeout(600);
for(var i=0;i<SCENES.length;i++){var sc=SCENES[i];
 await p.evaluate(function(sc){
  game.unlockedTabs=Object.assign({},game.unlockedTabs,{combat:true,map:true,village:true,more:true});
  if(game.adventureQuestRun&&game.adventureQuestRun.active)AdventureQuestManager.forfeit();
  game.heroHp=game.heroMaxHp||game.heroHp||100;
  var ys=CompanionManager.state("ysolt");ys.unlocked=!!sc.ysolt;ys.present=!!sc.ysolt;
  WorldManager.worldIndex=WORLDS.findIndex(function(w){return w.id==="crypt"});WorldManager.adventureIndex=0;
  if(window.CombatActors)CombatActors._holdSpawn=false;
  var quest=ADVENTURE_QUESTS[sc.q];AdventureQuestManager.start(sc.q);
  if(sc.i||sc.boss){var pr=game.adventureQuestProgress[sc.q];
   quest.steps.forEach(function(st){if(st.type==="encounter")pr[st.id]=sc.boss?st.target:sc.i;});
   if(window.CombatActors)CombatActors._holdSpawn=false;game.enemies=[];AdventureQuestManager.spawnRunEnemy(quest);}
  if(sc.boss){var bo=CombatActors.enemies().filter(function(x){return x.isBoss})[0];if(bo)CombatEngine.checkPhases(bo);}
  switchTab("combat");if(typeof renderAll==="function")renderAll();
 },sc);
 await p.waitForTimeout(900);
 for(var k=0;k<6;k++){var bt=p.locator("#tutorial-modal-root button",{hasText:"Compris"});if(!(await bt.count())||!(await bt.first().isVisible()))break;await bt.first().click();await p.waitForTimeout(250);}
 if(await p.locator(".bm-intro").count())await p.evaluate(function(){closeBossIntro()});
 await p.evaluate(function(){if(typeof bossMomentClearTimers==="function")bossMomentClearTimers();var r=typeof getBossBlockingRoot==="function"&&getBossBlockingRoot();if(r)r.innerHTML="";if(typeof renderAll==="function")renderAll();});
 await p.waitForTimeout(600);
 // Même combat, trois rendus : seule la feuille « variante » change
 var vk=Object.keys(VARIANTES);
 for(var j=0;j<vk.length;j++){
  await p.evaluate(function(css){document.getElementById("variante").textContent=css;},VARIANTES[vk[j]]);await p.waitForTimeout(700);
  var f=path.join(OUT,vk[j]+"_"+sc.k+".png");await p.screenshot({path:f});
  MESURES[vk[j]+"_"+sc.k]=await p.evaluate(function(){return Array.prototype.map.call(document.querySelectorAll(".cbx-stage .cbx-foe"),function(el){var r=el.querySelector(".cbx-foe-img").getBoundingClientRect();return {dort:el.classList.contains("is-asleep"),x:r.x,y:r.y,w:r.width,h:r.height};});});
 }
}
fs.writeFileSync(path.join(OUT,"boites.json"),JSON.stringify({variantes:VARIANTES,boites:MESURES}));
console.log("ok "+OUT);await b.close();s.close();});
