# Aethervale v3.442.0 — La Fiole noire (objets de combat, lot 2)

Suite de la v3.441.0. L'objet à contrepartie décidé par Seb, repris de la besace des Petites Aventures.

## Ce qui change
- **Fiole noire** : à 0 PV, le héros se relève avec 40 % des PV, **une fois par sortie**. Si elle sert, le **butin de la sortie est divisé par deux**. Si elle n'a pas servi, elle **revient à l'Entrepôt** au retour.
- Recette à l'Apothicaire, dès le Désert : 12 Eau purifiée + 2 Chitine des profondeurs ; commande 6 Chitine + 60 Eau purifiée. Comptée dans les préparations du jour.
- « Le seuil » des Ruines (gratuit) passe avant la Fiole.
- Icône : celle de la Fiole de la besace (`images/Icons/scene/items/item_black_vial.png`), c'est le même objet.

## Mesure (plafond-bench, 40 essais par classe et profil, sans → avec la Fiole)
| Contenu (réussite) | Chevalier | Rôdeur | Mage |
|---|---|---|---|
| Le trône de sable (Nezzam), campagne | 0 → 5 % | 5 → 40 % | 10 → 43 % |
| Le trône de sable (Nezzam), fin du Désert | 3 → 20 % | 33 → 65 % | 40 → 73 % |
| Cité engloutie, début d'acte III | 20 → 57 % | 13 → 28 % | 10 → 35 % |
Dard des profondeurs : presque inchangé. À surveiller : la récompense d'une quête est payée hors du butin de sortie, la moitié perdue ne la touche pas.

## Fichier protégé modifié (accord de Seb)
- `js/systems/combat-engine.js` : une ligne dans `onHeroDefeated`, après « Le seuil » (`CombatItems.tryFiole()`).

## Contrôles
- `round-harness` : 4 152 OK, 0 échec (3 passes) ; contrôle [216] ajouté, [215] passe à 5 objets.
- `parcours-harness` : 139 OK, 0 échec. Traductions : 100 %, 0 orphelin.
- Aucun fichier ajouté.
