# tools/audit/bestiaire-atelier.py (23/10/2026, hors jeu) : atelier d'images d'un monde, à partir des captures de bestiaire-captures.js.
# USAGE : python3 tools/audit/bestiaire-atelier.py <lot> <dossier neuf> [--publication <fichier>]
#   -> atelier/bestiaire-<lot>.html (autonome) ; --publication : même page sans squelette HTML, pour la publier en page privée.
import base64, io, json, os, sys
from PIL import Image

DEPOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOT, NEUF = sys.argv[1], os.path.abspath(sys.argv[2])
PUB = sys.argv[sys.argv.index('--publication') + 1] if '--publication' in sys.argv else None
CAP = os.path.join(DEPOT, 'captures', 'bestiaire-' + LOT)
MONDES = {'forest': 'Forêt enchantée', 'desert': 'Désert oublié', 'ruins': 'Ruines anciennes', 'crypt': 'Crypte des dormeurs', 'mountain': 'Montagne brûlante', 'tower': 'Tour du sorcier'}

def b64(im, q=80):
    buf = io.BytesIO(); im.convert('RGB').save(buf, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()

def shot(n): return b64(Image.open(os.path.join(CAP, n + '.png')))

conf = json.load(open(os.path.join(CAP, 'scenes.json')))
# Trois sections : ennemis seuls, boss et élites (intro comprise), groupes
scenes = {}
for sc in conf['scenes']:
    sec = 'groupe' if 'groupe' in sc else ('boss' if ('boss' in sc or 'elite' in sc) else 'seul')
    cap = sc.get('cap') or ('Seul en combat.' if sec == 'seul' else '')
    scenes[sc['k']] = {'nom': sc['nom'], 'cap': cap, 'sec': sec, 'actuel': shot('actuel_' + sc['k']), 'neuf': shot('neuf_' + sc['k'])}
    if sc.get('intro'):
        scenes[sc['k'] + '_intro'] = {'nom': sc['nom'] + ', intro', 'cap': 'Moment d’entrée (cadre doré), avant le combat.', 'sec': 'boss',
                                      'actuel': shot('actuel_' + sc['k'] + '_intro'), 'neuf': shot('neuf_' + sc['k'] + '_intro')}
# Images brutes : chaque fichier du dossier neuf, face à l'actuel du jeu
bruts = []
for racine, _, fichiers in sorted(os.walk(os.path.join(NEUF, 'images'))):
    for f in sorted(fichiers):
        rel = os.path.relpath(os.path.join(racine, f), NEUF)
        actuel = os.path.join(DEPOT, 'game', rel)
        bruts.append({'chemin': rel, 'actuel': b64(Image.open(actuel).resize((420, 420), Image.LANCZOS), 82) if os.path.exists(actuel) else '',
                      'neuf': b64(Image.open(os.path.join(racine, f)).resize((420, 420), Image.LANCZOS), 82)})
ver = open(os.path.join(DEPOT, 'game/js/core/constants.js')).read().split('GAME_VERSION')[1].split('"')[1]
monde = MONDES.get(conf['monde'], conf['monde'])

corps = '''<title>Atelier images LOT_TITRE</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* Une colonne téléphone : onglets de scène par section, bascule Actuelle / Nouvelle / Côte à côte, captures du vrai jeu à 390 × 844. */
:root {
  color-scheme: dark;
  --nuit: #14100b; --pierre: #221a12; --trait: #4a3a27; --parchemin: #f4e9d0; --sourd: #c9b896; --or: #f0aa3e;
  --f-titre: "Cinzel", Georgia, serif; --f-texte: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; --f-code: ui-monospace, "SF Mono", Menlo, monospace;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--nuit); color: var(--parchemin); font: 15px/1.45 var(--f-texte); }
.wrap { max-width: 440px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 14px 28px; display: grid; gap: 12px; }
.wrap.large { max-width: 820px; }
h1 { font: 600 20px/1.2 var(--f-titre); letter-spacing: .03em; margin: 0; color: var(--or); text-wrap: balance; }
h2 { font: 600 15px var(--f-titre); color: var(--or); margin: 10px 0 0; letter-spacing: .03em; }
.lbl { margin: 0 0 -6px; font: 600 12px var(--f-texte); color: var(--sourd); letter-spacing: .06em; text-transform: uppercase; }
.intro, .cap { margin: 0; color: var(--sourd); font-size: 14px; }
.rail { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
.rail button, .seg button { flex: none; font: 600 13px var(--f-texte); color: var(--parchemin); background: var(--pierre); border: 1px solid var(--trait); border-radius: 10px; min-height: 40px; padding: 0 12px; }
.rail button[aria-pressed="true"], .seg button[aria-pressed="true"] { border-color: var(--or); color: var(--or); }
.seg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
button:focus-visible { outline: 2px solid var(--or); outline-offset: 2px; }
.vue { display: grid; gap: 8px; grid-template-columns: 1fr; }
.vue.duo { grid-template-columns: 1fr 1fr; }
figure { margin: 0; display: grid; gap: 4px; min-width: 0; }
figcaption { font: 600 12px var(--f-texte); color: var(--sourd); text-align: center; letter-spacing: .04em; text-transform: uppercase; }
.ecran { width: 100%; max-width: 390px; margin: 0 auto; border-radius: 16px; border: 1px solid var(--trait); display: block; }
.bruts { display: grid; gap: 10px; }
.brut { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.brut img, .brut .vide { width: 100%; max-width: 100%; aspect-ratio: 1; border-radius: 10px; border: 1px solid var(--trait); display: block; }
.brut p { grid-column: 1 / -1; margin: 0; font: 12px var(--f-code); color: var(--sourd); overflow-wrap: anywhere; }
</style>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&display=swap">
<div class="wrap" id="wrap">
  <h1>Atelier images LOT_MONDE</h1>
  <p class="intro">Captures du vrai jeu (vLOT_VER) à 390 × 844, Chevalier niveau 1. Seules les images fournies changent entre « Actuelle » et « Nouvelle ».</p>
  <p class="lbl">Seuls</p>
  <div class="rail" id="rail-seul" role="group" aria-label="Ennemi seul"></div>
  <p class="lbl">Boss et élites</p>
  <div class="rail" id="rail-boss" role="group" aria-label="Boss et élites"></div>
  <p class="lbl">Groupes</p>
  <div class="rail" id="rail-groupe" role="group" aria-label="Combat de groupe"></div>
  <div class="seg" role="group" aria-label="Version">
    <button type="button" data-v="actuel">Actuelle</button>
    <button type="button" data-v="neuf">Nouvelle</button>
    <button type="button" data-v="duo">Côte à côte</button>
  </div>
  <p class="cap" id="cap"></p>
  <div class="vue" id="vue"></div>
  <h2>Images brutes</h2>
  <div class="bruts" id="bruts"></div>
</div>
<script>
"use strict";
// Données embarquées : captures (actuel / neuf) par scène, puis images sources
var SCENES = LOT_SCENES;
var BRUTS = LOT_BRUTS;
var CLE = "atelier-bestiaire-LOT_CLE";
var etat = { scene: Object.keys(SCENES)[0], v: "duo" };
try { var m = JSON.parse(localStorage.getItem(CLE) || "{}"); if (SCENES[m.scene]) etat.scene = m.scene; if (m.v) etat.v = m.v; } catch (e) {}
function fig(src, legende) { return '<figure><img class="ecran" src="' + src + '" alt="' + legende + '"><figcaption>' + legende + '</figcaption></figure>'; }
function rendre() {
  var s = SCENES[etat.scene];
  document.querySelectorAll(".rail button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.k === etat.scene)); });
  document.querySelectorAll(".seg button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === etat.v)); });
  document.getElementById("cap").textContent = s.cap;
  document.getElementById("wrap").className = "wrap" + (etat.v === "duo" ? " large" : "");
  var vue = document.getElementById("vue");
  vue.className = "vue" + (etat.v === "duo" ? " duo" : "");
  vue.innerHTML = etat.v === "duo" ? fig(s.actuel, "Actuelle") + fig(s.neuf, "Nouvelle") : fig(s[etat.v], etat.v === "neuf" ? "Nouvelle" : "Actuelle");
  try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) {}
}
["seul", "boss", "groupe"].forEach(function (sec) {
  var rail = document.getElementById("rail-" + sec);
  rail.innerHTML = Object.keys(SCENES).filter(function (k) { return SCENES[k].sec === sec; }).map(function (k) { return '<button type="button" data-k="' + k + '">' + SCENES[k].nom + '</button>'; }).join("");
  rail.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { etat.scene = b.dataset.k; rendre(); } });
});
document.querySelector(".seg").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { etat.v = b.dataset.v; rendre(); } });
document.getElementById("bruts").innerHTML = BRUTS.map(function (b) {
  return '<div class="brut"><p>' + b.chemin + '</p>' + (b.actuel ? '<img src="' + b.actuel + '" alt="Actuelle">' : '<div class="vide"></div>') + '<img src="' + b.neuf + '" alt="Nouvelle"></div>';
}).join("");
rendre();
</script>
'''
corps = (corps.replace('LOT_TITRE', monde.split(' ')[0]).replace('LOT_MONDE', 'de la ' + monde if monde.startswith(('Forêt', 'Crypte', 'Montagne', 'Tour')) else 'des ' + monde)
         .replace('LOT_VER', ver).replace('LOT_CLE', LOT)
         .replace('LOT_SCENES', json.dumps(scenes, ensure_ascii=False)).replace('LOT_BRUTS', json.dumps(bruts, ensure_ascii=False)))
if PUB:
    open(PUB, 'w').write(corps)
# Version autonome du dépôt : squelette complet, sans la méta propre à la publication
t, reste = corps.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '', 1).split('\n', 1)
autonome = ('<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            + t + '\n' + reste.replace('<div class="wrap" id="wrap">', '</head><body><div class="wrap" id="wrap">', 1) + '</body></html>\n')
sortie = os.path.join(DEPOT, 'atelier', 'bestiaire-' + LOT + '.html')
open(sortie, 'w').write(autonome)
print(sortie, len(autonome) // 1024, 'Ko,', len(scenes), 'scènes,', len(bruts), 'images')
