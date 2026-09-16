# Aethervale — v3.265.0

**16/09/2026 — Retours de Seb après une partie recommencée depuis le début.**
Base : v3.264.0. ZIP delta.

## Contenu

### Avertissement « il faut te soigner »

Si les PV sont **sous 60 %** au moment de partir en mission de combat (quête d'aventure ou chasse), l'écran de pronostic s'ouvre, **même si le combat est abordable**.

- En tête de l'écran : « Attention, il faut te soigner. Tu pars à 45 % de tes PV : mange une ration au Campement ou laisse le feu te remettre sur pied. »
- Deux boutons :
  - « Me soigner », qui ferme l'écran et ramène au Campement ;
  - « Partir quand même ».
- À 60 % pile, aucun avertissement : le seuil est strict.
- Réglage : `FORECAST_LOW_HP_PCT` dans `ui/combat-forecast-view.js`.
- Le verdict tient déjà compte des PV courants : à 45 %, le même combat peut passer de « Abordable » à « Hors de portée ».

### Bâtiments manquants au tableau de bord Production

Une fois « La veine instable » réclamée, c'est-à-dire quand l'Histoire a fini ses déblocages (Puits, Chasse, Carrière), les bâtiments encore verrouillés s'affichent en fin de grille :

| Bâtiment | Ressource | Quête qui le débloque |
|---|---|---|
| Scierie | bois | Le Bosquet Silencieux |
| Champs | blé | La Terre en Friche |
| Mine | fer | L'Éboulis Ferreux |

- Chaque carte a un bord pointillé, une icône grisée, un badge « À débloquer », le nom de la quête et son état (à voir / acceptée / en cours).
- Toucher la carte ouvre Quêtes › Secondaires. L'écran défile jusqu'à la quête, qui est encadrée d'or.
- La quête de chaque bâtiment est retrouvée dans les données (`SCENE_TEMPLATES[…].unlockOnSuccess`), pas dans une table écrite à la main.
- Avant la fin de « La veine instable », ces bâtiments restent invisibles, comme depuis la v3.92.0.

### Test instable réparé

Le test « run terminé soit par évacuation soit par fin de carte » échouait environ une fois sur dix.

- Cause mesurée : sur 400 runs répliqués, 5 se terminaient par épuisement du Souffle (v3.199.0), une troisième fin légitime que l'assertion ignorait.
- Correctif : l'assertion accepte maintenant cette fin.

## Vérifications

Chromium 390×844 : écran d'avertissement, tableau de bord Production, arrivée sur la quête. Aucune erreur de page.

Un défaut de contraste a été trouvé et corrigé en capture : dans ce cadre, `--nb-ink` est redéfini en crème. Les textes de la carte verrouillée utilisent donc des couleurs en dur, comme le reste de la carte.

## Fichiers

- `js/ui/combat-forecast-view.js`, `css/04-panel-forecast.css`
- `js/ui/production-view.js`, `css/04-panel-production.css`
- `js/ui/quests-view.js`, `css/04-panel-quests.css`
- `sw.js`, `js/core/constants.js`
- `round-harness.js` :
  - nouveau bloc **[67]**, 15 assertions ;
  - [S1] réparé.

  Résultat : 2175–2177 OK, 0 échec, sur onze passages. `hero-creation-harness.js` : 44 OK.

Aucun fichier protégé touché.
