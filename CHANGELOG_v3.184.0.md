# v3.184.0 — Trier/⚙ (inventaire) sur le bouton du kit

Résolution du « bouton bleu » : Seb désignait le bouton du KIT lui-même
(btn-rect-normal.png — plaque BLEUE à liseré or, celui de tous les
.settings-btn/.btn-buy depuis v3.168-169 ; je le décrivais à tort
comme « or » sans l'avoir jamais regardé). `.inv-toolbar-btn` (⇅ Trier
et ⚙ de l'inventaire d'équipement) avait été oublié par la bascule
v3.168 — il rejoint la source unique css/00-kbtn.css (base + :active
asset pressé), le bloc local ne gardant que le dimensionnement compact
de la barre d'outils. Rendu VÉRIFIÉ sous Playwright.

Note : v3.183 disait à tort que nos versions avaient divergé sur ce
point — c'était mon erreur d'appellation, pas une divergence.

sw.js CACHE_VERSION → 3.184.0 · harness : 4 / 44 / 91x OK.
