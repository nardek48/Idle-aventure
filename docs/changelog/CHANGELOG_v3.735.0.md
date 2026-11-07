# v3.735.0 — Pronostic : avertissement PV bas sous 50 % (07/11/2026)

Décision de Seb (07/11) : aligner les deux seuils de PV bas.

## Changé
- `FORECAST_LOW_HP_PCT` 0,60 → 0,50 (`js/ui/combat-forecast-view.js`) : l'avertissement « Attention, il faut te soigner » du pronostic « Avant de partir » se déclenche sous 50 % des PV, comme le rappel à l'acceptation d'une étape de combat (v3.734.0).
- Fiche d'aide du pronostic : « sous 50 % de tes PV » (FR + EN).

## Contrôles
round-harness 7 030 OK, 0 échec (2 passes) ; contrôles [67b] et TUTO-16 adaptés au nouveau seuil ; boot ; création du héros ; i18n 0 manquant, 0 orphelin ; parcours 235 OK.
