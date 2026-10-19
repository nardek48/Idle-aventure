# Aethervale v3.456.2 — Crypte, lot C-6 : premiers réglages de campagne

Décisions de Seb du 19/10/2026, prises après deux lots de campagne au robot : 2 parties par classe, avec les vrais combats.

## Ce qui change
- **Ysolt recouchée, la place est reprise.** Quand on choisit « La laisser se recoucher », la place libre dans le groupe est reprise par le premier compagnon disponible, avec une ligne au journal. Avant, le joueur continuait avec un seul compagnon sans forcément le voir.
  - C'était la cause des murs du robot face à la Liche (96 % de morts) et au Nécromancien suprême (92 %).
  - Avec un groupe complet, ces taux tombent à 50 % et 33 %, sans plus aucun mur.
- **Le Terrain d'entraînement monte dans la Crypte.** Il passe au niveau 12 (+140) à l'étape 6 et au niveau 13 (+150) à l'étape 11. Le plafond de la Crypte passe de 11 à 13.
  - C'est le profil sur lequel la Pleureuse, la Liche et le boss ont été réglés au banc. Ces crans étaient prévus depuis le lot C-0, mais n'avaient jamais été posés.
  - Au robot, le Porte-couronne passe de 68 % de morts à 6 %.
- **Le Nécromancien suprême est remonté d'un cran**, sa puissance passant de ×0,8 à ×0,85.
  - Avec le Terrain 13, la campagne ne mourait plus du tout contre lui à ×0,8.
  - Au banc, avec un héros entraîné à +150 : à ×0,9, la réussite est de 58 / 67 / 83 % (Chevalier / Rôdeur / Mage). ×0,85 tient entre les deux.
- **La descente (étape 1) est adoucie** : son combat passe de ×2,7 à ×2,4. À ×2,7, elle bloquait 2 à 3 parties sur 6 ; à ×2,4, le banc laissait 40 à 48 % des PV à la fin.

## Code
- `companion-system.js` : `fillParty`, appelé par le choix « ysolt » (`story-quests.js`).
- `world-caps.js` : Terrain 13 dans la Crypte, crans aux étapes 6 et 11.
- `scene-templates.js` : la descente.
- `adventure-quests.js` : le boss.
- `en.js` : 1 texte.
- Harnais : section [245].
- Outils : le robot de campagne joue la Crypte jusqu'à l'étape 20, remplace Ysolt dans le groupe et fabrique par lots ; `campagne-lot.js` accepte `--sortie`.

Aucun fichier protégé n'a été touché, et aucun fichier ajouté.

## Reste ouvert
Quand le sac est plein, la pièce Épique donnée par les étapes 11 et 12 est offerte d'office, donc perdue. Le palier Épique peut alors durer 100 à 200 h. Correctif et apport d'Épiques par les quêtes d'élite : décision de Seb à venir.
