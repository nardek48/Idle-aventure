# v3.599.0 — Les conversations et les quêtes des compagnons

Chantier « parler avec les compagnons ». Seb a demandé le 31/10 d'intégrer tout de suite les textes de l'atelier, avant relecture : on les corrigera après sa validation.

## Le contenu
- **27 conversations au feu** : Wenna 6, Maddoc 6, Edda 6, Ysolt 5, Sarkel 4. Elles parlent des compagnons, de l'histoire et du monde. Chacune propose un choix de réponse, qui est gardé.
- **14 quêtes personnelles** : 3 par compagnon, 2 pour Sarkel. Chacune est ouverte par une conversation et donne la relique unique de son compagnon.
- Les conversations s'ouvrent une à une, après une étape de l'Histoire **réclamée** (pas seulement atteinte). Les conversations 5 et 6 attendent en plus que la quête précédente du compagnon soit finie.
- **Ysolt** : sa quête 1 se joue avant le choix de l'étape 14 de la Crypte. Si elle se recouche, ses conversations et ses quêtes en cours disparaissent. Ses quêtes finies restent.

## Les quêtes
- Étapes : livrer des ressources, réussir des Petites Aventures d'un monde, vaincre une élite rejouable de sa carte, scènes. Les Petites Aventures et les élites comptent si le compagnon est dans l'équipe.
- Quantités à livrer : environ 10 % de l'Entrepôt du monde (150 Eau au Désert ; 300 Fer et 300 Pierre à la Montagne ; Pain, Bloc taillé, Cire de sépulcre pour quelques-unes). Repère pris sur le plafond de l'Entrepôt, sans passage au banc : à juger en jeu.
- Une scène de quête peut faire parler un autre compagnon (Edda dans « La trace du frère ») : le portrait du compagnon de la quête s'efface.

## À valider par Seb (textes intégrés tels que proposés)
- Le frère de Maddoc est vivant, tailleur dans la Montagne (« Le retrouver »). L'autre option : un nom de plus chez les morts.
- Inventions sur le monde : la Tour plus vieille que le royaume ; la lueur bleue restée dans les pierres des Ruines ; le Veilleur, ancien tailleur de la Montagne.

## Fichiers
- `js/data/companion-talks.js` et `js/data/companion-quests.js` : les données (textes avec `_t`).
- `js/systems/companion-talk-system.js` : `stepDone` (étape réclamée), `afterQuest`, compagnon parti.
- `js/systems/companion-quest-system.js` : compagnon parti.
- `js/ui/companion-talk-view.js` : nom de l'orateur quand un autre compagnon parle.
- `js/lang/en.js` : 357 textes traduits.
- `js/ui/news-view.js` : deux lignes « Quoi de neuf ».
- Aucun fichier ajouté. Aucun fichier protégé touché.

## Contrôles
- `round-harness` : 5 655 OK, 0 échec. Nouvelle section [396] : cohérence des 27 conversations et des 14 quêtes, puis un parcours réel de Maddoc jusqu'à sa quête.
- `boot-harness` : 4 OK. `hero-creation-harness` : 44 OK. `parcours-harness` : 142 OK.
- Audit i18n : 100 % (7 298 textes), 0 orphelin.
- Captures sous Chromium à 390 × 844 : cartes du feu, scène avec choix, scène de quête à deux orateurs.
