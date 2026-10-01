/* sim/lancement-captures.js (30/09/2026, hors jeu) : captures et HTML des écrans de lancement pour atelier-lancement.html. USAGE : node sim/lancement-captures.js (depuis la racine) -> sim/l-avant/ */
var http=require("http"),fs=require("fs"),path=require("path");var chromium=require("playwright").chromium;
var SNAP={};var ROOT=process.cwd(),OUT=path.join(ROOT,process.env.OUT_DIR||"sim/l-avant");fs.mkdirSync(OUT,{recursive:true});
var MIME={".html":"text/html",".js":"application/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".json":"application/json",".mp3":"audio/mpeg"};
var s=http.createServer(function(q,r){var p=decodeURIComponent(q.url.split("?")[0]);if(p==="/")p="/index.html";fs.readFile(path.join(ROOT,p),function(e,d){if(e){r.writeHead(404);return r.end();}r.writeHead(200,{"Content-Type":MIME[path.extname(p)]||"application/octet-stream"});r.end(d);});}).listen(0,async function(){
var b=await chromium.launch();var ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:"block",locale:"fr-FR"});var base="http://localhost:"+s.address().port;
async function page(){var p=await ctx.newPage();await p.goto(base+"/index.html");
 await p.waitForFunction(function(){var t=document.getElementById("title-screen-root");return t&&t.innerHTML.length>0},null,{timeout:15000});await p.waitForTimeout(600);return p;}
var p=await page();
await p.addStyleTag({content:"#pwa-boot-gate{display:flex!important}"});await p.waitForTimeout(300);
await p.screenshot({path:OUT+"/1_chargement.png"});
await p.evaluate(function(){var st=document.querySelectorAll("style");st[st.length-1].remove();if(window.hidePwaBootGate)hidePwaBootGate()});await p.waitForTimeout(300);
await p.screenshot({path:OUT+"/2_titre_vide.png"});SNAP["titre"]=await p.evaluate(function(){return document.getElementById("title-screen-root").innerHTML});
await p.evaluate(function(){titleScreenNewGame()});await p.waitForTimeout(500);
await p.screenshot({path:OUT+"/4_nom.png"});SNAP["nom"]=await p.evaluate(function(){return document.getElementById("hero-selection-root").innerHTML});
await p.evaluate(function(){pendingPlayerName="Aldric";var i=document.getElementById("player-name-input");if(i)i.value="Aldric";goToHeroStep()});await p.waitForTimeout(500);
await p.screenshot({path:OUT+"/5_classe.png"});SNAP["classe"]=await p.evaluate(function(){return document.getElementById("hero-selection-root").innerHTML});
await p.evaluate(function(){pendingHeroId="knight";goToConfirmStep()});await p.waitForTimeout(500);
await p.screenshot({path:OUT+"/6_confirmation.png"});SNAP["confirmation"]=await p.evaluate(function(){return document.getElementById("hero-selection-root").innerHTML});
await p.evaluate(function(){confirmHeroSelection()});await p.waitForTimeout(800);
await p.evaluate(function(){saveGame()});await p.waitForTimeout(500);await p.close();
p=await page();await p.evaluate(function(){if(window.hidePwaBootGate)hidePwaBootGate()});await p.waitForTimeout(300);
await p.screenshot({path:OUT+"/3_titre_continuer.png"});SNAP["continuer"]=await p.evaluate(function(){return document.getElementById("title-screen-root").innerHTML});
await p.evaluate(function(){titleScreenShowLoad()});await p.waitForTimeout(500);
await p.screenshot({path:OUT+"/7_charger.png"});SNAP["charger"]=await p.evaluate(function(){return document.getElementById("title-screen-root").innerHTML});
await p.evaluate(function(){titleScreenAskDeleteSlot(HeroSlotManager.getActiveSlot()||1,{stopPropagation:function(){}})});await p.waitForTimeout(400);
await p.screenshot({path:OUT+"/8_supprimer.png"});SNAP["supprimer"]=await p.evaluate(function(){return document.getElementById("title-screen-root").innerHTML});
fs.writeFileSync(OUT+"/snap.json",JSON.stringify(SNAP));console.log("ok");await b.close();s.close();});
