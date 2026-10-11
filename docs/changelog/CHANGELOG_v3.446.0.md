# Aethervale v3.446.0 — Plus de double affichage avant la sortie

Retour de Seb : l'encart « Ce que tu vas affronter » des écrans de lancement doublonnait la préparation de sortie. Option 1 validée : tout passe par la préparation.

## Ce qui change
- **Encart retiré** de la fiche du donjon, des introductions de quête d'aventure et de chasse, de l'élite de la carte et de l'écran « Avant de partir » du Camp.
- **Préparation de sortie** : « Ce que tu vas affronter » devient une section à part (entre le mode et l'équipe), affichée dès qu'un trait est connu, **même sans objet de combat**. Chaque trait dit ce qui y répond : objet emporté, règle du départ (preset compris), ou rien (raccourci « Règle › »). En Tactique : « À toi de le contrer en combat. »
- Le donjon lancé du Camp n'ouvre plus « Avant de partir » quand le combat est abordable (l'écran ne s'ouvrait que pour l'encart) : un écran de moins.
- Nettoyage : chargement de preset depuis l'encart, « Ouvrir le Grimoire », « Revenir au combat » et leurs styles retirés ; 6 traductions orphelines supprimées.

## Contrôles
- `round-harness` : 4 172 OK, 0 échec (3 passes) ; [154] relu sur la préparation, contrôle [221] ajouté.
- `parcours-harness` : 139 OK ; `boot` 4 OK ; `hero-creation` 44 OK ; i18n 100 %, 0 orphelin.
- Aucun fichier ajouté, aucun fichier protégé modifié.
