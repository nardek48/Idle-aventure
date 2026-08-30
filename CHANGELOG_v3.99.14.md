# Aethervale v3.99.14 — BoutonBase.png intégré aux boutons "Charger"

## Précision suite à confusion

`BoutonBase.png` (fourni précédemment) n'avait pas été utilisé dans la
livraison v3.99.13 — Seb l'avait initialement testé sur les **cartes**
de sauvegarde entières (échec : ratio trop compact, cadre déformé),
essai annulé. Il était en fait destiné à deux **boutons** précis, jamais
clarifiés avant cette livraison :

1. Le bouton "Charger" individuel sur chaque carte de sauvegarde
2. Le bouton "Charger" global en bas de la vue "Charger la Partie"

## Changement

Les deux boutons "Charger" (individuel et global) utilisent maintenant
`BoutonBase.png` comme fond, remplaçant le style CSS uni violet
utilisé jusqu'ici — cohérence visuelle avec le reste de l'écran titre
(mêmes codes graphiques que les boutons "Nouvelle Partie"/"Charger la
Partie" de l'écran principal).

Sur un **bouton** (par opposition à une carte avec du texte
multi-lignes), le ratio 2.3 de cette image est en fait bien adapté —
similaire aux boutons déjà en place (ratio ~4.2-4.5). Aucun étirement
disgracieux cette fois.

## Détails techniques

- Nouvel asset `images/TitleScreen/btn_charger_base.png` (redimensionné
  à 700px de large).
- Bande pleine mesurée à exactement 50% de la hauteur de l'image —
  centrage flex simple suffit, aucun `translateY` de compensation
  nécessaire (contrairement aux boutons "Nouvelle Partie"/"Charger la
  Partie" de l'écran principal, dont les cadres sont asymétriques).
- `js/ui/title-screen-view.js` :
  - Bouton "Charger" par carte (`.title-slot-load-btn`) : passe du
    `<button>Charger</button>` texte simple à
    `<button><img class="title-slot-load-btn-bg"><span>Charger</span></button>`,
    même pattern que les autres boutons image du projet.
  - Bouton "Charger" global (`.title-screen-confirm-load-btn`) : même
    transformation.
- `css/00-title-screen.css` :
  - `.title-slot-load-btn` : conteneur compact (76px de large,
    `aspect-ratio: 700/304`), reste lisible à cette échelle malgré les
    détails fins du cadre (vérifié visuellement, zoom x2).
  - `.title-screen-confirm-load-btn` : conteneur pleine largeur, même
    ratio, cohérent avec les boutons de l'écran principal.
  - États `:disabled` (bouton global tant qu'aucune carte n'est
    sélectionnée) et `:active` (retour tactile) conservés à l'identique.

## Tests effectués

- `node --check` sur `title-screen-view.js` et `sw.js`.
- Harness VM Node : confirme que les deux boutons référencent bien
  `btn_charger_base.png`, et que le chargement direct via le bouton
  d'une carte fonctionne toujours après le changement de markup.
- Rendu visuel réel (Playwright/Chromium headless) : les deux boutons
  rendent correctement ; zoom x2 sur le petit bouton par carte pour
  confirmer sa lisibilité à taille compacte.

## Fichiers livrés

`title-screen-view.js`, `00-title-screen.css`, `sw.js` (bump
`CACHE_VERSION` → `3.99.14`), et `btn_charger_base.png`.
