# v3.598.0 — Quêtes des compagnons et reliques uniques : le moteur

Chantier « parler avec les compagnons ». Seb a validé le 31/10 : 14 quêtes personnelles (3 par compagnon, 2 pour Sarkel) et le tableau des 14 reliques uniques. Cette version pose la mécanique : **aucune quête n'est encore livrée**. Les déroulés sont dans l'atelier des textes ; chaque quête s'ajoute dans `js/data/companion-quests.js` une fois validée, et sa conversation la débloque (`unlocks: { quest }`).

## Les quêtes
- Une conversation finie débloque la quête : elle apparaît dans **Quêtes › Secondaires**, sous les jalons, avec le portrait du compagnon. Sur grand écran, une ligne par quête dans la liste de gauche, la carte à droite.
- Quatre types d'étape :
  - **livrer** des ressources de l'Entrepôt (bouton « Donner ») ;
  - **réussir une Petite Aventure** ou un parcours dans un monde ;
  - **vaincre une élite** de la carte vivante d'un monde ;
  - **une scène**, dans la mise en scène des conversations (bouton « Écouter »).
- Les Petites Aventures et les élites ne comptent que si le compagnon est dans l'équipe ; la carte le rappelle.
- Pastille de « Secondaires » quand une étape se fait tout de suite (livraison possible ou scène).
- La dernière étape donne la relique unique (une seule fois).

## Les reliques uniques
- 14 reliques dans `js/data/companions.js` (`COMPANION_RELIC_UNIQUES`) : nom propre, deux effets à valeur fixe (sans rang), couleur légendaire.
- Réservées à leur compagnon : la feuille d'un autre compagnon ne les propose pas, et l'équipement est refusé.
- Elles comptent comme une famille à part : elles se portent à côté d'un Croc ou d'une Écorce.
- Les reliques ordinaires ne changent pas. Leur texte d'effet se compose désormais effet par effet.
- Icônes : `images/Icons/companions/relics/relic_<clé>.webp`, à générer (prompts dans l'atelier des images). L'icône générique s'affiche en attendant.

## Fichiers
- **Fichiers ajoutés** (dans `index.html` et le précache de `sw.js`) :
  - `js/data/companion-quests.js` : les quêtes (vide pour l'instant) ;
  - `js/systems/companion-quest-system.js` : `CompanionQuestManager` ;
  - `js/ui/companion-quest-view.js` : les cartes de Secondaires.
- `js/systems/companion-system.js` : `quests` sauvegardé et relu avec chaque compagnon (`cleanQuests`). Pas de fichier protégé touché : l'état des compagnons est déjà câblé aux quatre points de la sauvegarde.
- `js/systems/companion-relic-system.js` : reliques uniques (`fam`, `isUnique`, `ownerOf`, `grantUnique`).
- `js/systems/companion-talk-system.js` : une conversation finie débloque sa quête. `js/ui/companion-talk-view.js` : la scène sert aussi aux étapes de quête.
- Comptage : `js/systems/pa2-run.js` (fin de Petite Aventure ou de parcours) et `js/systems/living-map-system.js` (élite vaincue).
- `js/ui/quests-view.js`, `js/ui/companions-view.js`, `css/04-panel-quests.css`, `js/lang/en.js`, `js/lang/data-fields.js`.
- Pas de ligne « Quoi de neuf » : rien de visible pour le joueur tant qu'aucune quête n'est livrée.

## Contrôles
- `round-harness` : 5 647 OK, 0 échec, sur deux passes. Nouvelle section [395], avec une quête de test complète.
- `boot-harness` : 4 OK. `hero-creation-harness` : 44 OK. `parcours-harness` : 142 OK.
- Audit i18n : 100 %, 0 orphelin.
- Cartes vérifiées sous Chromium à 390 × 844 et 1440 × 900.
