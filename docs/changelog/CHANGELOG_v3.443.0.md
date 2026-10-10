# Aethervale v3.443.0 — Acide mordant et Pastille de miel (objets de combat, lot 3)

Contre les coups ANNONCÉS, l'objet atténue au lieu d'annuler (décision Seb, option B) : il s'ajoute à la règle du Grimoire, qui seule annule le coup.

## Ce qui change
- **Acide mordant** (Bouclier) : tout bouclier posé ne tient qu'un round au lieu de deux (le sien, celui d'un boss, le mur du Bâtisseur). Recette dès la Forêt : 8 Eau purifiée + 12 Pierre ; commande 80 Pierre + 30 Eau purifiée.
- **Pastille de miel** (Silence) : tes techniques ne sont bloquées qu'un round au lieu de deux, jamais moins d'un (avec « La forme du roi », déjà à un round, elle n'ajoute rien). Recette dès la Forêt : 8 Eau purifiée + 12 Farine ; commande 80 Farine + 30 Eau purifiée.
- Préparation de sortie : « {objet} l'atténue » ; marqué « Utile ici, en plus de ta règle » même quand une règle contre déjà le coup.
- Aucun fichier protégé : la durée du Silence se règle dans `data/enemy-archetypes.js` (`getHeroSilenceRounds`), le bouclier dans `systems/combat-item-system.js`.

## Mesure (plafond-bench, 40 essais par classe et profil)
- **Arbre-mère** (Bouclier), sans → avec l'Acide : 14 → 13 rounds (Chevalier), PV restants 69 → 70 %. Effet faible, contenu déjà facile.
- **Nezzam** (Silence), sans → avec la Pastille : écarts dans le bruit du banc (campagne 0/5/10 → 0/10/8 %, fin du Désert 3/33/40 → 3/15/50 %). Avec la Pastille ET la Fiole noire : 0/30/43 et 13/60/83 %, proche de la Fiole seule.
- Conclusion : les deux objets sont faibles. Pistes de renfort proposées à Seb, rien de changé sans son accord.

## Contrôles
- `round-harness` : 4 158 OK, 0 échec (3 passes) ; contrôle [217] ajouté, [215] passe à 7 objets.
- `parcours-harness` : 139 OK, 0 échec. Traductions : 100 %, 0 orphelin.
- Aucun fichier ajouté. Icônes à dessiner : `images/Icons/combat_items/acide_mordant.png`, `pastille_de_miel.png`.
