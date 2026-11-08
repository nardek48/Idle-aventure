# v3.745.0 — Bulle d'or (piste A de l'étude or/Forge)

Choix de Seb dans `atelier/bulle-or.html` (or-retour A, or-liste B, or-bloque B ; forge-gain déjà couvert par la v3.743).
Aucun fichier protégé, aucun nouvel état persistant, aucun fichier nouveau.

- `or-a-investir-view.js` : le « + » repulse quand l'or a doublé depuis la dernière ouverture (≥ 10 000, repère `orInvestGoldRef` en mémoire vive) ;
  trois groupes « Tout de suite » / « Il manque quelque chose » / « Plus tard » ; échoppe (Rare de vitrine, relique, relance muette) et Enchanteresse
  (relance la moins chère, une fois par niveau) ; une carte par matériau manquant (or retenu, recette, production possible, lien « Produire »,
  `orInvestGate` généralisé).
- Intérêt : Rare de vitrine 100, rangs de sorts 90, Atelier 85, paliers de compagnons 80, compétences 60, Enchanteresse 45, relique 40,
  entraînement 35, reforge 30, Forge 29, bâtiments 28, relance de vitrine 5. Regroupement par sorte (« et N autres »), plafonds 6 / 3 / 6.
- `02-layout.css` : la cible du « + » passe à 46 × 46 px au moins. `04-panel-evolutions.css` : textes à 13 px.
- Icône propre « Compétences des compagnons » (`companions/competences_compagnons.webp`, générique d'ici là, prompt dans « Images à générer »).
- Harnais : section [499], 26 contrôles.
