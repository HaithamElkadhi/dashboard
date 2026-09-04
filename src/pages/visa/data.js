// Static content for the visa module, extracted from the original standalone
// HTML guides so the React pages stay declarative.

/** Liste officielle du ministère de la Justice — [nom, gouvernorat]. */
export const TRANSLATORS = [
  ['Hamza Marouani', 'Tunis'],
  ['Abdallah Chaïkh', 'Tunis'],
  ['Abdjelil Cheïb', 'Tunis'],
  ['Adel Karrah', 'Tunis'],
  ['Ahlem Kabka', 'Tunis'],
  ['Aïcha Rafik', 'Tunis'],
  ['Ammar Selmi', 'Tunis'],
  ['Asma Chinguiti', 'Tunis'],
  ['Besma Mohamed', 'Tunis'],
  ['Fathi Nakka', 'Tunis'],
  ['Hend Bouali', 'Tunis'],
  ['Issam Harjani', 'Tunis'],
  ['Ithaç Lbib', 'Tunis'],
  ['Khira Zouabi', 'Tunis'],
  ['Lotfi Belhassen', 'Tunis'],
  ['Lotfi Rahmani', 'Tunis'],
  ['Makrem Gharkaoui', 'Tunis'],
  ['Meriem Menoufi', 'Tunis'],
  ['Mofida Ayess', 'Tunis'],
  ['Radhia Gdairia', 'Tunis'],
  ['Saoussen Bourayou', 'Tunis'],
  ['Wajih Slimene', 'Tunis'],
  ['Yosra Hadfi', 'Tunis'],
  ['Nouha Abbes', 'Ariana'],
  ['Sahnoun Saïd', 'Ariana'],
  ['Mohamed Hajdi', 'Ben Arous'],
  ['Mohamed Fakhreddine Mansouri', 'Manouba'],
  ['Ahmed Ben Ghribal', 'Nabeul'],
  ['Fayçal Abri', 'Nabeul'],
  ['Rami Zarrouk', 'Nabeul'],
  ['Asma Skander', 'Béja'],
  ['Faten Saadi', 'Le Kef'],
  ['Fahmi Maaref', 'Sousse'],
  ['Ghazi Eddaly', 'Sousse'],
  ['Ismaïl Kemala', 'Sousse'],
  ['Issam Zarjani', 'Sousse'],
  ['Hanen Tallouli', 'Monastir'],
  ['Oumayma Maraoui', 'Monastir'],
  ['Abdessalem Bannour', 'Mahdia'],
  ['Ali Choumti', 'Mahdia'],
  ['Mariem Abboud', 'Sfax'],
  ['Nazia Touch', 'Sfax'],
  ['Thouraya Allouche', 'Sfax'],
  ['Samia Manai', 'Kasserine'],
  ['Nabiha Arrami', 'Gabès'],
  ['Ahmed Oujatani', 'Autre'],
  ['Amna Nakzi', 'Autre'],
  ['Chama Hfaiedh', 'Autre'],
  ['Islam Ben Farhat', 'Autre'],
];

export const TRANSLATOR_FILTERS = [
  { value: '', label: `Tous (${TRANSLATORS.length})` },
  { value: 'Tunis', label: 'Tunis' },
  { value: 'Ariana', label: 'Ariana' },
  { value: 'Ben Arous', label: 'Ben Arous' },
  { value: 'Sousse', label: 'Sousse' },
  { value: 'Sfax', label: 'Sfax' },
  { value: 'Monastir', label: 'Monastir' },
];

/**
 * Tag shorthand used by checklist items. A tag is either one of the four kinds
 * ('translate' | 'x2' | 'master' | 'opt') or "kind:label" when the original
 * document used a custom wording for that badge.
 */
export const TAG_DEFAULT_LABELS = {
  translate: 'à traduire',
  x2: '×2',
  master: 'master',
  opt: 'optionnel',
};

/** Les 18 pièces du dossier, dans l'ordre exact du dépôt. */
export const CLASSEMENT_DOCS = [
  {
    title: 'Les deux documents « Avis d’information AVS »',
    sub: 'Remis par le centre — le reçu de paiement se place en n° 18.',
  },
  {
    title: 'Copie de la deuxième page du passeport',
    sub: 'Validité du passeport : 15 mois ou plus.',
  },
  {
    title: 'Copie des visas Schengen',
    sub: 'Anciens visas Schengen uniquement — pas les visas hors-Schengen.',
  },
  {
    title: 'Deux exemplaires de la lettre de pré-inscription, signés',
    sub: 'Lettre Universitaly validée par l’université italienne.',
  },
  {
    title: 'La lettre de motivation',
    sub: 'En anglais si le programme est en anglais. Un modèle est disponible sur la page « Modèles ».',
  },
  {
    title:
      'Copie de la DICHIARAZIONE DI VALORE (DOV) ou CIMEA + copie conforme du diplôme du BAC traduite en italien',
    sub: 'La même chose pour les autres diplômes (licence…). Si la DOV/CIMEA n’est pas exigée par ta fac, la ligne est barrée au dépôt.',
  },
  {
    title: 'Copie du certificat linguistique B2',
    sub: 'PLIDA, TOEFL, IELTS, DANTE… copie simple, sans traduction.',
  },
  {
    title: 'Éventuelle copie du résultat du test d’évaluation en ligne',
    sub: 'Exemple : CISIA — si l’université le prévoit.',
  },
  {
    title:
      'Original du document de l’argent bloqué à la banque (irrévocable) + original de la déclaration d’identité bancaire (RIB)',
    sub: 'Boursiers : une copie du document d’acceptation de la bourse du Gouvernement italien.',
  },
  {
    title: 'Original du relevé du compte bancaire ou postal',
    sub: 'Les six derniers mois, sans traduction.',
  },
  {
    title: 'Une réservation d’avion ou de bateau aller-retour',
    sub: 'Réservation avec facture — pas besoin d’acheter le vrai billet.',
  },
  {
    title: 'Une réservation d’hôtel',
    sub: 'Ou séjour dans une résidence universitaire, ou invitation « Ospitalità » avec carte de séjour de l’invitant et contrat de location.',
  },
  {
    title: 'Copie de l’assurance de voyage — validité 365 jours',
    sub: 'Sans limitation pour l’hospitalisation d’urgence.',
  },
  {
    title:
      'Document original de la prise en charge légalisé + traduction italienne + documents professionnels du garant',
    sub: 'Selon le profil : salarié / commerçant / retraité. Documents de propriété : copie de la traduction italienne et copie de l’original.',
  },
  {
    title: 'Original de l’extrait de naissance apostillé avec traduction italienne',
    sub: '',
  },
  {
    title: 'Original du document de vie collective apostillé avec traduction italienne',
    sub: '',
  },
  {
    title: 'Copie du document socio-économique avec traduction italienne',
    sub: '',
  },
  {
    title: 'Copie du reçu du paiement AVS',
    sub: '',
  },
];

/** Checklist du dossier étudiant — 24 items répartis en 5 groupes. */
export const CHECKLIST_GROUPS = [
  {
    id: 'identite',
    title: 'Identité & admission',
    items: [
      {
        id: 's1',
        title: 'Formulaire de demande de visa',
        sub: 'À remplir sur place, comme on te le montre. Apporte un bon stylo.',
      },
      {
        id: 's2',
        title: 'Document envoyé par ALMAVIVA avant le RDV',
        sub: 'Reçu ~2 jours avant le rendez-vous. Imprime-le et apporte-le.',
      },
      {
        id: 's3',
        title: 'Passeport + copie',
        note: '15 mois +',
        sub: 'Validité > 15 mois (visa D). Copie de la 2ᵉ page + copies des anciens visas Schengen uniquement.',
      },
      {
        id: 's4',
        title: 'Photo d’identité récente pour le visa',
        sub: 'Norme ICAO, moins de ~6 mois. Une photo trop ancienne est refusée sur place.',
      },
      {
        id: 's5',
        title: 'Lettre de pré-inscription Universitaly signée',
        sub: 'Validée et transmise par l’université. Deux copies signées.',
        tags: ['x2'],
      },
      {
        id: 's6',
        title: 'Lettre de motivation',
        sub: 'En anglais si ton programme est en anglais.',
      },
      {
        id: 's7',
        title: '2 lettres de recommandation',
        sub: 'De tes enseignants ou encadrants. Présentes dans les dossiers master acceptés.',
        tags: ['master'],
      },
    ],
  },
  {
    id: 'diplomes',
    title: 'Diplômes & langue',
    items: [
      {
        id: 's8',
        title: 'Diplôme du BAC + relevé',
        sub: 'Copie conforme apostillée + traduction italienne. Au dépôt : remets la copie conforme traduite + l’original de la traduction.',
        tags: ['translate'],
      },
      {
        id: 's9',
        title: 'Diplôme de licence + relevés (3 ans)',
        sub: 'Même règle : copie conforme apostillée + traduction originale.',
        tags: ['master', 'translate'],
      },
      {
        id: 's10',
        title: 'CIMEA ou DOV + reçu',
        sub: '~300 €, ~43 jours de traitement. Vérifie ton pre-enrollment : si ta fac ne la demande pas, la ligne est barrée au dépôt.',
        tags: ['opt:si exigée'],
      },
      {
        id: 's11',
        title: 'Certificat de langue — copie',
        sub: 'Anglais : IELTS / TOEFL (copie simple). Italien : PLIDA, CELI, CILS — niveau B2 minimum.',
      },
      {
        id: 's12',
        title: 'Attestation de langue italienne',
        sub: 'Même pour un programme en anglais : une attestation d’une année d’italien renforce le dossier.',
        tags: ['opt:conseillé'],
      },
      {
        id: 's13',
        title: 'Résultat test d’aptitude (ex. CISIA)',
        sub: 'Lorsque l’université le prévoit.',
        tags: ['opt:si requis'],
      },
    ],
  },
  {
    id: 'finances',
    title: 'Finances',
    items: [
      {
        id: 's14',
        title: 'Attestation de compte bloqué — original',
        sub: '10 179,85 € (~34–35 000 DT), bloqués de manière irrévocable. Peut être au nom d’un parent avec ton nom inclus.',
      },
      {
        id: 's15',
        title: 'Identité bancaire (RIB) — original',
        sub: 'Accompagne l’attestation de blocage, du même compte.',
      },
      {
        id: 's16',
        title: 'Extraits de compte 6 mois — originaux, sans traduction',
        sub: 'Compte courant (et épargne si utile) du garant, avec du mouvement et un solde sain.',
      },
    ],
  },
  {
    id: 'voyage',
    title: 'Voyage, logement & santé',
    items: [
      {
        id: 's17',
        title: 'Billet d’avion aller-retour + facture — copie',
        sub: 'Réservation (pas besoin d’acheter le vrai billet) via agence de voyage, ~50 DT avec l’hôtel.',
      },
      {
        id: 's18',
        title: 'Réservation d’hôtel + facture — copie',
        sub: 'Ou résidence universitaire, ou invitation « Ospitalità » + carte de séjour de l’hôte + contrat de location.',
      },
      {
        id: 's19',
        title: 'Assurance voyage 365 jours — copie',
        sub: 'Deux options : la souscrire toi-même avant (~103 DT) ou la prendre sur place à ALMAVIVA (~300 DT). Sans limitation pour l’hospitalisation d’urgence.',
      },
    ],
  },
  {
    id: 'etat-civil',
    title: 'État civil & situation socio-économique',
    items: [
      {
        id: 's20',
        title: 'Extrait de naissance — le tien',
        sub: 'Original apostillé + traduction italienne.',
        tags: ['translate'],
      },
      {
        id: 's21',
        title: 'Extraits de naissance des parents',
        sub: 'Pas obligatoires, mais certains les ajoutent pour blinder le dossier.',
        tags: ['opt:optionnel', 'translate'],
      },
      {
        id: 's22',
        title: 'Vie collective (certificat de famille)',
        sub: 'Original apostillé + traduction. Une version « feha enti barka » suffit.',
        tags: ['translate'],
      },
      {
        id: 's23',
        title: 'Attestation socio-économique',
        sub: 'Délivrée par le ministère tunisien compétent.',
        tags: ['translate'],
      },
      {
        id: 's24',
        title: 'Avis d’information AVS + reçu de paiement',
        sub: 'Les deux documents d’avis du centre + la copie du reçu de paiement AVS.',
      },
    ],
  },
];

/** Nombre d'items de la checklist étudiant (hors dossier du garant). */
export const CHECKLIST_TOTAL = CHECKLIST_GROUPS.reduce(
  (total, group) => total + group.items.length,
  0
);

/** Dossier du garant, par profil. */
export const GARANT_TABS = [
  {
    id: 'salarie',
    label: 'Salarié',
    title: 'Documents du garant — Salarié',
    items: [
      {
        id: 'g-sal-1',
        title: 'Attestation de travail',
        sub: 'Établie par l’employeur.',
      },
      {
        id: 'g-sal-2',
        title: 'Attestation de salaire',
        sub: 'En complément de l’attestation de travail.',
      },
      {
        id: 'g-sal-3',
        title: '3 fiches de paie (6 si possible)',
        sub: 'Certaines années, 6 sont demandées ; des dossiers passent avec 3.',
      },
      {
        id: 'g-sal-4',
        title: 'CNSS / CNRPS',
        sub: 'Certificat d’affiliation, traduit en italien.',
        tags: ['translate'],
      },
      {
        id: 'g-sal-5',
        title: 'Extrait bancaire — 6 mois (original)',
        sub: 'Sans traduction, avec du mouvement.',
      },
      {
        id: 'g-sal-6',
        title: 'Déclaration annuelle des revenus 2025',
        sub: 'Original apostillé + traduction.',
        tags: ['translate'],
      },
    ],
  },
  {
    id: 'retraite',
    label: 'Retraité',
    title: 'Documents du garant — Retraité',
    items: [
      {
        id: 'g-ret-1',
        title: 'Attestation de pension de retraite',
        sub: 'Délivrée par la caisse de retraite (CNRPS / CNSS).',
      },
      {
        id: 'g-ret-2',
        title: 'CNRPS / CNSS — certificat d’affiliation',
        sub: 'Original apostillé + traduction italienne.',
        tags: ['translate'],
      },
      {
        id: 'g-ret-3',
        title: 'Extrait bancaire — 6 mois (original)',
        sub: 'Sans traduction, avec du mouvement.',
      },
      {
        id: 'g-ret-4',
        title: 'Déclaration annuelle des revenus 2025',
        sub: 'Original apostillé + traduction.',
        tags: ['translate'],
      },
    ],
  },
  {
    id: 'patente',
    label: 'Patente / Commerçant',
    title: 'Documents du garant — Patente / Commerçant',
    items: [
      {
        id: 'g-pat-1',
        title: 'Patente / Registre de commerce',
        sub: 'Preuve de l’activité commerciale.',
      },
      {
        id: 'g-pat-2',
        title: 'Extrait bancaire — 6 mois (original)',
        sub: 'Sans traduction, avec du mouvement.',
      },
      {
        id: 'g-pat-3',
        title: 'Déclaration annuelle des revenus 2025',
        sub: 'Original apostillé + traduction.',
        tags: ['translate'],
      },
    ],
  },
];

export const GARANT_COMMON_DOCS = [
  'Prise en charge — original légalisé (~1 semaine avant le RDV) + apostille + traduction. Peut être signée par les deux parents.',
  'Déclaration annuelle d’impôts 2025 (da5l sanawi) — original apostillé + traduction.',
  'Preuve de propriété — chhadet melkia apostillée + traduction. Pas de melkia ? Des contrats d’achat traduits font l’affaire (dossier accepté avec 2 contrats d’achat).',
  'Extraits de compte 6 mois — originaux, pas de traduction, avec du mouvement.',
];

export const PARCOURS_STEPS = [
  {
    title: 'Candidatures & admission',
    paragraphs: [
      'Tu candidates auprès des universités italiennes (dès décembre pour certaines) et tu passes l’entretien d’admission selon le programme. Candidate à plusieurs facs : les refus font partie du jeu, un dossier accepté à Bologne ou Camerino a souvent essuyé plusieurs refus avant.',
    ],
    note: 'Ne te décourage pas : un refus ne veut rien dire, continue à candidater. Un étudiant a essuyé plusieurs refus avant de recevoir trois acceptations dans sa spécialité.',
  },
  {
    title: 'CIMEA ou DOV — si ta fac l’exige',
    paragraphs: [
      'Certaines universités exigent la certification CIMEA (~300 €) ou la Dichiarazione di Valore. La CIMEA prend environ 40–45 jours de traitement : lance-la dès ton acceptation, avant même Universitaly. Ton pre-enrollment indique si elle est requise.',
    ],
    tag: '~300 € · réponse en ~43 jours',
  },
  {
    // {universitaly} is replaced by a link to universitaly.it when rendered.
    title: 'Pré-inscription sur Universitaly',
    paragraphs: [
      'Tu remplis ta demande sur {universitaly} en choisissant ton université en premier choix. Saisis bien l’e-mail que tu consultes : c’est par cet e-mail qu’ALMAVIVA te contactera.',
    ],
  },
  {
    title: 'Validation & transmission par l’université',
    paragraphs: [
      'L’université valide ta pré-inscription et la transmet à l’Ambassade via Universitaly. Le délai varie beaucoup : parfois 10 jours, parfois plus (Camerino est connue pour répondre lentement — patience). Si on te demande de corriger un document, fais-le le jour même.',
    ],
    note: 'Pour ceux qui visent Camerino : l’université met parfois du temps à répondre. Un peu de patience, ça finit par arriver.',
  },
  {
    title: 'Contact ALMAVIVA → rendez-vous visa',
    paragraphs: [
      'Une fois la pré-inscription validée, ALMAVIVA t’écrit pour fixer le rendez-vous de dépôt. Le délai peut aller jusqu’à 1 mois entre la validation Universitaly et le rendez-vous. Deux jours avant, ils t’envoient un document : imprime-le et apporte-le.',
    ],
    tag: 'La date ne peut pas être modifiée',
    tagPink: true,
  },
  {
    title: 'Constitution du dossier',
    paragraphs: [
      'Traductions assermentées, apostilles (~35 DT/document), légalisation de la prise en charge (à faire ~une semaine avant le rendez-vous), compte bloqué, assurance, réservations. C’est l’étape la plus longue — la checklist ci-dessous couvre tout.',
    ],
    note: 'Anticipe : traductions + apostilles prennent du temps.',
  },
  {
    title: 'Dépôt du dossier au centre',
    paragraphs: [
      'Tu te présentes avec le dossier original complet, le document envoyé par ALMAVIVA, et du cash (frais sur place). Le formulaire de visa se remplit sur place, comme le personnel te le montre.',
    ],
    note: 'Prends de la monnaie le jour du rendez-vous, tu en auras besoin. Le personnel d’ALMAVIVA est accueillant et t’aide volontiers — pas de stress.',
  },
  {
    title: 'Traitement de la demande',
    paragraphs: [
      'Le délai légal est de 90 jours maximum, mais en pratique ça peut aller très vite : un dossier déposé le 26 juin a reçu son visa le 1ᵉʳ juillet. Un dossier complet ne garantit pas le visa, mais un dossier béton accélère tout.',
    ],
  },
  {
    title: 'Arrivée en Italie → Questura',
    paragraphs: [
      'Dès ton arrivée, tu as 8 jours pour demander ton titre de séjour à la Questura. Tu dois être inscrit sur Universitaly avant le 31 janvier 2027, sinon le visa est révoqué.',
    ],
    tag: 'Ne quitte pas l’Italie avant ton titre de séjour',
    tagPink: true,
  },
];

export const TRANSLATE_YES = [
  'Diplôme du BAC + relevé',
  'Diplôme de licence + relevés (si master)',
  'Extrait de naissance (le tien)',
  'Vie collective / certificat de famille',
  'Prise en charge (légalisée d’abord)',
  'Déclaration d’impôts 2025 du garant',
  'Affiliation CNSS / CNRPS du garant',
  'Chhadet melkia ou contrats d’achat',
  'Attestation socio-économique',
];

export const TRANSLATE_NO = [
  'Extraits de compte courant / épargne 6 mois',
  'Attestation de compte bloqué + RIB',
  'IELTS / TOEFL (copie simple)',
  'Certificats italiens (PLIDA, CELI, CILS…)',
  'CIMEA + reçu',
  'Réservation billet d’avion + facture',
  'Réservation hôtel + facture',
  'Assurance voyage (copie)',
  'Pré-inscription Universitaly (2 copies)',
  'Passeport + copies',
  'Lettres de motivation / recommandation',
];

export const ZOOM_CARDS = [
  {
    eyebrow: 'Finances',
    title: 'Le compte bloqué',
    meta: '10 179,85 € ≈ 34–35k DT',
    body: '783,06 € × 13 mois, bloqués de manière irrévocable un an, versés en Italie chaque mois. Tu ne « perds » pas cet argent : tu le récupères mensuellement là-bas.',
    bullets: [
      'Astuce validée : le compte peut être au nom d’un parent avec ton nom inclus.',
      'Bourse du gouvernement italien ≥ ce montant → blocage non requis.',
      'Cursus < 12 mois → montant réduit proportionnellement.',
    ],
  },
  {
    eyebrow: 'Reconnaissance du diplôme',
    title: 'CIMEA / DOV',
    meta: '~300 € · ~43 jours',
    body: 'Exigée par certaines universités seulement — c’est écrit dans ton pre-enrollment.',
    bullets: [
      'Lance-la dès l’acceptation : c’est le document le plus lent du dossier.',
      'Garde le reçu de paiement, il se dépose avec.',
      'Non exigée par ta fac ? La ligne est simplement barrée au dépôt.',
    ],
  },
  {
    eyebrow: 'Santé',
    title: 'Assurance — 2 options',
    meta: 'Couverture 365 jours',
    body: 'Sans limitation pour l’hospitalisation d’urgence.',
    bullets: [
      'Option 1 : souscrire toi-même avant, auprès d’un assureur tunisien (~103 DT le contrat annuel étudiant).',
      'Option 2 : la prendre sur place à ALMAVIVA le jour du dépôt (~300 DT).',
      'Elle resservira pour le titre de séjour en Italie.',
    ],
  },
  {
    eyebrow: 'Voyage',
    title: 'Billet + hôtel : la réservation',
    meta: '~50 DT les deux',
    body: 'Pas besoin d’acheter un vrai billet : une réservation avec facture suffit.',
    bullets: [
      'Passe par une agence de voyage : réservation avion A/R + hôtel avec factures.',
      'Date de départ cohérente avec ta rentrée (ex. à partir de mi-août).',
      'Dépose des copies, pas d’originaux.',
    ],
  },
  {
    eyebrow: 'Garant',
    title: 'Prise en charge',
    meta: 'Déclaration officielle',
    body: 'Déclaration du garant qui couvre séjour et installation pendant toute la durée des études.',
    bullets: [
      'Peut être signée par les deux parents.',
      'Légalisation (signature) ~1 semaine avant le rendez-vous.',
      'Puis apostille + traduction italienne, avec les justificatifs de revenus.',
    ],
  },
  {
    eyebrow: 'Traductions',
    title: 'Traducteur assermenté',
    meta: '~35–50 DT par document',
    body: 'Toutes les traductions du dossier passent par un traducteur assermenté reconnu.',
    bullets: [
      'Apostille souvent prise en charge par le traducteur.',
      'Demande les recommandations dans les groupes d’étudiants.',
      'Pour les diplômes : la traduction se fait sur la copie conforme apostillée.',
    ],
  },
];

export const BUDGET_ROWS = [
  ['CIMEA', 'si exigée par ton université', '~300 €'],
  ['Apostille', 'par document, souvent gérée par le traducteur', '~35–50 DT'],
  ['Traductions assermentées', 'le traducteur prend en charge l’apostille', 'variable'],
  [
    'Assurance voyage 365 j',
    'soi-même ~103 DT · sur place à ALMAVIVA ~300 DT',
    '103–300 DT',
  ],
  ['Réservation avion A/R + hôtel', 'avec factures, via agence de voyage', '~50 DT'],
  ['Frais AVS / services au centre', 'à payer sur place — apporte du cash', 'en espèces'],
  [
    'Compte bloqué',
    'bloqué, pas dépensé : tu le récupères en Italie chaque mois',
    '10 179,85 € ≈ 35k DT',
  ],
];

export const ERREURS = [
  [
    'Ne remplis pas le formulaire de visa à l’avance.',
    'Il y a une table à remplir sur place, de la façon qu’on te montre. Apporte simplement un bon stylo.',
  ],
  [
    'Photo récente uniquement.',
    'Une photo trop ancienne te fait ressortir refaire des photos. Refais-la si elle date.',
  ],
  [
    'Copies de passeport : pas les vieux visas hors-Schengen.',
    'Un ancien visa USA, par exemple, ne sera pas pris — ne le copie pas.',
  ],
  [
    'Imprime la pré-inscription en double.',
    'Deux copies signées de la lettre Universitaly.',
  ],
  [
    'Vérifie si la CIMEA/DOV est vraiment requise — et lance-la tôt.',
    'C’est écrit dans ton pre-enrollment. Si elle est requise, compte ~43 jours : ne la découvre pas au dernier moment.',
  ],
  [
    'Corrige vite tout document signalé.',
    'Une correction faite le jour même = acceptation le jour même. La suite peut s’enchaîner en une semaine.',
  ],
  [
    'N’oublie pas le cash et le document ALMAVIVA.',
    'Le papier reçu 2 jours avant le RDV s’apporte imprimé, et plusieurs frais se paient en espèces sur place.',
  ],
  [
    'La légalisation de la prise en charge se fait juste avant.',
    '~Une semaine avant le rendez-vous, pas des mois avant.',
  ],
  [
    'Ne traduis pas ce qui ne se traduit pas.',
    'Extraits de compte, réservations, IELTS, assurance : tels quels. Tu économises des dizaines de dinars de traduction inutile.',
  ],
];

export const DATES = [
  [
    'déc. → print.',
    'Candidatures universités — commence tôt, les refus prennent du temps aussi.',
  ],
  ['~43 jours', 'Traitement CIMEA — à lancer dès l’acceptation.'],
  [
    '30 nov. 2026',
    'Date limite pour la prise de rendez-vous de dépôt du visa 2026/2027.',
  ],
  ['90 jours max', 'Délai de traitement du visa (des dossiers sont sortis en 5 jours).'],
  [
    '8 jours',
    'Après l’arrivée en Italie, pour demander ton titre de séjour à la Questura.',
  ],
  ['31 jan. 2027', 'Tu dois être inscrit sur Universitaly, sinon le visa est révoqué.'],
  ['15 mois +', 'Validité minimale du passeport pour un visa D.'],
];

export const REGLES = [
  'La pré-inscription et l’admission par l’université italienne ne donnent pas droit à la délivrance du visa.',
  'Un dossier complet ne garantit pas non plus l’obtention automatique du visa.',
  'Documents : en français, traduits en italien et apostillés. L’Ambassade peut demander des pièces supplémentaires.',
  'Demandes autonomes refusées : seul le contact d’ALMAVIVA par e-mail fixe le rendez-vous. La date n’est pas modifiable.',
  'Ne change pas de cours après le visa. T’inscrire à un autre cursus que celui visé t’oblige à rentrer en Tunisie et redemander un visa.',
  'Ne quitte pas l’Italie avant d’avoir obtenu ton premier titre de séjour.',
  'Consulte toujours Universitaly pour vérifier les documents réellement exigés par ton université.',
  'L’Ambassade peut te convoquer pour un bref entretien, notamment pour vérifier la langue.',
];

export const ASSURANCE_ADDRESSES = [
  {
    name: 'Lloyd Assurances',
    price: '~103 DT/an',
    desc: 'Assistance voyage « études », devis en ligne. C’est ce type de contrat annuel étudiant qui a été pris à ~103 DT dans un dossier accepté en 2026.',
    href: 'https://www.lloyd.com.tn/particulier/assurance-voyage/',
    linkLabel: 'lloyd.com.tn ↗',
  },
  {
    name: 'BH Assurance',
    price: 'sur devis',
    desc: '« Plan étudiant » dédié aux études à l’étranger, version étendue disponible.',
    href: 'https://bh-assurance.com/assurance-voyage',
    linkLabel: 'bh-assurance.com ↗',
  },
  {
    name: 'STAR Assurances',
    price: 'sur devis',
    desc: 'Assistance voyage, large réseau d’agences dans tout le pays.',
    href: 'https://www.star.com.tn/produits/assistance-voyage',
    linkLabel: 'star.com.tn ↗',
  },
  {
    name: 'ALMAVIVA — sur place',
    price: '~300 DT',
    desc: 'Le jour du dépôt, sans aucune démarche préalable. L’option la plus simple, mais la plus chère.',
  },
];

export const VOYAGE_ADDRESSES = [
  {
    name: 'Dima Voyages (Sousse)',
    price: '~50 DT les deux',
    desc: 'Agence catégorie A : billetterie et réservations d’hôtel. Demande une « réservation avion A/R + hôtel avec factures pour dossier visa ».',
    href: 'https://www.dimavoyage.com/',
    linkLabel: 'dimavoyage.com ↗',
  },
  {
    name: 'Toute agence catégorie A',
    price: '~50 DT',
    desc: 'Le service « réservation + facture pour visa » est standard — demande-le tel quel (Traveltodo, agences de quartier…).',
  },
];

export const HERO_STATS = [
  ['10 179,85 €', 'Compte bloqué (~35k DT)'],
  ['783,06 € × 13', 'Virement mensuel'],
  ['Niveau B2', 'Certificat de langue'],
  ['300 €', 'CIMEA (si exigée)'],
  ['90 jours max', 'Traitement · parfois 5 j'],
];

export const GUIDE_ANCHORS = [
  ['parcours', 'Parcours'],
  ['checklist', 'Checklist'],
  ['garant', 'Garant'],
  ['traduction', 'Traduire ?'],
  ['zoom', 'Documents clés'],
  ['budget', 'Budget'],
  ['erreurs', 'Erreurs'],
  ['dates', 'Dates'],
  ['regles', 'Règles'],
  ['adresses', 'Adresses'],
];
