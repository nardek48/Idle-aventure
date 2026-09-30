# Aethervale v3.402.0 — Lot B-1 : boutons et titres de section

Choix de Seb dans l'atelier des boutons : **H2 · bleu + filaire**, achat **P2 · pièce d'or**, danger **D1** (inchangé), titre **T1 · centré à filets**.

## Hiérarchie des boutons (css/00-kbtn.css)
- **Principal** : le bouton bleu serti (`.kbtn.primary`, `.settings-btn.primary`), un seul par carte.
- **Secondaire** : filaire bronze sur le parchemin. Règle générale : dans une page (`.kframe`), une feuille (`.ksheet`, `.full-menu`) ou une fenêtre (`.kwin`), tout `.kbtn` / `.settings-btn` qui n'est ni `.primary` ni `.danger` est secondaire. Hors de ces conteneurs (combat, Petites Aventures : la nuit), rien ne change. Classe `.is-sec` pour forcer ailleurs.
  - Exemples : Paramètres (« Sauvegarder » reste le principal, Journal / Exporter / Importer passent en filaire), Mes héros / Compagnons, Renouveler la boutique, Annuler, Plus tard, Continuer de l'écran de retour, Trier / Autovente, Offrir / Vendre / Déséquiper un objet, Réinitialiser les talents.
- **Discret** : `.klink` (lien souligné bronze), prêt pour les prochains écrans.
- **Danger** : inchangé (bleu, texte rouge).
- « Tout réclamer » des Hauts faits : ce n'est plus l'orange plat, mais le bouton principal du kit.

## Achat : la pièce d'or (`.kbuy`)
Tout bouton qui affiche un prix : Stats (Résumé › Stats), Boutique d'équipement, Potions, Économie, Boutique d'éclats (Enchanteresse). Grisé quand le prix n'est pas payable (plus de « or manquant » écrit en toutes lettres : la pastille grisée dit la même chose).
La quantité d'achat (×1 / ×10 / ×25 / MAX) passe sur le rail du kit (`.kseg`), comme les autres sélecteurs.

## Titres de section (css/00-components.css)
- **`.ksec`** : texte centré entre deux filets d'or, icône facultative, note en `<small>`. Couleurs écrites en dur : dans le cadre, l'encre du jeu vaut crème (fond de pierre) et rendait « En combat », « Dans le sac », « Sac (4/25) » presque illisibles sur le parchemin.
  - Camp (Santé du héros, Rations, Les braises), Résumé (En combat, Aller plus loin, Ce que tu portes, Kit du…), Grimoire (Emplacements à venir), Talents (Tronc, Voies), Équipement (Dans le sac), Inventaire (Sac 4 / 25).
- **Surtitre dans une carte** (petites capitales bronze) : Paliers des Hauts faits, Comportement (Compagnons), Marques (Donjon), Actuellement équipé, Patrouille, groupes des États du combat.

## Nettoyage
CSS retiré : fond crème des prix des Stats, barre ×1…MAX (3 définitions), ancien orange de « Tout réclamer », gris de « Réinitialiser », styles propres des titres remplacés. Traductions : « Monde {n} » ajouté, « or · x{n} » et « or manquant » retirés.

## Vérifications
round-harness 3611 OK, 0 échec (x2), nouvelle section [175] · boot 4 · création 44 · parcours 139 · campagne 38/38 · i18n 3698, 100 %, 0 orphelin. Aucun fichier protégé modifié. Aucun nouveau fichier de jeu.
