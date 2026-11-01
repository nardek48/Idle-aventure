# v3.610.0 — Caravane : la part laissée au village se règle

Retour de Seb : au Désert, des caravanes étaient bloquées (« Rien à charger »). Elles n'emportaient que ce qui dépassait la moitié du plafond, et les stocks y restaient sous 1 000 sur 2 000 pendant la construction du village.

- Dans la fiche de la caravane, nouvelle ligne « Laisser au village : {p} % du plafond » avec − et + : de 10 à 75 %, par pas de 5 %, 50 % par défaut.
  - Côté code : `CaravanManager.getKeepShare` et `stepKeepShare`. L'état est `game.village.caravanKeep`, sauvegardé avec `game.village`.
- La réserve protégée de l'Entrepôt reste prioritaire.
- Textes mis à jour : le message de la caravane vide, l'explication du chargement, et la ligne « Caravane de la Halle » de l'Entrepôt. Ligne ajoutée au Quoi de neuf (FR + EN).
- Le versement manuel « Verser le surplus » du Grand Ouvrage garde sa règle (la moitié du plafond).
- Décision de Seb : la caravane reste manuelle. La suite (R1 rare garanti sur le trajet Long, R2 commande du jour par marché) sera chiffrée au banc.

## Contrôles
- round-harness : 5 762 OK, 0 échec, sur 2 passes. Nouvelle section [405].
- boot : 4 OK. Création du héros : 44 OK. Parcours : 142 OK.
- i18n : 100 %, 0 orphelin.
- Aucun fichier ajouté, aucun fichier protégé modifié.
