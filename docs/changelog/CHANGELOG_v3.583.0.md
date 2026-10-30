# v3.583.0 — Bandeaux illustrés des pages du menu

Suite de la v3.581.0, accord de Seb du 30/10.

## Ce qui change
- La Bibliothèque, le Journal et les Hauts faits ouvrent à leur tour sur une illustration en bandeau, avec le même comportement que les écrans principaux : 150 px sur téléphone, image entière en grand écran, repli au défilement.
  - Bibliothèque : « La bibliothèque », *Bêtes et savoirs du voyage*.
  - Journal : « Le journal », *La chronique du voyage*.
  - Hauts faits : « Les hauts faits », *Le mur des trophées*.
- Une image par page, qui ne change pas avec le monde.
- Le mur des trophées montre des trophées de monstres que le joueur n'a pas encore vus en début de partie : jugé acceptable par Seb pour une page de trophées.

## Fichiers
- **Nouvelles images** (3) : `images/Banners/bibliotheque.webp`, `journal.webp`, `hauts_faits.webp` (2172 × 724, WebP qualité 78, 499 Ko au total).
- `js/ui/screen-banner.js` : les 3 bandeaux. `achievement-view.js`, `bestiary-view.js`, `log-view.js` : une ligne chacun. `js/lang/en.js` : 6 textes. Aucun nouveau fichier de code.

## Contrôles
`round-harness` 5 584 OK, 0 échec (deux passes), avec un contrôle nouveau [387] (images présentes, pages qui déclarent leur bandeau). Audit i18n : 100 %, 0 appel non littéral. Mesures au pixel sous Chromium (iPhone 390 × 844 et Mac 1440 × 900) : bandeau à 340 × 150 et 966 × 322 sur les 3 pages, bonne image, aucune erreur.
