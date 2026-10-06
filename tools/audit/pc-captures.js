/* tools/audit/pc-captures.js — v3.367.0 : captures comparées téléphone / PC (hors jeu).
   node tools/audit/pc-captures.js . captures/pc m,pc,win,lap   (Playwright requis, comme parcours-harness) */
// Captures comparatives : mobile 390 / PC 1920 (et 1366), mêmes écrans
var http=require("http"),fs=require("fs"),path=require("path");
var chromium=require("playwright").chromium;
var ROOT = require("../chemins.js").jeu(process.argv[2]), OUT=process.argv[3]; fs.mkdirSync(OUT,{recursive:true});
var MIME={".html":"text/html",".js":"application/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".json":"application/json",".svg":"image/svg+xml",".woff2":"font/woff2",".mp3":"audio/mpeg"};
function serve(){return new Promise(r=>{var s=http.createServer((q,res)=>{var p=decodeURIComponent(q.url.split("?")[0]);if(p=="/")p="/index.html";var f=path.join(ROOT,p);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end();}res.writeHead(200,{"Content-Type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,()=>r(s));});}
var p;async function closeTut(){for(var i=0;i<8;i++){var bt=p.locator("button:visible",{hasText:/^\s*(Compris|Continuer)\s*$/});if(!(await bt.count()))return;await bt.first().click();await p.waitForTimeout(250);}}
var SIZES=(process.argv[4]||"m,pc").split(",");
var DEV={m:{viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true},pc:{viewport:{width:1920,height:1080}},win:{viewport:{width:1920,height:950}},qhd:{viewport:{width:2560,height:1300}},lap:{viewport:{width:1366,height:768}},tab:{viewport:{width:820,height:1180}}};
(async()=>{var s=await serve(),base="http://localhost:"+s.address().port;var b=await chromium.launch();
for(var k of SIZES){var ctx=await b.newContext(Object.assign({locale:"fr-FR",serviceWorkers:"block"},DEV[k]));p=await ctx.newPage();var errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(base+"/index.html");await p.waitForFunction(()=>{var t=document.getElementById("title-screen-root");return t&&t.innerHTML.length>0;},null,{timeout:15000});await p.waitForFunction(()=>{var g=document.getElementById("pwa-boot-gate");return !g||!g.classList.contains("show");},null,{timeout:15000}).catch(()=>{});await p.waitForTimeout(800);
await p.screenshot({path:OUT+"/"+k+"_00_titre.png"});
await p.evaluate(()=>{titleScreenNewGame()});await p.waitForTimeout(600);await p.screenshot({path:OUT+"/"+k+"_01_creation.png"});
await p.evaluate(()=>{pendingHeroId="knight";pendingPlayerName="Test";confirmHeroSelection();});await p.waitForTimeout(500);
await p.evaluate(()=>{game.unlockedTabs=Object.assign({},game.unlockedTabs,{village:true,map:true,combat:true,more:true,quests:true});Object.keys(PRODUCTION_UNLOCK_FLAGS).forEach(id=>game.explorationProgression[PRODUCTION_UNLOCK_FLAGS[id]]=true);Object.keys(PRODUCTION_BUILDINGS).forEach(id=>ProductionManager.unlockBuilding(id));game.tutorialsSeen=game.tutorialsSeen||{};saveGame();});await closeTut();
async function closeTut0(){for(var i=0;i<6;i++){var bt=p.locator("button:visible",{hasText:/^\s*(Compris|Continuer)\s*$/});if(!(await bt.count())||!(await bt.first().isVisible()))return;await bt.first().click();await p.waitForTimeout(200);}}
for(var t of ["campement","quests","village","more","combat","map"]){await p.evaluate(t=>{try{switchTab(t)}catch(e){}},t);await p.waitForTimeout(500);await closeTut();await p.screenshot({path:OUT+"/"+k+"_"+t+".png"});}
await p.evaluate(()=>{try{switchTab("map");openLivingMap("forest")}catch(e){console.log(e)}});await p.waitForTimeout(700);await closeTut();await p.screenshot({path:OUT+"/"+k+"_carte_vivante.png"});
var ptest=await p.evaluate(()=>{try{var vp=document.getElementById("lmx-vp");var r=vp.getBoundingClientRect();var e={clientX:r.left+r.width/2,clientY:r.top+r.height/2};var L=lmxLocal(e);return JSON.stringify({local:L,W:vp.clientWidth,H:vp.clientHeight,f:lmxScale(vp)})}catch(x){return "ERR "+x.message}});errs.push("MAPCENTER "+ptest);
await p.evaluate(()=>{try{closeLivingMap&&closeLivingMap()}catch(e){};try{switchTab("campement")}catch(e){}});await p.waitForTimeout(300);
await p.evaluate(()=>{try{AdventureQuestManager.start("eq_forest_spider")}catch(e){console.log(e)}});await p.waitForTimeout(1200);await closeTut();await p.waitForTimeout(500);await p.screenshot({path:OUT+"/"+k+"_combat_vrai.png"});
await p.evaluate(()=>{try{openFullMenu()}catch(e){}});await p.waitForTimeout(400);await p.screenshot({path:OUT+"/"+k+"_menu.png"});
errs.push("ZOOM "+await p.evaluate(()=>document.documentElement.className+" "+(window.DesktopScale&&DesktopScale.zoom)));fs.writeFileSync(OUT+"/"+k+"_errors.txt",errs.join("\n"));await ctx.close();}
await b.close();s.close();})();
