# Interface JXP ERP

Source : `JXP_ERP_Charte_Interface.pdf`, octobre 2026, **proposition**, pages 1–9.

## Tokens — page 2

| Token | Valeur |
| --- | --- |
| `primary` | `#173B65` |
| `accent` | `#80C4EA` |
| Fond de page | `#F4F7FB` |
| `surface` | `#FFFFFF` — surface de contenu blanche |
| `text` | `#172D43` |
| `border` | `#D9E2EC` |
| `success` | `#217A50` |
| `warning` | `#966000` |
| `danger` | `#B83232` |

Le token `muted` est demandé mais son hex n’est pas fixé par le PDF. Choisir une valeur lisible sur la surface réelle et vérifier le contraste, sans la présenter comme une valeur officielle.

Poppins ; titres 24–28 px SemiBold, sections 18–20 px, corps 14–16 px, métadonnées 12 px. Interligne 1,4–1,5. Alignement à gauche. Base de 4 px ; marge de page 24–32 px ; cartes padding 24 px. Contrôles rayon 8 px ; cartes/modales 12 px ; badges arrondis complets ; bordure 1 px ; ombres légères sur éléments flottants.

## Actions et formulaires — pages 3–4

- Principal bleu ; secondaire neutre/contour ; discret peu accentué ; destructif rouge avec confirmation décrivant l’action.
- Standard 44 px de haut, petit 32 px, grand 48 px. Padding horizontal 16–20 px ; icône–texte 8 px. Zones tactiles au moins 44 × 44 px même avec un contrôle visuellement petit.
- Une action principale par zone ; verbes précis. Texte conservé pendant chargement, état visible, double soumission empêchée.
- Champs 44 px ; libellé persistant au-dessus, aide et erreur sous le champ. Astérisque requis expliqué. Formats attendus explicites. Recherche pour les longues listes.
- Préserver les saisies après erreur. Relier les erreurs aux champs, rendre le focus visible et les libellés accessibles.

## Tableaux, navigation et indicateurs — pages 5–6

- Lignes 48–56 px ; en-tête fixe pour longues listes ; tri visible dans l’en-tête.
- Recherche, filtres appliqués lisibles et suppression des filtres. Pagination avec plage et nombre total.
- Sur mobile, transformer les lignes en cartes quand cela convient au contenu.
- Sidebar desktop proposée : 240 px ; état actif par fond **et** texte. Fil d’Ariane sur pages détaillées.
- Onglets pour sections d’un même espace, menu pour changement d’espace de travail.
- Mesure nommée, période et unités visibles. Ne jamais reprendre les KPI fictifs de la charte comme des données réelles.

## Feedback et documents — pages 7–8

- Modale : titre, conséquence, annulation et action finale. Focus contenu dans la modale ; retour au déclencheur à la fermeture.
- Toast de succès temporaire ; erreur persistante jusqu’à correction.
- Skeleton pour listes en chargement. Après échec, conserver les données et proposer une nouvelle tentative. État vide expliqué avec prochaine action pertinente.
- Upload : formats et taille autorisés, progression et résultat par fichier. Ne pas afficher un upload réussi avant confirmation réelle.
- Calendrier : texte et couleur pour les créneaux. Historique : date, auteur, action.
- Étapes terminées, actives et à venir distinctes dans le parcours.

## Responsive et livraison — page 9

Seuils proposés : mobile < 768 px, tablette 768–1199 px, desktop ≥ 1200 px. Les adapter au contenu et au système existant plutôt que les imposer aveuglément.

Menu repliable, formulaire sur une colonne quand nécessaire, tableaux en cartes, modales plein écran sur mobile si pertinent. Garder les actions visibles et accessibles.

Documenter les états des composants et leurs tokens. Vérifier contraste, ordre clavier, données longues, statut sans couleur, labels et erreurs associés. Le PDF ne spécifie aucun seuil chiffré de contraste ni hex `muted` : ne pas inventer leur attribution à la charte.
