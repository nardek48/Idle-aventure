# v3.748.0 — Rafale : plus de double mort sur les élites de carte (journal de Seb, 09/11)

Constat : dans les journaux de Seb (Forêt, Montagne), l'Arbre-mère, la Mère des dragonnets et le Vieux Golem étaient notés deux fois vaincus, à 5 ms d'écart. Reproduit dans le vrai moteur : sur une carte, l'élite morte reste l'ennemi en jeu, et les coups suivants d'une technique à plusieurs coups (Rafale du Rôdeur, 3 coups) la frappaient encore. `killEnemy` repartait : or, victoires et talents comptés deux fois. Donjons, quêtes et aventures n'étaient pas touchés (l'ennemi suivant apparaît aussitôt). La récompense de carte (Sève, secteur) n'était pas doublée.

- `js/systems/combat-engine.js` (fichier protégé, accord de Seb le 09/11, option B) : `dealDamage` ne fait plus rien sur un ennemi déjà à 0 PV. Une ligne.
- `tools/harness/round-harness.js` : section [501] (Rafale sur l'Arbre-mère : une mort, l'or une fois ; dealDamage sur un ennemi mort sans effet).
- Quoi de neuf : une ligne (FR + EN).

Contrôles : round-harness 7 195 OK, 0 échec (×2) ; boot 4 OK ; création du héros 44 OK ; i18n 8 893 textes, 100 % ; parcours 235 OK.
