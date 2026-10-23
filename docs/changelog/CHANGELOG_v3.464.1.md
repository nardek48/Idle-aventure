# v3.464.1 — Désert, Ruines, Montagne, Tour : nouvelles images des monstres

Les 29 images restantes du bestiaire passent au style réaliste de la Crypte et de la Forêt (ateliers `atelier/bestiaire-desert.html`, `bestiaire-ruines.html`, `bestiaire-montagne.html`, `bestiaire-tour.html`). Tout le bestiaire est désormais dans le même style.

## Images
Mêmes chemins, fichiers remplacés :
- **Désert** : `images/Enemies/scarab.webp`, `scorpion.webp`, `sandworm.webp`, `sandwarrior.webp`, `elite_serment.webp`, `elite_dard.webp` ; `images/Boss/sphinx.webp`, `Lord_Djinn.webp` (Nezzam le Desséché).
- **Ruines** : `images/Enemies/skeleton.webp`, `ghoul.webp`, `gargoyle.webp`, `zombie.webp`, `batisseur.webp`, `elite_contremaitre.webp`, `elite_golem.webp` ; `images/Boss/Lord_Skelette.webp`, `maitre_oeuvre.webp`, `varrek.webp`, `gardien_du_plan.webp`.
- **Montagne** : `images/Enemies/lavagolem.webp`, `dragonling.webp`, `minordemon.webp`, `ifrit.webp` ; `images/Boss/Lord_Dragon.webp`.
- **Tour** : `images/Enemies/arcanegolem.webp`, `corruptmage.webp`, `hybrid.webp`, `guardian.webp` ; `images/Boss/Lord_Archimage.webp`.

Fichiers PNG de Seb convertis en webp qualité 90, à leur taille d'origine (1024 ou 1254 px) : 210 à 510 Ko chacun.

Changements de rendu voulus (prompts validés) : le Dragon ancien passe du bleu-violet à l'obsidienne et au rouge lave, et le Mage corrompu, sans capuche et en magenta, ne ressemble plus au Nécromancien.

## Code
- Aucun code de jeu modifié. Aucun fichier ajouté.

## Outils (hors jeu)
- `tools/audit/bestiaire-captures.js` : lots `desert`, `ruines`, `montagne`, `tour` ; vraies rencontres de quête, boss de quête (avec le compagnon exigé), décor du monde imposé pour les mondes sans quête.
- `tools/audit/bestiaire-atelier.py` : note par lot.

## Note
Comme pour la Crypte et la Forêt, les images vivent dans le cache durable du service worker : chez un joueur qui avait déjà l'ancienne image, la nouvelle s'affiche à la deuxième ouverture.

## Contrôles
- round-harness 4628 OK, 0 échec (deux passes) ; boot (4), création du héros (44), parcours (139) OK.
