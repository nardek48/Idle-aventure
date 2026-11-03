# v3.615.0 — Niveau d'objet (ilvl)

Demande de Seb, prototypée dans l'atelier (`atelier/ilvl.html`). Choix : formule B et affichage C.

## Formule B (`getItemLevel` et `getItemLevelParts`, dans `systems/equipment-system.js`)
- Monde × 10 : Forêt 10, Désert 20… Montagne 50, Tour 60.
- Plus la rareté : commune +0, inhabituelle +2, rare +4, épique +6, légendaire +8.
- Plus 1 si la valeur tirée est dans la moitié haute de sa fourchette.
- Plus le niveau d'Aether.
- L'ilvl est déduit de la pièce et n'est pas sauvegardé : les anciennes pièces en ont un tout de suite, sans migration.
- C'est de l'affichage seul : il ne verrouille rien et ne change aucun calcul.

## Affichage C
- **Icône** : l'ilvl en coin bas droit, liseré de la couleur de rareté, en face de la pastille du monde (`buildItemLevelBadgeHTML`, appelé par `buildEquipmentIconHTML` et par les tuiles du sac du héros).
- **Fiche d'objet** : pastille « ilvl 57 » et détail du calcul, par exemple « Montagne 50 · épique +6 · tirage +1 » (`buildItemLevelLineHTML`, dans `buildItemOriginHTML`).
- **Pièces compatibles** : écart d'ilvl avec la pièce portée (▲ ou ▼).
- **Équipement du héros** : « Équipement porté : ilvl moyen N ».

## Contrôles
- round-harness : 5 799 OK, 0 échec, sur 2 passes. Nouvelle section [410].
- boot : 4 OK. Création du héros : 44 OK. Parcours : 142 OK.
- i18n : 100 %.
- Aucun fichier ajouté, aucun fichier protégé modifié.
