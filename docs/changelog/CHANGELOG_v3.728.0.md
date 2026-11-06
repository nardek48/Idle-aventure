# v3.728.0 — Petites Aventures : décor et fuite selon le monde (06/11/2026)

Demande de Seb (06/11) : corriger les deux textes signalés au lot de la Tour (v3.727.0).

## Corrigé
- **Décor** : l'écran d'une Petite Aventure (préparation, carte, bilan) prenait le fond du monde où vit le héros, pas celui de l'aventure. Une aventure de la Tour pouvait s'afficher sur le fond de la Forêt, et inversement en rejouant un monde passé. `pa2ApplyWorldTheme` pose le fond et la couleur du monde de l'aventure ; `pa2ClearChrome` rend ceux du monde courant (`WorldManager.applyWorldTheme`) à la sortie.
- **Fuite** : « Fuir par les fourrés » n'existe plus qu'en Forêt. Désert : par les dunes ; Ruines : par les ruelles ; Crypte : par les couloirs ; Montagne : par les éboulis ; Tour : par l'escalier (`pa2FleeLabel`).

## Contrôles
round-harness 6 905 OK, 0 échec (2 passes), dont la section [489] ; boot ; création du héros ; i18n 0 manquant, 0 orphelin ; parcours 235 OK.
