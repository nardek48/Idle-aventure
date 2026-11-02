# v3.619.0 — Habillage des cartes, lot 3 : documents

Atelier « Cartes E » (Seb, 02/11) : les documents de l'histoire passent en parchemin déchiré.

## Changements
- `css/00-cartes.css` : documents `story-chain`, `story-step`, `story-prologue-card`, `camp-missions-card`, carte Missions du Camp en PC (`cw-card` qui contient `cw-mlist`), `ms-block`, `qb-card`, `tavern-board`, `chr-obj` (objectif de la Chronique, PC) :
  - texture partout ;
  - découpe et bord déchirés quand le document n'est pas rangé dans un document ou une carte encadrée (une étape dans la chaîne de quêtes garde la texture seule) ;
  - marge intérieure minimale (14 px, et 19 px sur les côtés) : l'en-tête de la Taverne n'est plus rogné ;
  - chaîne de quêtes terminée (50 px) : bord plus fin.
- Une carte d'interface rangée dans un document ne reçoit pas de second cadre.
- Encres foncées de la v3.618.1 étendues aux documents.
- `tools/harness/parcours-harness.js` (P14) : les documents sont contrôlés aussi (texture, et bord déchiré hors imbrication).
- Quoi de neuf : une ligne (FR + EN).

## Note
- La Chronique (PC) est un panneau sombre à texte crème ; seul son objectif (carte crème) devient un parchemin. Passer tout le panneau en parchemin demanderait d'en inverser les encres : à décider.

## Contrôles
- Documents découpés relevés dans Chromium : téléphone (prologue, chaînes, bloc des missions secondaires et ses cartes, tableau des missions, Taverne) et PC (étape en cours, objectif de la Chronique, carte Missions, Taverne).
- Harnais, parcours P1–P14, boot, création du héros, i18n.
