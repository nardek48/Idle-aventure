v3.33.6 — Cooldown de l'attaque de base + édition des stats (bac à sable)
- Nouvelle fonction pure computeEffectiveCooldownMs() dans
  combat-cooldown-system.js : cooldown de l'attaque de base réduit
  par la Célérité (jusqu'à -50%), bac à sable UNIQUEMENT — le jeu réel
  garde cooldownMs: 0 sur l'attaque de base (data/class-skills.js
  inchangé).
- Réglage baseCooldownMs visible dans l'écran bac à sable (défaut
  600ms), appliqué au combat unique et au mode Run.
- Nouveau panneau "Stats du héros de test" (Puissance/Endurance/
  Célérité/Précision/Volonté), modifiable librement pour simuler un
  héros amélioré, sans jamais toucher data/heroes.js. Bouton de
  réinitialisation exacte aux stats de base réelles.
- Application des changements au prochain combat lancé (pas en cours
  de combat actif — choix documenté).
- sw.js : CACHE_VERSION 3.33.5 -> 3.33.6.
- Combat unique et mode Run inchangés dans leur comportement, hormis
  l'ajout du cooldown de base tel que demandé. Aucun impact sur le
  jeu réel.