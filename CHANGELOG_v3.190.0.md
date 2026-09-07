# v3.190.0 — BASCULE DU CADRE PRINCIPAL v2 (17 écrans)

## Approche : zéro modification des 17 builders
- **`js/ui/kframe-decorator.js`** (nouveau) : après chaque rendu de
  panel, chaque `.nb-page-frame` est transformé en structure 3 rangées
  (kf-top/kf-mid/kf-bot). Idempotent. Branché au point de rendu unique
  (`renderPanel`, ui-root.js — AVANT la restauration du scroll) + au
  rendu direct de scene-view.js. Aucun des 17 fichiers de vues touché.
- **`css/00-kframe-scope.css`** (nouveau) :
  1. neutralise l'ancien habillage ecrantext2.png de .nb-page-frame
     quand décoré (LONGHANDS uniquement — leçon v3.183) ;
  2. bascule les jetons --nb-ink/--nb-ink-dim en crème dans le cadre
     (fond pierre moussue), puis les RESTAURE dans une liste curée de
     ~45 conteneurs-cartes à fond clair (cartes = « parchemins posés
     sur la pierre », pari validé visuellement). Tout conteneur oublié
     se corrige en UNE ligne dans cette liste.
- index.html : nouveau css + script ; sw.js → 3.190.0.

## Vérification (Playwright, VRAI jeu booté dans Chromium)
Boot scripté (même séquence que boot-harness : createHeroInSlot →
confirmHeroSelection), tutoriels fermés, navigation sur 15 onglets :
**zéro erreur JS**, décoration effective partout. Contrôle visuel
complet des écrans accessibles en début de partie (Camp, Quêtes) :
rendu conforme à la maquette validée — dragons, texture, cartes crème
lisibles, boutons/jauges du kit intégrés. Les écrans verrouillés par
la progression (Équipement, Village...) retombent sur le Camp avec une
partie neuve — À CONTRÔLER EN PRIORITÉ sur ta vraie sauvegarde :
tout texte illisible se règle en ajoutant son conteneur à la liste de
00-kframe-scope.css.

## Harness
boot 4 OK · hero-creation 44 OK · round 913-914 OK (décorateur chargé
dans la liste de scripts).
