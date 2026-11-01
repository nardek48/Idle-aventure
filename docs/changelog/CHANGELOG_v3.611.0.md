# v3.611.0 — Caravanes : rare garanti et commande du jour (R1 + R2)

Décision de Seb : la caravane reste manuelle, mais elle rapporte davantage. Réglages calés au banc des débouchés : sans recalage, les rares auraient atteint 3 à 4 fois ceux des Petites Aventures.

## R1 — Rare garanti sur le Long
- Le trajet Long rapporte toujours 2 matériaux rares du marché, au lieu de 25 % de chance d'en rapporter 2 ou 3 (`CARAVAN_TRIPS.long.rareChance = 1`, `CARAVAN_RARE_QTY = [2, 2]`).
- La fiche affiche « Verre des dunes ×2 » au lieu d'un pourcentage.

## R2 — Commande du jour
- Chaque marché commande une matière brute par jour civil. Le tirage est fixe pour un jour et un marché donnés (`CaravanManager.getOrder`).
- Cette ressource est chargée en premier et rapporte +25 % d'or (`CARAVAN_ORDER.goldBonus`).
- Une fois par jour et par marché, la caravane rapporte +1 rare du marché si elle en emporte au moins 100 unités. État : `game.village.caravanOrders = { day, done }`.
- Nouveau bloc « Commande du jour » dans la fiche de la caravane.

## Effet mesuré (banc, village au plafond, 4 passages par jour)
- Rares par jour : environ 6 au Désert, 9 aux Ruines, 12 à la Crypte et à la Montagne, contre 1,3 à 2,5 avant. Les Petites Aventures en rapportent environ 12.
- Or des caravanes : +12 à +21 %.

## Contrôles
- round-harness : 5 771 OK, 0 échec, sur 2 passes. Nouvelle section [406] ; [191] neutralise la commande pour garder ses calculs d'origine.
- boot : 4 OK. Création du héros : 44 OK. Parcours : 142 OK.
- i18n : 100 %.
- Aucun fichier ajouté, aucun fichier protégé modifié.
