# Aethervale v3.456.3 — Crypte : la quête d'élite du Porte-couronne

Décision de Seb du 19/10/2026 (option A) : le palier Épique de l'étape 13 reçoit une source sûre de plus, par une quête d'élite.

## Ce qui change
- **Nouvelle quête d'élite, « La couronne de trop »**, ouverte à l'étape 12 : 3 rencontres dans l'Ossuaire, puis le Porte-couronne.
  - Son butin est **La seconde couronne**, un casque Épique unique : dégâts critiques, +6 % de PV max. C'est la couronne qui n'était pas à lui.
  - Comme tout objet unique, elle entre dans le sac même s'il est plein.
- Le tutoriel du palier Épique et « Ce qui manque » la citent.

## Réglage au banc
Mesuré avec `crypte-acte3-bench.js --quete aq_crypte_couronne --profil rare` (profil d'entrée de l'étape 12, entraînement +140), 12 runs. Les colonnes donnent le taux de réussite Chevalier / Rôdeur / Mage.

| Réglage (rencontres PV / puissance, Porte-couronne puissance / endurance) | Réussite |
|---|---|
| ×2,0 / ×5,0, p2,8 e2,6 | 0 / 8 / 25 % |
| ×1,6 / ×4,0, p1,9 e1,7 | 92 / 100 / 92 % |
| ×1,8 / ×4,5, p2,3 e2,1 | 50 / 58 / 58 % |
| **Retenu : ×1,7 / ×4,2, p2,1 e1,9** | **non mesuré, autour de 75 % attendu (milieu des deux derniers)** |

## À signaler
- **Bug, toujours ouvert** : quand le sac est plein, la pièce Épique des étapes 11 et 12 est offerte d'office, donc perdue. La correction touche `story-quest-system.js` (système de quêtes, fichier protégé) et attend l'accord de Seb. En attendant, La seconde couronne compense une pièce perdue.
- **Forge 5** : ses 100 aciers (1 500 fers) prennent environ 100 h de production dans une partie au robot sans combats, contre 4 à 5 h avec combats, où le stock est déjà là. À surveiller en jeu.

## Code
- Fichiers modifiés :
  - `elites.js` : `ELITE_UNIQUE_LOOT.porte_couronne` ;
  - `adventure-quests.js` : `aq_crypte_couronne` ;
  - `story-quests.js` : textes du palier ;
  - `en.js`.
- Harnais : section [246].
- Outils : le robot joue la quête au palier ; le banc accepte `--profil` pour les quêtes ; traces de palier avec `TRACE_EPIC`.

Aucun fichier protégé n'a été touché et aucun fichier n'a été ajouté.
