# v3.169.0 — Achat/vente sur le kit (.btn-buy, Tout vendre)

## Décision (Seb)
Les boutons d'achat/vente passent sur le même principe que les boutons
du jeu (kit or, cf. « Récolter »/.primary) — la distinction « ça
coûte » est portée par le prix + l'icône de pièce, plus besoin d'une
couleur dédiée. Texte en BLANC (choix validé v3.168) plutôt qu'or
clair : un prix doré sur cadre doré se lirait mal.

## Changements
- `.btn-buy` (35 usages — cartes d'achat de tous les écrans, Équiper/
  Vendre/Déséquiper) : ancien asset bleu (`bouton_achat.png`/`_max`)
  → cadre or du kit ; :active = asset pressé ; états non-achetable/
  acheté/max = variante filtre (comme le verrouillé des boutons du
  jeu). `images/Buttons/bouton_achat*.png` deviennent des vestiges
  inutilisés (suppression manuelle possible, pas via delta).
- `.inv-sell-all-btn` (« Tout vendre ») : aligné sur la variante danger
  (cadre or + texte rouge), max 260px centré.
- Atelier section 9 : spécimens achat (92px : prix / pas les moyens /
  Acheté) + Équiper + Tout vendre.

## Vigilance pour tes tests
Aux petites tailles des cartes (92×28), le cadre est nettement aplati —
si ça rend mal sur ton iPhone, on demandera un export « plat » de
l'asset pour ces boutons.

## Contrôles
boot 4 OK · hero-creation 44 OK · round 914 OK.
