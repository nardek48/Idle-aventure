# Aethervale — v3.74.1

Ajustements suite retour sur v3.74.0 (panneau Admin).

## Changements

- **Index de monde borné 0–6** : `adminApplyWorldIndex()` rejette désormais explicitement `n > 6`
  en plus du check d'existence réel contre `WORLDS[n]` (actuellement 6 mondes définis, index 0–5 ;
  la borne à 6 est prête pour un futur 7e monde sans redéploiement du panneau). Attributs HTML
  `min="0" max="6"` ajoutés au champ de saisie.
- **Mode large écran** : l'écran Admin bénéficie désormais du même `sandbox-wide-mode` que le bac à
  sable (`#panel-container.sandbox-wide-mode`, media query ≥900px, CSS déjà existant dans
  `css/04-panel-combat-sandbox.css` — aucune modification CSS nécessaire, la classe s'applique par
  simple présence sur `#panel-container` indépendamment du contenu). Actif dès `game.activeTab === "admin"`.
- **Bouton bac à sable retiré de Paramètres** : le bac à sable de combat reste accessible via le
  panneau Admin (bouton "🧪 Ouvrir le bac à sable"), plus de doublon dans l'écran Paramètres.

## Fichiers modifiés
- `js/ui/admin-view.js` — bornes 0–6 sur l'index de monde (JS + attributs HTML)
- `js/ui/ui-root.js` — `sandbox-wide-mode` étendu à l'onglet `admin`
- `js/ui/settings-view.js` — retrait du bouton "Bac à sable de combat"
- `sw.js` — `CACHE_VERSION` 3.74.0 → 3.74.1

## Tests effectués
- `node --check` sur les 3 fichiers JS modifiés.
- Harness `vm` mis à jour : ajout du cas `n=7` (doit être rejeté par la borne dure même s'il existait
  un 7e monde) en plus du cas `n=9999` déjà couvert. Tous les tests précédents repassés (recalcStats,
  clamp PV, kill enemy, saveGame). Tout passe.
