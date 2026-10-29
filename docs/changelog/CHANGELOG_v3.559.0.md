# v3.559.0 — Grand écran, option C : l'arène de combat pleine largeur

Accord de Seb du 29/10 (« ok pour l'option C maintenant »), d'après la maquette `atelier/grand-ecran.html`. Format large seulement : **le téléphone ne change pas**.

## Ce qui change sur grand écran
- **L'arène prend toute la page** entre le rail et la Chronique, sur le fond paysage du monde : les ennemis se placent sur toute la largeur (même calcul qu'au téléphone, en pourcentage de l'arène et à la hauteur de l'écran).
- Le **nom et les PV de la cible** restent au centre (560 px au plus), l'**équipe en ligne** sur 800 px, les **commandes** (techniques, potions, ATTAQUER) sur 640 px.
- **Chronique de combat** : les états passent en **pastilles** (icône, nom, durée ; l'explication au survol). Ceux du prochain round (« Au prochain round ») gardent leur explication en entier, encadrés de rouge.
- Les touches du combat (1 à 6, Espace) ne changent pas.

## Code
- `css/10-grand-ecran.css` : section « option C ».
- `js/ui/combat-screen-view.js` : chaque ligne d'état porte son explication en infobulle (`title`), aussi dans la feuille États du combat.
- Aucun fichier ajouté, aucun fichier protégé (`combat-engine.js` non touché).

## Contrôles
`round-harness` 5 478 OK, 0 échec (deux passes, section [374] ajoutée) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK. Combat de donjon vérifié à 1440 × 900, 1366 × 768, 1180 × 820 et sur téléphone (inchangé).
