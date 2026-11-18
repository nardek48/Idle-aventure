# MISSION — AUDIT DE SORTIE DE L'ALPHA D'AETHERVALE

## 1. Objectif

Dire précisément ce qui sépare l'Alpha actuelle d'une Alpha qu'on peut envoyer aux testeurs : jouable du début à la fin, assez stable, compréhensible sans aide, avec un moyen de faire remonter les retours.

C'est un audit d'**Alpha**, pas de Bêta ni de version finale. Un équilibrage imparfait, des images provisoires ou du polish manquant ne bloquent pas la sortie, tant que le jeu reste jouable et que les limites sont dites aux testeurs.

## 2. Ce qu'il faut lire avant de commencer

- `CLAUDE.md` à la racine du dépôt : conventions, fichiers protégés, outils, règles du jeu.
- Dépôt de conception `Idle-Aventure-Documentation` :
  - l'État des chantiers (le plus récent) : il fait foi sur l'état du code ;
  - le Suivi d'audit (`Aethervale_Suivi_Audit_2026-11-04.md`) : il dit où en est chaque constat ;
  - les audits précédents (`Aethervale_Audit_*.md`) : ils donnent le format et les identifiants.
- L'audit de l'Alpha du 13/11 et ses suites (v3.799.0 à v3.812.0), dans l'État des chantiers et `docs/changelog/`.

Règles qui en découlent :
- une décision close ne se rouvre pas ;
- un constat déjà corrigé, ou fermé par décision, n'est pas remonté comme nouveau. S'il est revenu, on le signale comme régression, avec la preuve.

## 3. Périmètre

L'audit porte sur la **branche `alpha`**, publiée sous `/alpha/` par `.github/workflows/pages.yml`. Il ne porte pas sur `main` ni sur les mondes après le Désert.

Ce que contient l'Alpha (à confirmer dans le code, et signaler tout écart) :
- la Forêt et le Désert ;
- l'Histoire arrêtée après `desert_18` ;
- un journal de test, une fenêtre de premier lancement, un questionnaire d'avis et l'envoi du journal ;
- des sauvegardes et des caches séparés de ceux du jeu principal (préfixe `alpha:`) ;
- le français, l'anglais en option ;
- le mobile (320 à 430 px) et le mode PC.

Ne s'applique pas à ce jeu, et se signale en une ligne seulement : compilation, serveur, base de données, multijoueur, comptes, collecte de crashs, rendu 3D, sons.

## 4. Méthode

- Travailler par **lots**, en tenant un **registre de couverture**. La liste des systèmes est celle des scripts chargés par `game/index.html`, regroupés par domaine : combat, Histoire et quêtes, Petites Aventures, village et production, Camp, équipement et Forge, compagnons, tutoriels, sauvegarde, édition Alpha, interface. Chaque domaine finit marqué « inspecté » ou « non vérifiable », avec la raison.
- Une fonctionnalité n'est pas « faite » parce que son code existe : il faut la voir marcher en jeu, ou dans un test.
- Chaque constat porte sa **source** : confirmé par un test, confirmé par le code, risque possible, ou non vérifiable.
- Aucun résultat de test inventé. Un outil qui échoue, on le dit, avec sa sortie.

### Outils du dépôt à lancer et à citer

Depuis la racine du dépôt :
- `node tools/harness/round-harness.js`, deux passes ;
- `node tools/harness/boot-harness.js` et `node tools/harness/hero-creation-harness.js` ;
- `node tools/harness/parcours-harness.js .`, le parcours joueur à taille iPhone ;
- `node tools/sim/campagne-lot.js . --combats --joueur --n 2 --jusqua ruines_01`, le robot sur toute l'Alpha. Attention : son attente de production est gonflée par un palier de 10 min, donc ce n'est pas un temps de joueur ;
- `node tools/audit/i18n-audit.js .` et `node tools/audit/missing-icons.js`.

On peut aussi piloter Chromium headless avec Playwright, comme le fait `parcours-harness.js`, pour jouer de vrais écrans. Tester **la copie publiée** (`tools/publication`, JS sans commentaires) et pas seulement les sources.

### Limites de l'environnement, à mettre dans la checklist pour Seb

Seul Chromium headless est disponible. Ne se vérifient pas ici :
- Safari iOS sur un vrai appareil, Android ;
- l'installation de la PWA ;
- le geste retour d'iOS et le bouton Retour d'Android ;
- `pagehide` ;
- VoiceOver et TalkBack.

## 5. Ce qu'il faut auditer

1. **Premier contact.** Les 30 premières minutes d'un nouveau joueur, à 320 et 390 px, puis en mode PC : écran titre, création du héros, prologue, premier combat, tutoriels sur l'écran, premier passage au village. Est-ce qu'on comprend sans aide ? Est-ce qu'une fenêtre masque un bouton nécessaire ?
2. **Parcours complet.** De `forest_01` à `desert_18` pour les trois classes : aucune étape infranchissable, aucun verrou de progression, la fin de l'Alpha qui s'affiche correctement, et ce qui reste à faire après.
3. **Fonctionnalités de l'Alpha.** Une matrice : chaque système avec son état réel. Les états possibles :
   - fonctionnel et testé ;
   - fonctionnel mais non testé ;
   - partiel ;
   - inaccessible ;
   - provisoire ;
   - défectueux ;
   - hors Alpha (visible ou non par le joueur).
4. **Stabilité technique.** Erreurs dans la console, exceptions, références cassées, états d'initialisation, minuteries et onglets. Le rendu doit séparer « à corriger avant la sortie » et « plus tard ». Pas de refonte sans raison concrète.
5. **Sauvegardes.** Création, rechargement, retour après une absence (calcul hors ligne), sauvegarde invalide ou corrompue, remise à zéro. Une sauvegarde `alpha:` doit survivre à une nouvelle publication de l'Alpha. Que voit un testeur en pleine partie au moment d'une mise à jour (service worker, `CACHE_VERSION`) ? Faudra-t-il demander aux testeurs de recommencer ?
6. **Publication.** Le workflow publie bien la branche `alpha`, harnais compris. Le service worker se met à jour d'une version à l'autre. Le jeu marche hors ligne. Le numéro de version est visible. Aucun fichier de `tools/` ni de développement n'est exposé.
7. **Retour des testeurs.**
   - Comment un testeur envoie-t-il son journal et son avis ? Vérifier s'il peut le faire **avant** `desert_18` : abandon en route, bug bloquant.
   - Que se passe-t-il sans menu de partage (PC, navigateur sans `navigator.share`) ?
   - Le journal contient-il ce qu'il faut pour comprendre un bug ?
8. **Données personnelles.** Le public a 12 ans et plus. Qu'envoie le journal exactement (nom du héros, appareil, contenus libres) ? Faut-il une information ou un consentement avant l'envoi ? Aucun secret ni clé dans `game/`.
9. **Interface.** Lisibilité à 320 px, contrastes, zones de toucher, mode PC, cohérence entre écrans, messages quand une action est refusée. Les mesures se font au pixel, avec Playwright, jamais à l'œil.
10. **Performances.** Temps de chargement, poids de la copie publiée, script par seconde sur un écran au repos, longue session (une heure en accéléré, avec le retour hors ligne). Seulement ce qui peut rendre l'Alpha injouable.
11. **Contenu et licences.**
    - Icônes absentes : chemin gardé, icône générique affichée.
    - Images en double ou sans rapport : à signaler sans corriger.
    - Textes non traduits, contenus des mondes suivants visibles par erreur.
    - Licences : polices OFL, images générées par IA (droits, mention), aucun asset emprunté.
12. **Gameplay.** Courbe de difficulté de la Forêt et du Désert, morts au robot, attentes, récompenses, blocages possibles, exploits qui casseraient la progression. Les réglages des v3.810.0 à v3.812.0 sont récents : les juger avec les mesures, pas les rouvrir.

## 6. Classement des problèmes

- **P0, bloquant.** Le jeu ne démarre pas, une perte de sauvegarde, une étape de l'Histoire infranchissable, le journal qu'on ne peut pas envoyer du tout.
- **P1, avant la sortie.** Une fonctionnalité de l'Alpha cassée, un tutoriel qui masque un bouton nécessaire, une erreur de console qui revient, une fenêtre qui bloque, des données personnelles envoyées sans en informer le joueur.
- **P2, accepté si documenté.** Un défaut visible qui ne bloque pas, comme une barre rognée ou un texte non traduit dans un écran secondaire.
- **P3, pendant l'Alpha.** Défaut mineur.
- **P4, après l'Alpha.** Polish, optimisation, idée.

Pour chaque problème :
- un identifiant au format des audits précédents (domaine et numéro, par exemple `ALPHA-SAVE-3`) ;
- un titre, une priorité, le système concerné ;
- le fichier et la ligne ;
- les preuves, et les étapes de reproduction ;
- le résultat attendu et le résultat observé ;
- la cause probable, l'impact sur le joueur ;
- la solution recommandée, sa complexité, le niveau de confiance ;
- si elle touche un **fichier protégé** (liste dans `CLAUDE.md`).

## 7. Notes

Une note sur 10 par domaine, comme les audits précédents, pour pouvoir comparer :
- gameplay ;
- fonctionnalités de l'Alpha ;
- stabilité ;
- interface ;
- sauvegardes ;
- performances ;
- contenu ;
- tests ;
- publication ;
- retour des testeurs.

Chaque note est justifiée par des preuves. Pas de note pour ce qui n'a pas pu être vérifié. Une bonne note globale ne cache jamais un P0 ni un P1.

## 8. Livrables

Trois fichiers, dans le dépôt de conception (`Idle-Aventure-Documentation`, à la racine), en français :

1. `Aethervale_Audit_Alpha_AAAA-MM-JJ_vXXXX.md`. Le rapport, qui contient :
   - le registre de couverture ;
   - la matrice des fonctionnalités ;
   - les résultats des outils (commande, chiffres, échecs) ;
   - les notes ;
   - la checklist des vérifications sur appareil pour Seb ;
   - le verdict.
2. `Aethervale_Audit_Alpha_Registre_AAAA-MM-JJ.md`. Tous les problèmes classés, puis le plan d'action en trois phases (avant la sortie, pendant l'Alpha, après), avec leurs dépendances et leurs critères d'acceptation, et le chemin le plus court vers la sortie.
3. `Aethervale_Alpha_Problemes_connus.md`. Le texte à donner aux testeurs : court, sans jargon, ce qu'ils risquent de voir et comment le signaler.

## 9. Verdict

Finir par l'un des trois :
- **GO ALPHA** ;
- **GO CONDITIONNEL** : avec la liste exacte des conditions ;
- **NO-GO** : avec ce qui bloque.

Préciser aussi :
- le nombre de problèmes par priorité ;
- le travail restant avant la sortie et ce qui peut attendre ;
- les vérifications sur appareil qui restent à faire par Seb.

## Règles

- Ne modifier aucun fichier du jeu (`game/`), ne rien corriger, ne rien supprimer, ne rien pousser sur `main` ni sur `alpha`.
- Permis : écrire les trois rapports ; écrire un outil de mesure dans `tools/` si un relevé l'exige, en le signalant.
- Ne pas imposer les exigences d'une Bêta. Ne pas bloquer la sortie pour du polish.
- L'audit n'est terminé que lorsque chaque domaine du registre de couverture est marqué « inspecté » ou « non vérifiable ».
- Commencer par le périmètre et le registre de couverture, puis inspecter les domaines un par un.
