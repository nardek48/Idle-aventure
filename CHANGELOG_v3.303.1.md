# v3.303.1 — Mise à jour de l'application installée : précache tolérant

Bug remonté par Seb (18/09/2026) : l'application installée reste sur une ancienne version,
et Safari charge en boucle.

## Cause probable

À l'installation d'une nouvelle version, le service worker mettait en cache la liste de
fichiers de l'application en un seul appel (`cache.addAll`). **Un seul fichier absent du
serveur faisait échouer toute l'installation** : la nouvelle version ne s'installait jamais,
l'ancienne restait en place. Or trois deltas récents ont AJOUTÉ des fichiers — facile à
manquer quand on copie un delta en écrasant seulement les fichiers existants :

- `js/ui/debug-touch-view.js` (v3.295.0)
- `js/ui/tap-rescue.js` (v3.296.0)
- `js/systems/world-travel-system.js` (v3.298.0)

S'il en manque un en ligne, `index.html` demande un script introuvable et la mise à jour
échoue.

## Correctif — `sw.js`

Chaque fichier est mis en cache séparément. Un fichier absent est signalé en console
(« Précache : fichier ignoré ») et **ne bloque plus** la mise à jour.

## Livraison cumulée

Pour repartir d'un état sûr, ce lot est livré **en cumul depuis la v3.292.0**
(`Aethervale_v3_303_1_cumul_depuis_3292.zip`) : tous les fichiers modifiés ou ajoutés entre la
v3.292.0 et la v3.303.1, changelogs compris. Il suffit de le copier par-dessus une v3.292.0 ou
toute version postérieure.

Trois fichiers ne servent plus depuis la v3.299.0 et peuvent être supprimés (les laisser ne
casse rien) : `js/data/world-quests.js`, `js/systems/world-quest-system.js`,
`js/ui/cycle-summary-view.js`.

## Après la mise en ligne

1. Vérifier sur le serveur que les trois fichiers ci-dessus existent.
2. Ouvrir le jeu dans Safari, attendre le chargement complet, puis relancer l'application
   installée : elle doit afficher la bannière « Nouvelle version disponible — Recharger ».
3. Si elle reste bloquée : supprimer l'icône de l'écran d'accueil, vider les données du site
   dans Réglages › Safari › Avancé › Données de sites web (ta partie est dans le stockage local
   du site : **exporte-la d'abord** si tu as un export), puis la réinstaller.

## Fichiers

`sw.js`, `js/core/constants.js`.
