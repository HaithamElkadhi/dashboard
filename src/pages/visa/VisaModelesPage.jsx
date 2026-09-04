import { Link } from 'react-router-dom';
import VisaLayout from './VisaLayout.jsx';

const PRINT_STYLES = `
  body { font-family: 'Inter', sans-serif; font-size: 13px; line-height: 1.8; color: #1a1a1a; padding: 2cm; }
  * { box-sizing: border-box; }
  .pc-field { display: grid; grid-template-columns: 200px 1fr; gap: .25rem 1rem; margin-bottom: .25rem; }
  .pc-label { font-size: 12px; color: #666; }
  .pc-value { border-bottom: 1px solid #ccc; min-width: 0; padding-bottom: 1px; color: #aaa; font-style: italic; }
  .pc-body { margin: 1.25rem 0; line-height: 1.85; }
  .pc-sign { display: flex; gap: 2rem; flex-wrap: wrap; margin-top: 2rem; }
  .pc-sign-item { display: flex; flex-direction: column; gap: .5rem; }
  .pc-sign-label { font-size: 12px; color: #666; }
  .pc-sign-line { width: 160px; border-bottom: 1px solid #ccc; padding-bottom: 28px; }
  .pc-sign-line.w120 { width: 120px; }
  .pc-sign-line.w200 { width: 180px; }
  .pc-checkbox { display: flex; gap: 1.5rem; margin: .5rem 0; }
  .bloc-header { text-align: center; font-size: 11px; font-weight: 600; color: #666; letter-spacing: .08em; text-transform: uppercase; border: 1px solid #ccc; padding: .5rem; margin-bottom: 1.25rem; }
  .bloc-blank { display: inline-block; border-bottom: 1px solid #333; min-width: 140px; margin: 0 3px; }
  .bloc-blank.lg { min-width: 200px; }
  .bloc-blank.sm { min-width: 70px; }
  .bloc-amount { font-weight: 700; }
  .bloc-note { margin-top: 1.5rem; padding: .75rem; background: #eaf5ee; border-radius: 4px; font-size: 12px; line-height: 1.6; }
  .lm-blank { display: inline-block; border-bottom: 1px solid #333; min-width: 120px; margin: 0 2px; color: #aaa; font-style: italic; font-size: 12px; }
  .lm-blank.lg { min-width: 180px; }
  .lm-blank.sm { min-width: 60px; }
  .lm-para { margin-bottom: .875rem; }
  .lm-sign-line { width: 180px; border-bottom: 1px solid #ccc; padding-bottom: 24px; margin-top: .75rem; }
  input[type=checkbox] { display: inline; }
`;

/** Opens the model on its own, printer-friendly page. */
function printSection(id) {
  const el = document.getElementById(`print-${id}`);
  if (!el) return;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(
    `<!DOCTYPE html><html><head><meta charset="UTF-8">` +
      `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">` +
      `<style>${PRINT_STYLES}</style></head><body>${el.innerHTML}</body></html>`
  );
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

function ModeleHeader({ note, id }) {
  return (
    <div className="modele-header">
      <span className="modele-note">{note}</span>
      <button type="button" className="print-btn" onClick={() => printSection(id)}>
        Imprimer ce modèle
      </button>
    </div>
  );
}

function PcField({ label }) {
  return (
    <div className="pc-field">
      <span className="pc-label">{label}</span>
      <span className="pc-value" />
    </div>
  );
}

export default function VisaModelesPage() {
  return (
    <VisaLayout narrow>
      <div className="topbar">
        <div className="topbar-inner">
          <Link to="/visa#checklist" className="back-link">
            ← Revenir au guide
          </Link>
        </div>
      </div>

      <div className="hero">
        <h1>Modèles de documents</h1>
        <p className="hero-lead">
          Trois modèles prêts à imprimer, fidèles aux formats utilisés par les dossiers
          acceptés et aux fac-similés officiels. <strong>Modèles indicatifs</strong> : ta
          banque ou l’Ambassade peuvent exiger leur propre format — l’essentiel est que les
          mentions clés y figurent.
        </p>
        <div className="ref-links">
          <a
            href="https://ambtunisi.esteri.it"
            target="_blank"
            rel="noreferrer"
            className="ref-link"
          >
            ambtunisi.esteri.it ↗
          </a>
          <a
            href="https://www.universitaly.it"
            target="_blank"
            rel="noreferrer"
            className="ref-link"
          >
            universitaly.it ↗
          </a>
          <a
            href="https://www.cimea.it"
            target="_blank"
            rel="noreferrer"
            className="ref-link"
          >
            cimea.it ↗
          </a>
        </div>
      </div>

      <div className="content content-modeles">
        {/* MODELE 1 : PRISE EN CHARGE */}
        <div className="modele-section" id="prise-en-charge">
          <ModeleHeader
            id="prise-en-charge"
            note="À signer par le garant, légaliser (~1 semaine avant le RDV), apostiller puis traduire en italien."
          />
          <h2>
            Engagement pour la prise en charge d’étudiant
            <br />
            <span className="modele-sub">(pour visa d’études en Italie)</span>
          </h2>
          <div className="doc-card" id="print-prise-en-charge">
            <p className="pc-doc-title">
              ENGAGEMENT POUR LA PRISE EN CHARGE D’ÉTUDIANT
              <br />
              <span>(pour visa d’études en Italie)</span>
            </p>
            <p className="pc-intro">Je soussigné/e :</p>

            <PcField label="NOM :" />
            <PcField label="Prénoms :" />
            <PcField label="Lieu et date de naissance :" />
            <PcField label="Nationalité :" />
            <PcField label="Adresse :" />
            <PcField label="N° tél. :" />
            <PcField label="Profession :" />
            <PcField label="Date d’embauche / début d’activité :" />
            <PcField label="Nom de l’entreprise :" />

            <div className="pc-checkbox-wrap">
              <div className="pc-checkbox">
                <label>
                  <input type="checkbox" disabled /> Salarié
                </label>
                <label>
                  <input type="checkbox" disabled /> À son compte
                </label>
                <label>
                  <input type="checkbox" disabled /> Retraité
                </label>
              </div>
            </div>

            <PcField label="Adresse de l’employeur :" />
            <PcField label="En qualité de (père / mère / autre) :" />

            <p className="pc-separator">de l’étudiant/e bénéficiaire sous-indiqué/e :</p>

            <PcField label="NOM :" />
            <PcField label="Prénoms :" />
            <PcField label="Lieu et date de naissance :" />
            <PcField label="Nationalité :" />
            <PcField label="Université en Italie :" />

            <p className="pc-body">
              Je m’engage à payer tous les frais relatifs à l’étudiant/e susmentionné/e
              pendant toute la durée de ses études en Italie (hébergement, taxes et livres
              universitaires, frais divers, soins médicaux, éventuel rapatriement, et tout
              autre frais qui devrait se révéler nécessaire et non expressément mentionné)
              et pour toute la durée de sa permanence en Italie.
            </p>

            <div className="pc-sign">
              <div className="pc-sign-item">
                <span className="pc-sign-label">Fait à</span>
                <div className="pc-sign-line" />
              </div>
              <div className="pc-sign-item">
                <span className="pc-sign-label">le</span>
                <div className="pc-sign-line w120" />
              </div>
              <div className="pc-sign-item">
                <span className="pc-sign-label">Signature du déclarant (légalisée)</span>
                <div className="pc-sign-line w200" />
              </div>
            </div>
          </div>
        </div>

        {/* MODELE 2 : BLOCAGE */}
        <div className="modele-section" id="blocage">
          <ModeleHeader
            id="blocage"
            note="À remettre à ta banque comme référence — elle l’établit sur son propre papier à en-tête. Original, sans traduction."
          />
          <h2>
            Attestation bancaire de blocage{' '}
            <span className="modele-sub-sm">(fac-similé)</span>
          </h2>
          <div className="doc-card" id="print-blocage">
            <div className="bloc-header">— Papier à en-tête de la banque —</div>
            <div className="bloc-body">
              <p>
                Nous soussignés, <span className="bloc-blank lg" /> (banque et agence),
                attestons que M./Mme <span className="bloc-blank lg" />, titulaire du compte
                n° <span className="bloc-blank sm" />, a constitué auprès de nos caisses un
                dépôt bloqué <strong>DE MANIÈRE IRRÉVOCABLE</strong> d’un montant de{' '}
                <span className="bloc-amount">10 179,85 euros</span>{' '}
                <span className="bloc-cents">
                  (dix mille cent soixante-dix-neuf euros et quatre-vingt-cinq centimes)
                </span>
                , destiné à couvrir les frais de séjour pour études en Italie de
                l’étudiant/e <span className="bloc-blank lg" />, pour une période de treize
                (13) mois.
              </p>
              <br />
              <p>
                Nous attestons en outre l’existence d’un ordre{' '}
                <strong>IRRÉVOCABLE</strong> de virement mensuel de{' '}
                <span className="bloc-amount">783,06 euros</span> en faveur de l’étudiant/e
                susmentionné/e en Italie, pendant toute la durée précitée.
              </p>
            </div>
            <div className="pc-sign mt-lg">
              <div className="pc-sign-item">
                <span className="pc-sign-label">Fait à</span>
                <div className="pc-sign-line" />
              </div>
              <div className="pc-sign-item">
                <span className="pc-sign-label">le</span>
                <div className="pc-sign-line w120" />
              </div>
              <div className="pc-sign-item">
                <span className="pc-sign-label">Cachet et signature de la banque</span>
                <div className="pc-sign-line w200" />
              </div>
            </div>
            <div className="bloc-note">
              <strong>Points essentiels vérifiés au dépôt :</strong> la mention
              « irrévocable », le montant total (10 179,85 €), le virement mensuel (783,06 €
              × 13) et l’identité de l’étudiant. Le compte peut être au nom d’un parent{' '}
              <strong>avec le nom de l’étudiant inclus</strong>. Joins l’original du RIB du
              même compte.
            </div>
          </div>
        </div>

        {/* MODELE 3 : LETTRE DE MOTIVATION */}
        <div className="modele-section" id="motivation">
          <ModeleHeader
            id="motivation"
            note="Une page maximum. À rédiger en anglais si ton programme est en anglais — adapte, ne recopie pas mot à mot."
          />
          <h2>
            Lettre de motivation{' '}
            <span className="modele-sub-sm">(modèle à adapter)</span>
          </h2>
          <div className="doc-card" id="print-motivation">
            <div className="lm-header">
              <p>[Prénom NOM]</p>
              <p>[Adresse — Ville, Tunisie] · [e-mail] · [téléphone]</p>
              <p className="lm-to">À l’attention de l’Ambassade d’Italie à Tunis</p>
              <p className="lm-object">
                Objet : Demande de visa d’études — inscription en{' '}
                <span className="lm-blank lg">[nom du programme]</span>,{' '}
                <span className="lm-blank">[Université]</span>, année universitaire
                2026/2027
              </p>
              <p>Madame, Monsieur,</p>
            </div>

            <p className="lm-para">
              Titulaire d’un{' '}
              <span className="lm-blank">[baccalauréat / diplôme de licence en …]</span>{' '}
              obtenu en <span className="lm-blank sm w60">[année]</span> avec{' '}
              <span className="lm-blank">[mention / moyenne]</span>, j’ai été admis/e au
              programme <span className="lm-blank lg">[nom du programme]</span> de l’
              <span className="lm-blank lg">[Université]</span>, comme l’atteste ma lettre
              de pré-inscription Universitaly. Ce cursus s’inscrit dans la continuité
              directe de mon parcours :{' '}
              <span className="lm-blank lg w280">
                [1–2 phrases — ce que tu as étudié, ce qui te motive dans ce programme
                précis, pourquoi cette université]
              </span>
              .
            </p>

            <p className="lm-para">
              Mon séjour est entièrement financé : un compte bloqué de 10 179,85 € a été
              constitué{' '}
              <span className="lm-blank lg">
                [à mon nom / au nom de mon garant, mon nom y étant inclus]
              </span>
              , avec un virement mensuel irrévocable de 783,06 € pendant 13 mois, et{' '}
              <span className="lm-blank">[mon père / ma mère / mon garant]</span> s’est
              engagé/e par une prise en charge légalisée à couvrir l’ensemble de mes frais.
              Je dispose également d’une assurance couvrant 365 jours et d’un logement pour
              la période initiale.
            </p>

            <p className="lm-para">
              À l’issue de ma formation, mon objectif est de{' '}
              <span className="lm-blank lg w240">
                [projet professionnel — 1 phrase]
              </span>
              . Je m’engage à respecter la réglementation italienne relative au séjour des
              étudiants, notamment la demande de titre de séjour dans les huit jours suivant
              mon arrivée.
            </p>

            <p className="lm-para">
              Je vous remercie de l’attention portée à ma demande et vous prie d’agréer,
              Madame, Monsieur, l’expression de ma considération distinguée.
            </p>

            <div className="lm-sign">
              <p>
                Fait à <span className="lm-blank sm w100" />, le{' '}
                <span className="lm-blank sm" />
              </p>
              <div className="lm-sign-line" />
              <p className="lm-sign-caption">Signature</p>
            </div>
          </div>
        </div>

        <div className="source-note">
          Modèles indicatifs — juillet 2026. Références officielles :{' '}
          <a href="https://ambtunisi.esteri.it" target="_blank" rel="noreferrer">
            ambtunisi.esteri.it
          </a>{' '}
          (circulaire et fac-similé bancaire) ·{' '}
          <a href="https://www.universitaly.it" target="_blank" rel="noreferrer">
            universitaly.it
          </a>{' '}
          ·{' '}
          <a href="https://www.cimea.it" target="_blank" rel="noreferrer">
            cimea.it
          </a>
          . En cas de divergence, les documents officiels de l’Ambassade font foi.
        </div>
      </div>
    </VisaLayout>
  );
}
