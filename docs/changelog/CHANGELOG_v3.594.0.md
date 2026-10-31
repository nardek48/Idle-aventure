# v3.594.0 — Camp : l'onglet « Le feu », et la carte du monde plus présente

Décisions de Seb du 31/10, après l'atelier `atelier/camp-carte.html` : le nouvel onglet « Le feu » (proposition 1) et l'option M3 pour la carte (bouton en bas et accès depuis le Camp).

## Le Camp (téléphone)
- Nouvel onglet **Le feu**, en premier : Le feu · Missions · Expéditions · Grimoire. Il regroupe ce qui était en tête de page : les PV et la régénération, les compagnons au camp, les rations.
- Missions et Expéditions commencent donc juste sous le bandeau.
- Pastille **« ! »** sur « Le feu » quand l'équipe n'est pas au maximum de ses PV.
- En tête du feu, **« Tu es ici : <monde> »** avec l'avancée de la carte vivante et un bouton « Carte › » (dès que la carte est débloquée).
- La page s'ouvre toujours sur le dernier onglet utilisé (Missions par défaut).
- À venir dans « Le feu » : la phrase du soir et les compagnons au coin du feu (C1 et C2), après validation des textes.

## La carte du monde
- **Barre du bas** : « Carte » apparaît sur téléphone, entre Quêtes et Village (six cases : 54 px chacune à 390 px de large, 45 px à 320 px). Fermée tant que la carte n'est pas débloquée, comme les autres.
- **Bandeau du Camp** : il porte « Carte du monde › » et ouvre la carte au toucher (téléphone et PC). La pastille s'efface quand le bandeau se replie.
- PC : le rail de gauche garde la Carte, désormais en troisième position (même ordre que la barre du téléphone). La disposition du Camp en grand écran ne change pas.

## Code
- `index.html` : bouton Carte de la barre du bas, visible sur téléphone.
- `js/ui/camp-view.js` : onglet `feu`, `campHereCardHTML`, pastille.
- `js/ui/screen-banner.js` : le bandeau du Camp ouvre la carte.
- `css/04-panel-camp.css`, `css/00-kbtn.css` : « Tu es ici » et la pastille du bandeau.
- `js/lang/en.js` : textes anglais.
- Aucun fichier ajouté, aucun fichier protégé, aucun nouvel état.

## Contrôles
`round-harness` 5 607 OK, 0 échec (deux passes ; nouvelle section [392], contrôles du Camp adaptés à l'onglet « Le feu ») ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` 142 OK ; audit i18n 100 %, 0 orphelin. Écrans vérifiés sous Chromium à 390 × 844, 320 × 640 et 1440 × 900.
