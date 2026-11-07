# v3.738.0 — Les objets de combat dans la préparation de sortie (07/11/2026)

Rappel de Seb (07/11) : « on peut crafter des contres dans les potions ». Lot validé après le diagnostic de la Silhouette (le Baume froid porte le Chevalier de 81 à 94 %). Aucun fichier protégé.

## Changé
- **« Ce que tu vas affronter »** : sous chaque trait qu'un objet de combat contre, « Ou emporte : {objet} (×n) » avec un bouton « Emporter » (place libre), ou « Tes places d'objet sont prises. », ou l'endroit où l'objet se prépare (Apothicaire, recette à commander, bâtiment à construire, monde qui l'ouvre). Un trait tenu par un objet emporté compte comme couvert et ne prend pas d'emplacement de règle. Acide et Pastille : « En plus : … il l'atténue » (sans compter comme couverture).
- **Sélecteur d'objets** : « Déjà contré par ta règle » remplacé par « Utile ici : {trait} » et la note neutre « Ta règle le contre aussi ».
- **« Tout préparer »** : les règles d'abord ; puis l'objet en stock quand un trait permanent est contré par une technique face à un boss à miroir (Silhouette, Gardien qui répète, boss du Sommet interdit) — « Emporté aussi : … ».
- Robot de campagne : emporte les objets conseillés qu'il a en stock.

## Mesures (banc, 100 parties)
Silhouette : Chevalier 85 → **94 %** (Baume froid), Rôdeur 91 % (Huile de lame, sans gain), Mage 100 %. Basilic : Rôdeur 97 → 100 %, Mage 98 → 100 %. Nezzam, Maître d'œuvre, Nécromancien : 100 % (1-2 points de PV de plus). Campagne `--n 2` : 6/6 au bout, aucun mur (1 en v3.736), médiane 31,3 h, morts 13 → 6 (le robot n'apprend presque jamais les recettes : l'écart relève surtout du hasard).

## Contrôles
round-harness 7 134 OK, 0 échec (2 passes), dont la section [498] ; boot ; création du héros ; i18n 0 manquant, 0 orphelin ; parcours 235 OK.
