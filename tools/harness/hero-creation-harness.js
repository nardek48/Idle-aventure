"use strict";
/* Harnais du flux de création de héros plein écran (v3.149.0) — titre -> nom -> classe -> toggle Chaos -> confirmation -> init(), + annulation.
   Usage : node tools/harness/hero-creation-harness.js . (liste des scripts lue dans index.html) */
var fs=require("fs"),path=require("path"),vm=require("vm");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var scripts=require("./index-scripts.js")(ROOT,/pwa\.js/);
var elements={};
function el(id){ if(id&&elements[id]) return elements[id]; var e={id:id,value:"",style:{setProperty:function(){},removeProperty:function(){}},classList:{add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}},innerHTML:"",textContent:"",scrollTop:0,disabled:false,querySelector:function(){return null;},querySelectorAll:function(){return [];},addEventListener:function(){},setAttribute:function(){},getAttribute:function(){return null;},appendChild:function(){},remove:function(){},hasChildNodes:function(){return false;},focus:function(){},dataset:{},offsetWidth:0,parentNode:null}; if(id) elements[id]=e; return e; }
var storage={};
var sandbox={console:console,Date:Date,Math:Math,JSON:JSON,Object:Object,Array:Array,Number:Number,String:String,Boolean:Boolean,setTimeout:function(){return 0;},clearTimeout:function(){},setInterval:function(){return 0;},clearInterval:function(){},requestAnimationFrame:function(){},performance:{now:function(){return Date.now();}},navigator:{serviceWorker:null,userAgent:"vm",vibrate:function(){}},location:{href:"",search:"",hash:"",protocol:"https:"},localStorage:{getItem:function(k){return storage.hasOwnProperty(k)?storage[k]:null;},setItem:function(k,v){storage[k]=String(v);},removeItem:function(k){delete storage[k];},key:function(i){return Object.keys(storage)[i]||null;},get length(){return Object.keys(storage).length;}},document:{getElementById:function(id){return el(id);},querySelector:function(){return null;},querySelectorAll:function(){return [];},createElement:function(){return el();},addEventListener:function(){},body:el(),documentElement:el(),hidden:false,activeElement:null},alert:function(){},confirm:function(){return true;},atob:function(s){return Buffer.from(s,"base64").toString("binary");},btoa:function(s){return Buffer.from(s,"binary").toString("base64");},structuredClone:function(v){return JSON.parse(JSON.stringify(v));},TextEncoder:TextEncoder,TextDecoder:TextDecoder,URL:URL,Blob:function(){}};
sandbox.window=sandbox;sandbox.self=sandbox;sandbox.globalThis=sandbox;sandbox.addEventListener=function(){};sandbox.removeEventListener=function(){};
vm.createContext(sandbox);
scripts.forEach(function(s){try{vm.runInContext(fs.readFileSync(path.join(ROOT,s),"utf8"),sandbox,{filename:s});}catch(e){console.error("LOAD FAIL",s,e.message);process.exit(1);}});
var g=sandbox, passes=0, failures=0;
function ok(c,m){ if(c){passes++;console.log("  ✔ "+m);}else{failures++;console.log("  ✘ "+m);} }
function host(){ return el("hero-selection-root").innerHTML; }
function title(){ return el("title-screen-root").innerHTML; }

console.log("[hc-1] Écran titre -> Nouvelle Partie -> étape 1 (nom)");
g.openTitleScreen(function(){ g.init(); });
ok(/title-screen-img-btn/.test(title()), "écran titre rendu");
g.titleScreenNewGame();
ok(title()==="", "écran titre vidé à l'ouverture de la création");
ok(/hc-overlay/.test(host()) && /Choix du nom/.test(host()) && /player-name-input/.test(host()), "étape 1 rendue (hc-overlay, ruban 'Choix du nom', input)");
ok(/hc-close-btn/.test(host()), "croix ✕ présente (retour au titre possible)");

console.log("\n[hc-2] Nom vide refusé, puis nom accepté -> étape 2 (classe)");
el("player-name-input").value="   ";
g.goToHeroStep();
ok(/Choix du nom/.test(host()), "nom vide : reste sur l'étape 1");
el("player-name-input").value="Arvian";
g.goToHeroStep();
ok(/Choix de la classe/.test(host()), "étape 2 rendue");
ok((host().match(/hc-class-card/g)||[]).length===3, "3 colonnes de classe : "+(host().match(/hc-class-card/g)||[]).length);
ok(/Chevalier/.test(host()) && /Rôdeur/.test(host()) && /Mage/.test(host()), "noms Chevalier / Rôdeur / Mage affichés");
ok(/hc-class-card active/.test(host()) && /Maître du combat/.test(host()), "Chevalier actif par défaut + tagline");
ok(/hc-chaos-toggle/.test(host()) && !/hc-chaos-toggle on/.test(host()), "toggle Chaos présent, désactivé");
ok(/hc-stats/.test(host()) && /hc-skills-toggle/.test(host()), "stats + bandeau compétences présents");
ok(/knight_m\.png/.test(host()) && /hc-gender-btn active"[^>]*>Homme/.test(host()), "genre par défaut = Homme (knight_m.png)");

console.log("\n[hc-2b] Toggle Homme/Femme (v3.151.0, skin cosmétique)");
g.selectHeroGender("f");
ok(g.pendingHeroGender==="f", "pendingHeroGender = f : "+g.pendingHeroGender);
ok(/knight_f\.png/.test(host()) && /hc-gender-btn active"[^>]*>Femme/.test(host()), "portrait Chevalier bascule sur knight_f.png");
ok(g.game.heroGender!=="f", "g.game.heroGender NON modifié tant que non confirmé (reste : "+g.game.heroGender+")");
g.selectHeroClass("mage");
ok(/mage_f\.png/.test(host()), "changement de classe conserve le genre Femme (mage_f.png)");

console.log("\n[hc-3] Changement de classe + toggle Chaos");
g.selectHeroClass("mage");
ok(g.pendingHeroId==="mage", "pendingHeroId = mage : "+g.pendingHeroId);
g.toggleHeroChaosVariant();
ok(g.pendingHeroId==="chaosMage", "toggle -> chaosMage : "+g.pendingHeroId);
ok(/hc-chaos-toggle on/.test(host()) && /Sorcier du Chaos/.test(host()), "toggle affiché 'on' + nom de la variante");
ok(/chaosMage_f\.png/.test(host()), "portrait de la colonne Mage = variante Chaos + genre Femme conservé");
g.selectHeroGender("m");
ok(/chaosMage_m\.png/.test(host()), "repasse en Homme sans perdre la variante Chaos (chaosMage_m.png)");
g.selectHeroClass("mage");
ok(g.pendingHeroId==="chaosMage", "re-clic sur la même classe ne réinitialise pas la variante");
g.selectHeroClass("archer");
ok(g.pendingHeroId==="ranger", "changement de classe -> variante de base (ranger) : "+g.pendingHeroId);
g.toggleHeroChaosVariant(); g.toggleHeroChaosVariant();
ok(g.pendingHeroId==="ranger", "double toggle revient à la base");
g.toggleHeroAttackPreview();
ok(/hc-skills-list/.test(host()) && /hc-skill-card/.test(host()), "bandeau compétences dépliable fonctionne");

console.log("\n[hc-4] Étape 3 (confirmation) -> retour -> confirmation réelle");
g.toggleHeroChaosVariant();
g.goToConfirmStep();
ok(/Confirmation/.test(host()) && /hc-confirm-portrait/.test(host()), "étape 3 rendue");
ok(/hc-confirm-name">Arvian</.test(host()), "nom affiché");
ok(/Rôdeur/.test(host()) && /hc-confirm-variant">Rôdeur du chaos</.test(host()), "classe Rôdeur + variante Chaos affichées");
ok(/Commencer l'aventure/.test(host()), "bouton Commencer l'aventure");
g.backToHeroStep();
ok(/Choix de la classe/.test(host()) && g.pendingHeroId==="chaosRanger", "retour à l'étape 2 sans perdre la sélection");
g.goToConfirmStep();
var initCalled=false; var realInit=g.init; g.init=function(){initCalled=true; return realInit.apply(this,arguments);};
g.confirmHeroSelection();
ok(g.game.heroId==="chaosRanger" && g.game.playerName==="Arvian", "game.heroId=chaosRanger, playerName=Arvian");
ok(g.game.codexChaosSeen===true, "codexChaosSeen posé (variante Chaos)");
ok(g.game.heroGender==="m", "game.heroGender='m' confirmé (dernier choix effectif : repassé en Homme en hc-3) : "+g.game.heroGender);
ok(g.HEROES_DB.chaosRanger.image.indexOf("chaosRanger_m.png")!==-1, "getter hero.image (data/heroes.js) reflète bien game.heroGender après confirmation : "+g.HEROES_DB.chaosRanger.image);
ok(host()==="", "création fermée");
ok(g.titleScreenSlotBeingCreated===null || g.titleScreenSlotBeingCreated===undefined, "titleScreenSlotBeingCreated remis à null");
ok(g.game.resources && g.game.resources.ration===3, "3 rations de départ (non-régression v3.107.2)");
ok(g.HeroSlotManager.hasSlot(1), "slot 1 sauvegardé");

console.log("\n[hc-4b] getSlotSummary reflète le genre DU SLOT, pas celui de la partie active en mémoire");
var summary1 = g.HeroSlotManager.getSlotSummary(1);
ok(summary1 && summary1.heroImage.indexOf("chaosRanger_m.png")!==-1, "résumé slot 1 (Homme, tel que sauvegardé) correct : "+ (summary1 && summary1.heroImage));
// Simule une 2e partie active en mémoire avec un genre différent, SANS toucher au slot 1 déjà sauvegardé sur disque.
g.game.heroGender = "f";
var summary1bis = g.HeroSlotManager.getSlotSummary(1);
ok(summary1bis && summary1bis.heroImage.indexOf("chaosRanger_m.png")!==-1, "résumé slot 1 toujours 'Homme' malgré game.heroGender='f' en mémoire (pas de fuite entre parties) : "+(summary1bis && summary1bis.heroImage));
g.game.heroGender = "m"; // remis en cohérence avec la partie réellement active (slot 1)

console.log("\n[hc-4c] Migration ensureGameStateDefaults() sur une save sans heroGender (vieille save)");
delete g.game.heroGender;
g.ensureGameStateDefaults();
ok(g.game.heroGender==="m", "heroGender absent -> migré à 'm' par défaut : "+g.game.heroGender);
g.game.heroGender = "m"; // remis en cohérence avec la partie réellement active

console.log("\n[hc-5] Annulation depuis le titre (✕) rouvre l'écran titre");
g.titleScreenShowLoad();
g.titleScreenCreateInSlot(2);
ok(/Choix du nom/.test(host()) && title()==="", "création slot 2 ouverte");
g.cancelHeroSelection();
ok(host()==="" && /title-screen-img-btn/.test(title()), "✕ : création fermée, écran titre rendu");
ok(!g.HeroSlotManager.hasSlot(2), "slot 2 non créé");

console.log("\n"+passes+" OK, "+failures+" échec(s)");
process.exit(failures?1:0);
