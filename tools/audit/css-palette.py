#!/usr/bin/env python3
"""tools/audit/css-palette.py — v3.409.0 : nettoyage des couleurs en dur du CSS.

Relève toutes les couleurs hexadécimales des fichiers css/*.css (hors commentaires), crée une
« palette brute » de jetons --c-<famille>-<niveau> dans css/00-tokens.css pour chaque couleur
utilisée au moins MIN_USES fois, puis remplace ces couleurs par var(--c-…). Une couleur rare
très proche d'une couleur de la palette (écart RGB < SNAP) est rattachée à cette couleur ;
écart invisible à l'œil. Les autres couleurs rares restent écrites en clair.

Les jetons de la palette ne sont JAMAIS redéfinis ailleurs (contrairement à --nb-ink, que le
cadre redéfinit) : remplacer une couleur par son jeton ne change donc rien à l'écran.
Usage : python3 tools/audit/css-palette.py [--dry]  (travaille dans game/, d'où qu'on le lance)"""
import re, glob, colorsys, sys, collections, os

# Les chemins css/... sont relatifs au jeu : on se place dans game/.
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "game"))

MIN_USES = 2
SNAP = 7.0
TOKENS = "css/00-tokens.css"
START, END = "/* === PALETTE BRUTE (tools/css-palette.py) === */", "/* === FIN PALETTE BRUTE === */"
HEX = re.compile(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')
COMMENT = re.compile(r'/\*.*?\*/', re.S)

def norm(h):
    h = h.lower()
    return '#' + (''.join(c * 2 for c in h) if len(h) == 3 else h)

def rgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))

def family(h):
    r, g, b = [x / 255 for x in rgb(h)]
    hh, l, s = colorsys.rgb_to_hls(r, g, b)
    deg = hh * 360
    if l > 0.97: return "white"
    if l < 0.03: return "black"
    if s < 0.12: return "grey"
    if deg < 18 or deg >= 340: return "red"
    if deg < 45: return "brown" if l < 0.5 else "cream" if l > 0.82 else "bronze"
    if deg < 66: return "gold" if l <= 0.82 else "cream"
    if deg < 170: return "green"
    if deg < 255: return "blue"
    return "violet"

def level(h):
    """clarté → niveau 50 (très clair) à 950 (très sombre), par pas de 50"""
    l = colorsys.rgb_to_hls(*[x / 255 for x in rgb(h)])[1]
    return max(50, min(950, int(round((1 - l) * 20)) * 50 or 50))

def sat(h): return colorsys.rgb_to_hls(*[x / 255 for x in rgb(h)])[2]

def split_comments(text):
    """[(est_commentaire, morceau)]"""
    out, pos = [], 0
    for m in COMMENT.finditer(text):
        out.append((False, text[pos:m.start()])); out.append((True, m.group(0))); pos = m.end()
    out.append((False, text[pos:]))
    return out

def main(dry):
    files = sorted(glob.glob("css/*.css"))
    src = {f: open(f, encoding="utf8").read() for f in files}
    # retire une éventuelle palette déjà posée (relance idempotente)
    t = src[TOKENS]
    if START in t:
        # relance : on remet les couleurs en clair (jetons de la palette → hexa), puis on recommence
        old = dict(re.findall(r'(--c-[a-z0-9-]+): (#[0-9a-f]{6});', t[t.index(START):t.index(END)]))
        t = t[:t.index(START)] + t[t.index(END) + len(END):].lstrip("\n")
        src[TOKENS] = t
        for f in src: src[f] = re.sub(r'var\((--c-[a-z0-9-]+)\)', lambda m: old.get(m.group(1), m.group(0)), src[f])
    count = collections.Counter()
    for f, s in src.items():
        for is_c, part in split_comments(s):
            if not is_c:
                for m in HEX.finditer(part): count[norm(m.group(1))] += 1
    def dist(a, b): return sum((x - y) ** 2 for x, y in zip(rgb(a), rgb(b))) ** 0.5
    # palette : couleurs fréquentes ; deux couleurs quasi identiques fusionnent vers la plus utilisée
    pal, snap = [], {}
    for h, n in sorted(count.items(), key=lambda kv: (-kv[1], kv[0])):
        if n < MIN_USES: continue
        near = [p for p in pal if dist(h, p) < SNAP]
        if near: snap[h] = min(near, key=lambda p: dist(h, p))
        else: pal.append(h)
    for h, n in count.items():
        if n >= MIN_USES or not pal or h in snap: continue
        best = min(pal, key=lambda p: dist(h, p))
        if dist(h, best) < SNAP: snap[h] = best
    # noms : famille + niveau ; à niveau égal, la moins saturée est « -soft », la plus saturée « -vivid »
    groups = collections.defaultdict(list)
    for h in pal: groups["--c-%s-%d" % (family(h), level(h))].append(h)
    names = {}
    for base, hs in groups.items():
        hs.sort(key=sat)
        if len(hs) == 1: tags = [""]
        elif len(hs) == 2: tags = ["-soft", ""]
        elif len(hs) == 3: tags = ["-soft", "", "-vivid"]
        else: tags = ["-soft"] + ["-%d" % i for i in range(2, len(hs))] + ["-vivid"]
        for h, tg in zip(hs, tags): names[h] = base + tg
    def repl(m):
        h = norm(m.group(1)); h = snap.get(h, h)
        return "var(%s)" % names[h] if h in names else m.group(0)
    changed, left = 0, collections.Counter()
    for f, s in src.items():
        parts = []
        for is_c, part in split_comments(s):
            if is_c: parts.append(part); continue
            new = HEX.sub(repl, part); changed += len(HEX.findall(part)) - len(HEX.findall(new))
            for m in HEX.finditer(new): left[norm(m.group(1))] += 1
            parts.append(new)
        src[f] = "".join(parts)
    block = [START, "/* Couleurs du jeu, une par valeur. Générée : ne pas éditer à la main, relancer le script.",
             "   Ne jamais redéfinir ces jetons dans un sélecteur (ils doivent rester fixes). */", ":root {"]
    for h in sorted(pal, key=lambda x: names[x]): block.append("  %s: %s; /* %d */" % (names[h], h, count[h] + sum(1 for k, v in snap.items() if v == h)))
    block += ["}", END, ""]
    t = src[TOKENS]
    # la palette se place AVANT le premier :root pour que les jetons existants puissent s'en servir
    i = t.index(":root")
    # recule jusqu'au début du commentaire d'en-tête éventuel ? on la place en tête de fichier
    src[TOKENS] = "\n".join(block) + "\n" + t
    # les définitions de la palette ne doivent pas être remplacées par elles-mêmes : on réécrit le bloc tel quel
    print("couleurs distinctes : %d ; palette : %d ; rattachées : %d ; remplacements : %d ; restées en clair : %d (%d distinctes)"
          % (len(count), len(pal), len(snap), changed, sum(left.values()), len(left)))
    if not dry:
        for f, s in src.items(): open(f, "w", encoding="utf8").write(s)

if __name__ == "__main__":
    main("--dry" in sys.argv)
