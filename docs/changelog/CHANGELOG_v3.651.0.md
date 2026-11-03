# v3.651.0 — Héros : le bandeau illustré sur tous les onglets

Demande de Seb du 03/11 : l'image titre n'apparaissait que dans Résumé.

## Ce qui change
- Le bandeau illustré de l'écran Héros (« Le terrain d'entraînement », il suit le monde comme les autres) s'affiche aussi dans **Équipement, Talents et Alliés**, comme sur Camp, Quêtes et Village. Téléphone 150 px, grand écran 321 px ; il se replie en défilant, comme ailleurs.
- `herosFrameOpen` pose le bandeau à chaque sous-vue (le paramètre « fiche principale seulement » de la v3.581.0 est retiré).
- Une ligne dans « Quoi de neuf ».

## Fichiers
`js/ui/heros-view.js`, `js/ui/news-view.js`, `js/lang/en.js`.

## Contrôles
`round-harness` 0 échec (deux passes) ; `boot-harness`, `hero-creation-harness`, `parcours-harness` P14 ; audit i18n 100 %. Chromium : les 4 onglets, iPhone 390 et Mac 1440 × 900, aucune erreur.
