# Ticketing — spécification fonctionnelle et technique

Statut : V1 implémentée le 4 octobre 2026. Inspection du code et du schéma Airtable effectuée le même jour. Aucun nouveau champ ou table nécessaire. Les tests de mutation utilisent des mocks ; les dossiers étudiants existants ne sont pas modifiés pour la vérification.

Livraison : `/ticketing`, liste/cartes responsive, filtres repliables sur mobile, formulaire de création/édition, sélection de dossiers étudiants, assignation, statuts (dont archivage/restauration), contacts, notes et pièces existantes en lecture seule. Écritures ciblées via `/api/ticketing`, vérification serveur du type Ticket et des choix du schéma. Les tâches ordinaires sont séparées dans My Tasks/Kanban ; les notifications ouvrent les tickets dans Ticketing. Les notes restent partagées et éditables sans journal d'audit ni fusion concurrente.

## 1. Objectif et source

Ajouter un module interne **Ticketing** pour centraliser les demandes des étudiants, attribuer un responsable et suivre leur traitement. Route `/ticketing`, entrée de menu `Ticketing`, interface conforme au skill UI JEEXPERT (Poppins, bleu #173B65, azur #80C4EA, cartes 12 px).

- Base : `appkqvTuc8F0AhWPp`.
- Table existante : `Tasks`, `tblkmA6khmu06nmSb`.
- [Vue fournie](https://airtable.com/appkqvTuc8F0AhWPp/tblkmA6khmu06nmSb/viwrickr0ALA6LOWD?blocks=hide).
- Source du module : **`Type = Ticket`**. `Task Type` désigne la catégorie, et ne doit pas recevoir la valeur Ticket.
- La vue Airtable n'est pas une règle d'accès ; le filtre du module doit être explicite et indépendant de ses changements.
- La lecture filtrée a retourné un ticket, en `Todo`, avec étudiant lié, objet et description ; `Assigned To` était vide. Ce constat ponctuel n'est pas un KPI permanent.

## 2. Champs existants et correspondance

| Libellé dans l'app | Champ Airtable / ID | Règle |
| --- | --- | --- |
| Ticket reference | Ticket ID / `fldREmahsaEC8gl87` | Formule en lecture seule, conserver le préfixe TSK actuel |
| Record kind | Type / `fldSjR5EVnhvC0qer` | Toujours Ticket pour les créations du module |
| Subject | Objet / `fldsLCGHg6yeQHtzg` | Objet court ; pour un ancien ticket vide, afficher un extrait de Description ou la référence |
| Description | Description / `fld6KhpKoJl0KqWCK` | Demande complète, conservée séparément de l'objet |
| Student | Linked Prospect / `fldjSWmfcfKoSdJzS` | Référence réelle vers Prospects ; afficher les liens multiples existants sans les tronquer |
| Student name | Prospect Name / `flde1U5nx74Xcwyft` | Nom de secours pour les anciens tickets sans lien |
| Email | Client Email / `fldOeDhTRKcby0jKO` | Contact de la demande, ne pas écraser automatiquement par le contact actuel du dossier |
| Phone | Client Phone / `fldslsb7PRy8cSCHg` | Même règle ; aucune communication automatique |
| Assigned to | Assigned To / `fldzxlXFEjqu0K0NO` | Choix actuels : Haitham, Eya, Moez ; liste issue du schéma |
| Status | Task Status / `fldD9zlILdlxUHFNh` | Todo, In progress, Blocked, Done, Archived |
| Priority | Priority / `fldpA0aj4PyioeG2y` | High, Medium, Low ; défaut Medium pour un nouveau ticket |
| Category | Task Type / `fldjYnfISDfXSmv1c` | Follow-up, Document Request, Call / Meeting, Application, Payment, Visa, Other, Scholarship |
| Due date | DDL / `fldB29MtkYOd1wQMF` | Date, facultative ; affichage explicite sans échéance |
| Internal notes | Notes / `flddsDQPVgjKor6VO` | Notes internes partagées, pas une conversation avec l'étudiant |
| Attachments | Attachment / `fldQUFTfeAHWUsuLk` | Liste, noms, liens et aperçu des formats pris en charge |
| Created at | Date de création / `fldz5l3QOJk7ZyNie` | Lecture seule |

`Assignee` (`fldUzEkOCTRPHI7th`) est un collaborateur Airtable distinct de `Assigned To`. V1 utilise **Assigned To** comme responsable opérationnel, sans synchronisation implicite avec Assignee ou les comptes de connexion.

## 3. Écran principal

Disposition : indicateurs → filtres → liste des tickets. Une action principale **New ticket**. Bouton Refresh et horodatage de dernière synchronisation.

- Indicateurs globaux sur les tickets chargés : Open (Todo/In progress/Blocked), Unassigned open, Overdue open, Blocked. Les valeurs ne dépendent pas des filtres de liste ; un clic active le filtre correspondant.
- Vues rapides : Open (défaut), Unassigned, Overdue, Resolved, Archived, All. Open inclut les anciens tickets sans statut avec un libellé Missing status, sans écrire Todo silencieusement.
- Recherche par référence, objet, description et nom étudiant ; filtres responsable, catégorie, priorité, statut, échéance. Filtres combinables, visibles et réinitialisables.
- Colonnes : référence/objet, étudiant, catégorie, priorité, responsable, statut, échéance, création. Pagination ; tri par échéance, création et priorité.
- Tri initial : tickets ouverts en retard, puis échéances les plus proches, puis sans échéance ; priorité High avant Medium/Low à date égale ; création en départage.
- Sur mobile : cartes compactes, mêmes informations essentielles et accès au détail ; filtre dans une zone repliable.
- Valeurs inconnues ou champs vides affichés explicitement ; aucune valeur réelle remplacée pour simplifier le tableau.

Une date DDL antérieure à la date du jour en **Africa/Tunis** constitue un retard seulement pour un ticket ouvert. Today n'est pas Overdue. Done et Archived ne sont jamais comptés en retard.

## 4. Détail et parcours

Un panneau de détail, adressable par `/ticketing?ticket=<recordId>`, présente référence, objet, demande intégrale, étudiant(s), contacts, attachments et métadonnées. Vérifier que le record existe et possède Type = Ticket avant affichage/modification.

### Création

1. New ticket ouvre le formulaire.
2. Saisir Subject et Description ; choisir un étudiant dans Prospects (toutes situations, pas uniquement Student).
3. Choisir Category, Priority et éventuellement Assigned to et Due date.
4. Proposer les contacts du dossier en préremplissage à la sélection ; laisser l'utilisateur les corriger.
5. Enregistrer avec Type = Ticket, Status = Todo, et les ID du/des dossiers liés.
6. Afficher le ticket réellement confirmé par Airtable, sa référence et une confirmation.

Subject, Description et un étudiant lié sont requis pour les nouvelles créations. L'assignation et l'échéance restent facultatives pour permettre une file de triage. Les tickets importés sans lien restent visibles et peuvent être reliés ultérieurement ; leur assignation/statut ne doit pas être bloqué par ces lacunes historiques.

### Traitement

`Todo → In progress → Done` ; `Blocked` disponible si l'équipe attend une pièce, une réponse ou une action externe. Le motif est consigné dans Notes. Un ticket Done peut être rouvert en Todo/In progress. Archived masque un ticket de la vue active sans le supprimer et permet sa restauration.

- Actions : assigner/réassigner, modifier priorité/catégorie/DDL, corriger objet et description, lier un étudiant, éditer Notes, résoudre, rouvrir, archiver/restaurer.
- Pas de suppression définitive dans Ticketing V1.
- Notes reste un champ éditable existant : pas de faux historique chronologique, d'auteur déduit ou de promesse d'audit. Les échanges existants sont conservés ; l'app n'ajoute pas une entrée fictive à chaque changement.
- Attachments : lecture et téléchargement des pièces existantes en V1. Upload et suppression de pièces exclus de V1 pour garder le module simple.
- Confirmation avant abandon de saisies non enregistrées et avant archivage. Double enregistrement empêché ; message d'erreur conservé et saisies préservées en cas d'échec.

## 5. Intégration avec Tasks et accès

- Ticketing et Tasks partagent les mêmes records, sans copier la table.
- Par défaut, My Tasks et Kanban Board excluent **Type = Ticket** ; les records Task, Automatique et sans Type conservent leur fonctionnement actuel. Un ticket apparaît dans Ticketing même lorsqu'il est assigné.
- Le bouton global devient New ticket sur Ticketing et ouvre le bon formulaire. Les notifications peuvent continuer à inclure les tickets, avec badge Ticket et ouverture du détail Ticketing.
- Les comptes authentifiés actifs peuvent lire et gérer tous les tickets, comme les tâches actuellement. Le statut admin reste réservé à la gestion des utilisateurs ; il n'est pas nécessaire pour Ticketing.
- Pas de portail étudiant ni de droits individuels par responsable en V1. Un filtre Assigned to ne constitue pas un contrôle d'accès.
- Pas de My tickets automatique : les comptes JEEXPERT ne sont pas reliés aux choix Haitham/Eya/Moez. Cette fonction nécessiterait un mapping explicite, jamais une comparaison approximative de noms.

## 6. Architecture proposée

Réutiliser `TasksWorkspaceContext` et son chargement partagé, enrichir la normalisation avec `recordKind`, `subject`, `linkedProspectIds`, contacts, attachments et createdAt. Le chargement de toutes les pages Airtable doit être complet avant de présenter les totaux comme complets.

Le modèle actuel utilise `type` pour Task Type et `name` pour Description. Conserver ce comportement pour les tâches ordinaires ; créer un mapping/formulaire ticket distinct pour éviter de remplacer une demande longue par un objet court.

- `TicketingPage.jsx`, filtres/liste/cartes, formulaire et panneau détail spécifiques.
- Fonctions pures de sélection, tri, retard et statistiques pour tester les règles.
- Lecture des choix via le schéma ; ne pas ajouter des options Airtable par typecast.
- PATCH minimal : n'envoyer que les champs modifiés, jamais Ticket ID/Created at ni une liste de pièces recalculée.
- Réutiliser le proxy Vercel authentifié et ses vérifications d'origine ; token Airtable uniquement côté serveur. Pour les actions ticket spécifiques, vérifier côté serveur le type du record et la liste de champs autorisés.
- Le proxy actuel autorise des écritures génériques sur Tasks : cette architecture ne crée pas des permissions par record pour toute l'app. Toute restriction de rôle future doit être appliquée à tous les chemins d'écriture, pas uniquement à la nouvelle page.
- Prévenir les doubles soumissions, rétablir la valeur affichée sur échec d'une action rapide et conserver les anciennes données lors d'un refresh échoué.
- Notes partagé ne fournit pas de fusion concurrente ni d'audit : signaler cette limite. Un historique fiable multi-utilisateur nécessiterait des événements séparés.

## 7. Airtable à préparer

**V1 : aucun nouveau champ ou nouvelle table nécessaire.** Les champs, les statuts et la valeur Ticket existent déjà. Vérifier simplement les responsables disponibles et les autorisations de lecture/écriture du token du projet sur Tasks et de lecture sur Prospects/schéma.

Évolution facultative après V1 : table Ticket Activity (ticket lié, événement, auteur applicatif, date serveur, message, avant/après) ; champs Resolved at, Resolution summary, Last activity at et Created by pour mesurer réellement le délai de résolution et afficher une timeline. Ces champs ne seront pas simulés dans Notes ni ajoutés sans nécessité.

## 8. Critères de livraison

1. Seuls les records Type = Ticket apparaissent, quels que soient leur catégorie ou leur statut.
2. Le ticket existant non assigné est visible dans Open et Unassigned ; objet, description et étudiant lié sont corrects.
3. Création/édition conservent Objet et Description distincts ; les autres types de tâches ne changent pas de données ni de formulaire.
4. Assignation et désassignation persistent après refresh ; les choix proviennent du schéma.
5. Filtres, tri, pagination et compteurs restent cohérents ; archives, dates vides, champs inconnus et liens multiples sont couverts.
6. Les tests vérifient le périmètre Ticket, le retard à minuit Tunis, les états terminaux et les PATCH ciblés ; erreurs d'accès/écriture ne montrent aucun faux succès.
7. La demande longue, les noms longs et les pièces sont lisibles sur desktop/mobile ; navigation clavier, focus du panneau et états loading/error/empty sont vérifiés.
8. Build et tests pertinents passent ; aucun email/WhatsApp automatique, aucune suppression ni mutation des autres types.

## 9. Limites de V1

Pas de SLA automatique, d'envoi de réponse à l'étudiant, d'upload, d'audit détaillé, d'automatisation d'assignation, de portail public ni de KPI temps de résolution sans données dédiées. Une vue Kanban spécifique tickets est une extension possible après validation de la file de traitement.
