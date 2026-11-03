# v3.607.0 — Les suites des événements, les compagnons réagissent (chantier E3)

## S1 — Les suites
Un événement réussi appelle sa suite à l'aube suivante. Le tirage d'une suite est garanti, et le hasard ne la tire jamais :
- `d_brannoc_fer` → **La lame de Brannoc** (cadeau : une pièce d'équipement du monde, bouton « Recevoir ») ;
- `d_orwen_eau` → **Plus personne ne tousse** (cadeau : Grande ration ×1, Ration ×2) ;
- `d_orwen_ble` → **La table d'Orwen** (fête offerte, sans pain) ;
- `d_aldric_pierre` → **Le compte est juste** (la Palissade freine 15 % d'échecs de plus sur les cartes vivantes pendant 2 jours, `VILLAGE_EVENT_PALISADE`) ;
- toute rumeur jouée → **Plus loin, {lieu}** (secteur le plus lointain, +75 % de butin et +3 de la ressource rare, `VILLAGE_EVENT_RUMOR2`) ;
- un marché où l'on a vendu à Sarkel → **Sarkel est revenu** (un nouveau marché).

Deux nouveaux types de carte : `cadeau` et `palissade`. `hasAction` compte un cadeau à recevoir (pastille du Village).

## S2 — Les compagnons réagissent
- Au feu, nouveau sujet **« Et ce matin ? »** tant qu'un événement est en cours : une ligne par compagnon et par type (20 lignes, `companionMorningData`). Le sujet porte une pastille tant qu'il n'a pas été écouté (clé `s_matin_<id>`).
- Le soir au camp, la pioche ajoute une phrase sur l'événement en cours (`villageEventSoirData`, 4 phrases).

## Images
Deux nouveaux chemins, branchés sur l'icône générique en attendant : `images/Icons/village_events/event_cadeau.webp` et `event_palissade.webp` (prompts dans l'atelier d'images).

## Contrôles
- round-harness : 5 737 OK, 0 échec, sur 2 passes. Nouvelle section [403].
- boot : 4 OK. Création du héros : 44 OK. Parcours : 142 OK.
- i18n : 100 % (7 559 textes).
- Aucun fichier ajouté, aucun fichier protégé modifié.
