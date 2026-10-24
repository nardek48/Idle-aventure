# v3.469.3 — Petites Aventures : deux accroches de plus aux Ruines et à la Crypte

Point 2 du bilan des Petites Aventures (choix de Seb, option 1). Les Ruines et la Crypte n'avaient qu'une accroche chacune : c'était toujours la même rencontre. Elles en ont maintenant trois, comme le Désert.

## Les accroches
**Ruines**
- **Le bâtisseur égaré** : un bâtisseur perdu, qui a soif.
  - Choix : Lui donner la gourde · Lui montrer le chemin (20 Souffle) · Passer.
  - Aidé : au premier combat des actes II et III, une pierre tombe d'un toit (un ennemi de moins). Passé : coffre final −15 %.
- **La statue au carrefour** : une statue qui tend une pièce.
  - Prendre la pièce : la marque (un cran de plus aux dés, combats 20 % plus durs).
  - Poser une ration à ses pieds : au camp, la relique *Pierre qui chante*.
  - Passer.

**Crypte**
- **Le garçon aux mèches** : le garçon des lampes de Sarkel, endormi parmi les morts.
  - Le réveiller doucement (15 Souffle) : au camp, il t'attend et te donne l'*Œil de chouette* (toute la carte se révèle).
  - Le laisser dormir.
- **La cloche sans sonneur** : une cloche qui sonne seule.
  - Tenir la corde (10 Souffle) : la marque.
  - Lui donner ta Corde (elle quitte la besace) : coffre final +25 % et une Cire de sépulcre de plus.
  - Passer.

Chaque accroche a ses phrases en route et à la destination (la cour au puits, la chapelle de l'ouest), selon le choix fait.

## Code
- `data/pa2-content.js` : `PA2_HOOKS.batisseur`, `.statue`, `.garcon`, `.cloche` ; `PA2_HOOKS_BY_WORLD` (ruins : carnet, batisseur, statue ; crypt : lampe, garcon, cloche). Tout passe par les mécanismes d'accroche déjà en place (coût, appui, marque, cadeau au camp, or et ressource rare de destination, échos).
- `lang/en.js` : 51 textes.
- Aucun fichier protégé, aucun fichier ajouté, aucune image (la Rencontre garde son icône).

## Contrôles
- `round-harness.js` [285] (15 contrôles : listes, tirage, chaque suite des quatre accroches, fiche de la rencontre).
- `pa2-bench.js` au Périple (100 runs par cellule) : Ruines 34 % de KO, Crypte 24 %, sans blocage.
- i18n 100 %, aucun orphelin.
- round-harness 4743 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
