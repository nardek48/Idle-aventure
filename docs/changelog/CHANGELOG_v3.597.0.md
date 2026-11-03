# v3.597.0 — Conversations au feu : le moteur et la scène

Chantier « parler avec les compagnons », cadre validé par Seb le 31/10 ; mise en page B « la scène » choisie dans l'atelier `atelier/conversations.html`. Cette version pose la mécanique : **aucune conversation n'est encore livrée**. Les textes (Wenna et Maddoc, lot 1) attendent leur validation dans l'atelier des textes, puis s'ajoutent dans `js/data/companion-talks.js` sans autre changement.

## La mécanique
- Une conversation s'ouvre quand le compagnon est recruté, que son étape de l'Histoire est atteinte et que la conversation précédente est faite. Une seule à la fois par compagnon, sans minuteur.
- **Dans « Le feu »** : une carte « Maddoc veut te parler » (avec sa première réplique), une pastille « … » sur son portrait au coin du feu (le toucher ouvre la conversation), et la pastille « ! » de l'onglet.
- **La scène** : plein écran sur l'image du camp du monde, le compagnon en grand, une réplique à la fois (toucher pour continuer), deux réponses au choix ; la réplique qui pose la question reste au-dessus des réponses. Le portrait s'assombrit quand parle le narrateur ou le héros.
- Fin : « Retour au feu », et l'annonce de la quête personnelle quand la conversation en débloque une (la mécanique des quêtes viendra avec leur déroulé validé).
- Quitter avant la fin (croix, retour Android, Échap) ne note rien : la conversation reste proposée.
- La réponse choisie est gardée pour chaque conversation, dans l'état du compagnon : elle pourra changer une réplique plus tard.

## Fichiers
- **Fichiers ajoutés** (dans `index.html` et le précache de `sw.js`) :
  - `js/data/companion-talks.js` : les conversations (vide pour l'instant) ;
  - `js/systems/companion-talk-system.js` : `CompanionTalkManager` ;
  - `js/ui/companion-talk-view.js` : la scène et la carte du feu.
- `js/systems/companion-system.js` : `talks` sauvegardé et relu avec chaque compagnon (`cleanTalks`). Pas de fichier protégé touché : l'état des compagnons est déjà câblé aux quatre points de la sauvegarde.
- `js/ui/camp-view.js` : carte, pastilles ; `js/ui/ui-root.js` : le retour ferme la conversation.
- `css/04-panel-camp.css` : la carte et la scène ; `js/lang/en.js` : textes anglais.

## Contrôles
`round-harness` 5 626 OK, 0 échec (deux passes ; nouvelle section [394], avec une conversation de test injectée) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` 142 OK ; audit i18n 100 %, 0 orphelin. Scène vérifiée sous Chromium à 390 × 844 et 1440 × 900.
