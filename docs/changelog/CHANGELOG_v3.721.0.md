# v3.721.0 — Boutons : texte agrandi (option B), derniers boutons d'écran passés au pack

Retour de Seb sur iPhone (06/11) : des boutons au design différent, texte des nouveaux boutons trop petit. Option B et correspondances validées (« ok parfait tu peux livrer B et faire le reste des boutons »). Aucun état sauvegardé nouveau, aucun fichier ajouté.

## Livré

- **Texte (option B)** : bouton du pack 15 → 17 px, deuxième ligne 13 → 14 px, pastille 15 → 16 px ; format large (« Tout récolter », « Voir le tableau complet ») 17 px. Hauteurs inchangées (44, 60, 36 px) ; un libellé trop long passe en deux lignes (v3.720.0).
- **Boutons d'écran passés au pack** (`css/00-kbtn.css`, bloc v3.721.0) :
  - cuivre, taille normale : « Préparer le festin » (`.camp-feast-go`, était orange pleine largeur), « Envoyer » d'une patrouille (`.exp-go-btn`) ;
  - pastille cuivre : « Carte › » de « Tu es ici » (`.camp-here-go`), « Parler » (`.camp-talk-go`), action conseillée des Expéditions (`.exp-act.is-primary` : Carte ›, Décharger, Prendre le butin), « Réclamer » des Hauts faits (`.hf-btn`), « Livrer » de la Taverne (`.tavern-contract-btn`), reliques (`.cp-relic-btn`) ;
  - pastille parchemin : autres actions des Expéditions (Entrer ›, Envoyer…, Partir…), relique en mode discret (`.cp-relic-btn.is-ghost`).
  - Désactivé ou non payable : désaturé, comme les autres boutons.
- Anciens styles retirés des écrans (`04-panel-camp`, `-expeditions`, `-village`, `-achievements`, `-companions`), y compris l'encre sombre UI-21 de « Carte › » (le cuivre prend un texte crème). « Tout réclamer » des Hauts faits quitte ses 12 px pour la taille du pack.
- Quoi de neuf : une ligne FR + EN.
- `tools/harness/round-harness.js` : [450] UI-21 mis à jour ; [482] (nouveau, 3 contrôles).

## Contrôles

- `node --check` sur chaque JS modifié.
- `round-harness.js` : 6 660 OK, 0 échec (deux passes) ; `boot-harness.js` 4/0 ; `hero-creation-harness.js` 44/0 ; `parcours-harness.js` 232/0.
- Captures Chromium à 390 et 320 px (Camp › Le feu, Expéditions, Hauts faits, Taverne, Paramètres) : aucun débordement.
- Relevé automatique sur 20 écrans : restent hors du pack les onglets, tuiles et petits boutons ronds, qui ne sont pas des boutons d'action.
