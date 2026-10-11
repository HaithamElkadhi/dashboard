export const EDUCATION_BASE = "app7PKe025jceS4kQ";
export const EDUCATION_ENTITIES = {
  "parents": {
    "tableId": "tblZ3KoV9zht2NssP",
    "label": "Parents",
    "fields": [
      {
        "name": "Nom complet",
        "type": "singleLineText"
      },
      {
        "name": "Email",
        "type": "email"
      },
      {
        "name": "Téléphone",
        "type": "phoneNumber"
      }
    ],
    "required": [
      "Nom complet"
    ]
  },
  "classes": {
    "tableId": "tbl84iBtErHduZpDO",
    "label": "Classes",
    "fields": [
      {
        "name": "Classe",
        "type": "singleLineText"
      },
      {
        "name": "Niveau",
        "type": "singleLineText"
      },
      {
        "name": "Année scolaire",
        "type": "singleLineText"
      }
    ],
    "required": [
      "Classe"
    ]
  },
  "students": {
    "tableId": "tbl7BPNSj6stTcv1l",
    "label": "Élèves",
    "fields": [
      {
        "name": "Nom complet",
        "type": "singleLineText"
      },
      {
        "name": "Photo",
        "id": "fldywdTNsXkaA8lSq",
        "type": "multipleAttachments"
      },
      {
        "name": "Classe",
        "type": "multipleRecordLinks",
        "target": "classes"
      },
      {
        "name": "Parents",
        "type": "multipleRecordLinks",
        "target": "parents"
      }
    ],
    "required": [
      "Nom complet"
    ]
  },
  "results": {
    "tableId": "tblTpZU61LqyGVneM",
    "label": "Résultats",
    "fields": [
      {
        "name": "Examen",
        "type": "singleLineText"
      },
      {
        "name": "Élève",
        "type": "multipleRecordLinks",
        "target": "students"
      },
      {
        "name": "Date",
        "type": "date"
      },
      {
        "name": "Note",
        "type": "number"
      },
      {
        "name": "Copies d’examen",
        "id": "fldsTrKAiGAtkvhun",
        "type": "multipleAttachments"
      },
      {
        "name": "Commentaire",
        "type": "multilineText"
      }
    ],
    "required": [
      "Examen",
      "Élève",
      "Date",
      "Note"
    ]
  },
  "events": {
    "tableId": "tblJ73E44hJX8tzvl",
    "label": "Présence et discipline",
    "fields": [
      {
        "name": "Objet",
        "type": "singleLineText"
      },
      {
        "name": "Élève",
        "type": "multipleRecordLinks",
        "target": "students"
      },
      {
        "name": "Date",
        "type": "date"
      },
      {
        "name": "Catégorie",
        "type": "singleSelect"
      },
      {
        "name": "Observation",
        "type": "multilineText"
      },
      {
        "name": "Auteur",
        "type": "singleLineText"
      }
    ],
    "required": [
      "Objet",
      "Élève",
      "Date",
      "Catégorie",
      "Observation"
    ]
  }
};
export const normalizeEducationRecord = record => ({ id: record.id, fields: record.fields || {} });
EDUCATION_ENTITIES.attendance = { tableId: 'tblpXDtJEDRqE1xBD', label: 'Appels', fields: [{ name: 'Appel', type: 'singleLineText' }, { name: 'Date', type: 'date' }, { name: 'Classe', type: 'multipleRecordLinks', target: 'classes' }, { name: 'Élève', type: 'multipleRecordLinks', target: 'students' }, { name: 'Présence', type: 'singleSelect' }], required: ['Appel', 'Date', 'Classe', 'Élève', 'Présence'] };
export const EDUCATION_OPTIONS = { parents: {}, classes: {}, students: {}, results: {}, events: { "Catégorie": ["Observation", "Discipline"] }, attendance: { 'Présence': ['Présent', 'Absent', 'Retard'] } };
