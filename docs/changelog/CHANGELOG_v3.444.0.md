# Aethervale v3.444.0 — Le coup de grâce

Retour de Seb sur des combats « un peu plats ». Variante B choisie dans l'atelier (`atelier/coup-de-grace.html`), durées validées.

## Ce qui change (écran de combat)
- **Arrêt sur image** à la mort d'un ennemi : il blanchit et se fige 90 ms (coup normal), 120 ms (coup critique), 160 ms (élite).
- **Fondu lumineux** ensuite : il monte, s'éclaire et se floute en 0,5 s, avec un anneau de lumière et des poussières.
- **Critique et élite** : la scène tremble ; l'élite a un anneau doré et plus de poussières.
- **L'or file vers la pastille du butin**, qui réagit à l'arrivée (quêtes, donjons, élites ; la chasse paie par lot, pas par bête).
- Les **boss** gardent leur coup final (inchangé). Avec « Réduire les animations », l'ancien fondu gris reste.
- Correctif au passage : l'ennemi suivant reprenait l'identifiant de celui qui tombait et effaçait son animation.

## Mesure (Chromium, 390 × 844, chasse en Forêt)
Arrêt 90 ms, puis fondu, anneau 0,5 s, poussières ; l'élément est retiré vers 740 ms.

## Contrôles
- `round-harness` : 4 165 OK, 0 échec (3 passes) ; contrôle [219] ajouté.
- `parcours-harness` : 139 OK, 0 échec. Aucun fichier ajouté, aucun fichier protégé modifié.
