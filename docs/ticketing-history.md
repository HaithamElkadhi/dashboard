# Ticketing — actions directes et historique

Ajout du 4 octobre 2026. Complète et remplace les exclusions « pas de suppression / pas d'historique » de la V1.

## Utilisation

- Dans la liste ou la carte mobile, choisir le responsable ou le statut. Une petite fenêtre permet d'ajouter un commentaire facultatif et de confirmer le changement sans ouvrir tout le ticket.
- Dans le détail, **Comments & history** permet d'ajouter un commentaire indépendant. Les commentaires sont des entrées distinctes, jamais un remplacement du champ Notes.
- Modifier le statut ou le responsable dans le formulaire ajoute aussi une entrée, avec le commentaire de changement éventuel.
- **Delete** ouvre une confirmation de suppression définitive. La suppression enlève le ticket de la liste, mais conserve ses événements dans Airtable. L'application ne propose pas d'annulation de cette suppression.

## Stockage Airtable

Table [Ticket History](https://airtable.com/appkqvTuc8F0AhWPp/tblphgbNKhd5xi0Zk), ID `tblphgbNKhd5xi0Zk`.

| Champ | Utilité |
| --- | --- |
| Event ID | Identifiant unique de l'événement |
| Ticket Record ID / Ticket Reference | Référence durable, conservée même après suppression |
| Event Type | Created, Updated, Comment, Deleted |
| Occurred At | Horodatage serveur UTC ; affichage en Africa/Tunis |
| Actor / Actor User ID | Identité de la session authentifiée, jamais fournie par le formulaire |
| Previous Status / New Status | Statut avant et après la modification |
| Previous Assignee / New Assignee | Responsable avant et après ; vide signifie non assigné |
| Comment | Texte libre associé à l'événement |
| Changed Fields | Liste des champs modifiés, sans recopier tout le dossier |
| Result | Pending, Applied, Failed |

## Garantie et limites

Le serveur relit le ticket et vérifie `Type = Ticket`. Si un statut ou responsable attendu a changé depuis l'ouverture, il refuse la modification avec 409. Un événement est préparé avant une modification/suppression : si cette préparation échoue, le ticket n'est pas modifié. Après succès, l'événement est confirmé Applied. Une réponse incertaine reste Pending et est visible comme telle ; un refus définitif de la mutation est marqué Failed. Si seule la confirmation d'historique échoue après une sauvegarde réelle, l'app conserve le résultat réel et affiche un avertissement au lieu d'annoncer un faux rollback.

Un commentaire seul nécessite une unique création d'événement Applied ; deux commentaires ne se réécrivent pas mutuellement. La création d'un nouveau ticket précède son premier événement : une panne d'historique à cette étape est signalée explicitement.

La table n'est pas ajoutée à l'allowlist du proxy générique. L'app utilise uniquement l'API authentifiée `/api/ticketing` pour lire/ajouter ces événements et ne fournit pas de modification/suppression de commentaire. Les commentaires sont internes et n'envoient aucun email ni WhatsApp.

L'historique commence à l'installation : les anciens changements ne sont pas reconstitués. Les modifications effectuées directement dans Airtable ne produisent pas d'événement dans cette version ; elles nécessiteraient une automation dédiée. Airtable ne fournit pas ici de transaction entre deux tables ni de comparaison/écriture atomique : la vérification de conflit limite les écrasements, sans garantir un verrou distribué. Les événements de tickets supprimés restent consultables dans Ticket History ; la liste de tickets de l'app n'affiche pas les records supprimés.

## Vérifications

Tests : source serveur de l'auteur/date, conservation des anciennes/nouvelles valeurs, ajout de commentaires sans écrasement, conflit de statut, erreurs partielles, confirmation avant suppression, rejet des tâches ordinaires et lecture authentifiée. Les suppressions de dossiers réels ne sont pas utilisées pour les tests.

## Platform user assignment

Tickets now store `Assigned User ID` and `Assigned User Name` in Tasks. The ID refers to a Users record in the authentication base; the name is a server-generated snapshot for display and history. Airtable cannot link records directly across these two bases.

The authenticated `/api/ticketing?users=1` directory returns only active users' IDs, usernames and display names. Ticket assignment validates the selected account on the server, and Assigned to me compares its record ID with the current session user ID. Names can change without changing assignment identity. Inactive assignees remain visible on existing tickets but cannot receive a new assignment.

The old `Assigned To` field is preserved for ordinary tasks and migration reference. Tickets with only a legacy name are treated as unassigned until explicitly reassigned to a platform account. No automatic name matching is performed. Their previous name appears in Details and is retained in assignment history when reassigned.
