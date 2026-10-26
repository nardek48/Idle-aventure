# v3.492.14 — Préparation : tout ce que les ennemis font est annoncé (décision 1)

Seb a contrôlé les combats et relevé deux choses : des télégraphes manquent avant le combat (le soin, le bouclier), et le dernier donjon n'annonce presque rien. Il a validé la décision 1, qui ne fait qu'annoncer juste. Aucun équilibrage ne change. Aucun fichier JS ou CSS n'est ajouté au jeu. Un outil est ajouté : `tools/audit/telegraphes-audit.js`.

## Le constat (audit sur le vrai moteur, 58 sorties)
« Ce que tu vas affronter » ne connaissait que 6 traits (Bouclier, Silence, Blindé, Enragé, Vampirique, Corrupteur), et seulement s'ils étaient des traits fixes d'un ennemi. Le moteur fait pourtant plus que ça : tout boss se soigne et se protège, et toute élite se protège et s'exalte.
- 22 sorties sur 58 n'annonçaient rien, dont les 8 quêtes de la Montagne.
- Dans la Gueule du volcan, seuls Blindé et Enragé étaient annoncés.
- Bug : l'Acide mordant tient tous les boucliers, mais la feuille l'étiquetait « Aucun Bouclier connu dans cette sortie » face à un boss ou une élite.

## Ce qui change
La préparation annonce maintenant, pour chaque créature déjà vaincue :
- **Boss** : Soin et Bouclier, en plus de leur trait. Varrek : Se relève.
- **Élites** : Bouclier et Exaltation, en plus de leur trait, puis Tri, Carapace ou Brûlure selon l'élite.
- **Créatures** : Tri (Démon mineur), Se relève (Squelette, Zombie), Appel (Nécromancien).
- **Quêtes** : Dormeurs (morts qui dorment) et Chaînes (« Les maillons »).
- **En donjon** : les vagues ne se relèvent pas et n'appellent pas (`dungeon-system.js`). Elles trient seulement dans la Gueule, la seule à avoir des veines. La feuille suit ces règles.
- **Sans règle du Grimoire** (Tri, Carapace, Brûlure) : la ligne dit « Ni règle ni objet n'y répond : à toi de le gérer en combat. », sans bouton « Règle › » vers une règle qui n'existe pas.

**Inchangé (décision v3.378.0)** :
- Les changements de phase des boss restent une surprise : renforts, chaleur, plongée, trait qui change en cours de combat.
- Les traits tirés au hasard ne sont pas annoncés.
- Une créature jamais vaincue ne montre rien.

| Gueule du volcan | Avant | Après |
| --- | --- | --- |
| Annoncé | Blindé, Enragé | Soin, Bouclier, Exaltation, Blindé, Enragé, Tri, Carapace, Brûlure |
| Surprise de phase (voulu) | — | Chaleur, Plongée (Wyrm) |

L'audit trouve désormais **58 sorties sur 58** où tout ce que font les créatures est annoncé, hors surprises de phase.

## Fichiers touchés
- `ui/combat-forecast-view.js` :
  - `ENEMY_TRAIT_DEFS` passe de 6 à 18 entrées ;
  - `enemyTraitLook` lit le nom et l'icône dans les deux registres d'états ;
  - `etDescribe` renvoie tous les traits d'une créature ; `etQuestTraits` lit les mécaniques propres à la quête ;
  - donjon : le Démon mineur de la Gueule est compté.
- `ui/sortie-prep-view.js` : nom et icône par `enemyTraitLook`, et le cas « sans règle ».
- `lang/en.js` : 10 textes.

## Harnais
- [154] : la quête du Trône annonce le Soin et le Bouclier de Nezzam, et la phase de silence reste cachée. Le Sanctuaire affiche 7 traits (avant : 4).
- Nouvelle section [318] : 8 contrôles (Gueule, Dragon ancien, Appel du Nécromancien, Acide mordant, phases gardées secrètes, créatures jamais vaincues).

## Contrôles
- `node --check` sur les JS modifiés.
- **Harnais** :
  - round-harness : 5064 OK, 0 échec, sur 2 passes ;
  - boot : 4 OK ;
  - création du héros : 44 OK ;
  - parcours : 139 OK.
- **i18n** : 6414 textes, 100 %, 0 orphelin.
- **Chromium** à 390 et 320 px, sans erreur de console : la préparation de la Gueule du volcan.
