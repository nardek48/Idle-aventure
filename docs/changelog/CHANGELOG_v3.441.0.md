# Aethervale v3.441.0 — Les objets de combat (lot 1)

Décisions de Seb (docs/pistes-combat.md) : des objets qui répondent aux traits ennemis, qui aident sans jamais être obligatoires. Maquette validée : `atelier/objets-combat.html`.

## Ce qui change
- **Quatre préparations de combat**, faites à l'Apothicaire et rangées à l'Entrepôt :
  | Objet | Contre | Recette dès | Préparation | Commande (une fois) |
  |---|---|---|---|---|
  | Baume froid | Enragé | Forêt | 8 Eau purifiée + 12 Blé | 80 Blé + 30 Eau purifiée |
  | Encens amer | Corrupteur | Forêt | 8 Eau purifiée + 12 Bois | 80 Bois + 30 Eau purifiée |
  | Huile de lame | Blindé | Désert | 10 Eau purifiée + 8 Fer | 60 Fer + 50 Eau purifiée |
  | Sel de fer | Vampirique | Ruines | 12 Eau purifiée + 4 Lingots | 24 Lingots + 60 Eau purifiée |
  Le double d'une potion à bonus (décision Seb). Elles comptent dans les préparations du jour de l'Apothicaire.
- **Préparation de sortie** : section « Objets ». « Ce que tu vas affronter » dit pour chaque trait connu qui y répond (ta règle, ton objet, ou rien) ; la liste marque l'objet « Utile ici ». 1 place, 2 à l'Apothicaire niveau 4.
- **En combat**, en Tactique comme en Grimoire : l'objet pose seul le contre de son trait (les chiffres d'une règle du Grimoire) dès l'ouverture, et le repose quand il retombe. Tant qu'il tient le trait, la condition correspondante du Grimoire est fausse : aucune compétence gaspillée.
- L'objet est retiré de l'Entrepôt au départ et consommé, qu'il ait servi ou non.
- **Boutique, Potions** : section « Préparations de combat » (recette, ingrédients, Préparer), dès que l'Apothicaire est construit.

## Mesure (plafond-bench, 40 essais par classe et profil, sans objet → avec)
| Contenu | Objet | Chevalier | Rôdeur | Mage |
|---|---|---|---|---|
| Cité engloutie, début d'acte III (réussite) | Baume froid | 20 → 48 % | 13 → 23 % | 10 → 33 % |
| Cité engloutie, début d'acte III (réussite) | Encens amer | 20 → 35 % | 13 → 20 % | 10 → 18 % |
| Cité engloutie, campagne (réussite) | Baume froid | 98 → 100 % | 80 → 90 % | 78 → 98 % |
| Dard des profondeurs (potions bues) | Baume froid | 1,2 → 0,3 | 1,6 → 0,8 | 1,2 → 0,5 |
| Serment sous l'armure (PV restants) | Huile de lame | 56 → 68 % | 49 → 53 % | 52 → 60 % |
Sans objet, chiffres inchangés. L'Huile de lame pèse peu dans la Cité (le Blindé ne retire que 10 %). Nezzam n'est concerné par aucun objet de ce lot.

## Fichiers ajoutés (index.html + précache de sw.js)
- `js/data/combat-items.js`
- `js/systems/combat-item-system.js`

## Icônes à dessiner (icône générique en attendant, chemins gardés)
`images/Icons/combat_items/baume_froid.png`, `encens_amer.png`, `huile_de_lame.png`, `sel_de_fer.png`.

## Contrôles
- `round-harness` : 4 145 OK, 0 échec (3 passes) ; contrôle [215] ajouté.
- `parcours-harness` : 139 OK, 0 échec. Traductions : 100 %, 0 orphelin.
- Aucun fichier protégé modifié. Accroches : `TalentManager.onCombatStart`, `ClassCombatManager.onRoundEnd`, contexte du Grimoire (`class-combat-system.js`), `SortieManager` (objets de la sortie).
- `tools/sim/plafond-bench.js` : option `--objet id[,id]`.
