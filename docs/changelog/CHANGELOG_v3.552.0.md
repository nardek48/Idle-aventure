# v3.552.0 — Grand écran : les 7 fonds de combat en paysage

Accord de Seb du 29/10 (« ok tu peux intégrer »), après l'atelier des arènes en paysage. Format large seulement : **le téléphone garde ses fonds en hauteur**.

## Ce qui change
- **7 nouveaux fonds** (3 072 × 2 048, WebP qualité 76, 355 à 575 Ko), faits par Seb : Forêt, Désert, Ruines, Crypte, Montagne, Tour, Tanière du Basilic.
- En combat sur PC et tablette, quand le monde a son fond paysage, **l'arène prend toute la page** entre le rail et la Chronique. Les commandes du combat restent sur 560 px au centre. Un léger assombrissement en haut et en bas garde lisibles le nom de l'ennemi et la barre d'actions.
- Sans fond paysage (aucun cas aujourd'hui), l'ancien affichage reste : colonne sur le fond en hauteur, côtés flous.
- Netteté mesurée (Chromium, Mac 1440 × 900 Retina) : ×0,79 dans l'arène, contre ×2,57 pour l'ancien fond étiré.

## Corrigé
- Les fonds paysage n'auraient jamais été trouvés : leur chemin (relatif à `css/`) était cherché depuis la page. Il est maintenant résolu depuis `css/`.

## Code
- **Fichiers ajoutés (images)** : `images/Maps/{forest,desert,ruins,crypt,mountain,tower}-combat-wide.webp`, `images/Dungeons/donjon_poison/donjon_poison-wide.webp`. Chargées à la demande (pas de précache, comme les fonds en hauteur).
- `js/ui/chronique-view.js` : chemin du fond paysage résolu depuis `css/`.
- `css/10-grand-ecran.css` : arène pleine page avec un fond paysage.
- Aucun fichier JS ou CSS ajouté, aucun fichier protégé.

## Contrôles
`round-harness` 5 451 OK, 0 échec (deux passes, section [330] complétée) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK. Combat de donjon vérifié à 1440 × 900, 1366 × 768, 1180 × 820 et sur téléphone.
