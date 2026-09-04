import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import VisaLayout from './VisaLayout.jsx';
import useChecks from './useChecks.js';
import {
  ASSURANCE_ADDRESSES,
  BUDGET_ROWS,
  CHECKLIST_GROUPS,
  CHECKLIST_TOTAL,
  DATES,
  ERREURS,
  GARANT_COMMON_DOCS,
  GARANT_TABS,
  GUIDE_ANCHORS,
  HERO_STATS,
  PARCOURS_STEPS,
  REGLES,
  TAG_DEFAULT_LABELS,
  TRANSLATE_NO,
  TRANSLATE_YES,
  TRANSLATOR_FILTERS,
  TRANSLATORS,
  VOYAGE_ADDRESSES,
  ZOOM_CARDS,
} from './data.js';

const STORAGE_KEY = 'visa-checklist';

function parseTag(spec) {
  const separator = spec.indexOf(':');
  const kind = separator === -1 ? spec : spec.slice(0, separator);
  const label = separator === -1 ? TAG_DEFAULT_LABELS[kind] : spec.slice(separator + 1);
  return { kind, label };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function downloadChecklistPdf(checks) {
  let done = 0;
  let total = 0;
  let bodyHtml = '';

  CHECKLIST_GROUPS.forEach((group) => {
    let groupDone = 0;
    let itemsHtml = '';

    group.items.forEach((item) => {
      const checked = Boolean(checks[item.id]);
      if (checked) groupDone += 1;
      total += 1;
      if (checked) done += 1;

      const tagsHtml = (item.tags || [])
        .map((spec) => {
          const { kind, label } = parseTag(spec);
          return `<span class="tag tag-${escapeHtml(kind)}">${escapeHtml(label)}</span>`;
        })
        .join(' ');

      itemsHtml += `
        <div class="row${checked ? ' done' : ''}">
          <div class="box">${checked ? '✓' : ''}</div>
          <div>
            <div class="title">${escapeHtml(item.title)}${
              item.note
                ? ` <span class="note">${escapeHtml(item.note)}</span>`
                : ''
            }${tagsHtml ? ` ${tagsHtml}` : ''}</div>
            ${item.sub ? `<div class="sub">${escapeHtml(item.sub)}</div>` : ''}
          </div>
        </div>`;
    });

    bodyHtml += `
      <section class="group">
        <h2>${escapeHtml(group.title)} <span>${groupDone}/${group.items.length}</span></h2>
        ${itemsHtml}
      </section>`;
  });

  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Checklist visa étudiant Italie — ${done}/${total}</title>
<style>
  @page { size: A4; margin: 14mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    color: #1a1a1a;
    font-size: 11.5px;
    line-height: 1.45;
  }
  .header {
    display: flex; justify-content: space-between; align-items: flex-end;
    border-bottom: 2px solid #1a6b3c; padding-bottom: 10px; margin-bottom: 18px;
  }
  .header h1 { font-size: 18px; font-weight: 700; line-height: 1.25; }
  .header h1 span { color: #1a6b3c; }
  .meta { text-align: right; font-size: 11px; color: #666; }
  .meta strong { display: block; color: #1a1a1a; font-size: 13px; margin-bottom: 2px; }
  .legend { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
  .pill { font-size: 10px; padding: 2px 8px; border-radius: 999px; font-weight: 500; }
  .pill-tr { background: #fff3cd; color: #7a5200; }
  .pill-x2 { background: #e8eaf6; color: #3949ab; }
  .pill-ma { background: #fce4ec; color: #ad1457; }
  .pill-op { background: #f3e5f5; color: #7b1fa2; }
  .group { margin-bottom: 14px; break-inside: avoid; }
  .group h2 {
    font-size: 11px; font-weight: 700; color: #5a5a5a;
    text-transform: uppercase; letter-spacing: .04em;
    border-bottom: 1px solid #e2e2de; padding-bottom: 5px; margin-bottom: 6px;
  }
  .group h2 span { font-weight: 500; color: #888; text-transform: none; letter-spacing: 0; }
  .row {
    display: grid; grid-template-columns: 14px 1fr; gap: 8px;
    padding: 5px 0; border-bottom: 1px solid #f0f0ec; align-items: start;
  }
  .row:last-child { border-bottom: none; }
  .box {
    width: 12px; height: 12px; margin-top: 2px;
    border: 1.5px solid #1a6b3c; border-radius: 2px;
    font-size: 9px; line-height: 10px; text-align: center; color: #1a6b3c;
  }
  .row.done .title { text-decoration: line-through; color: #888; }
  .row.done { opacity: .7; }
  .title { font-size: 11.5px; font-weight: 600; line-height: 1.35; }
  .title .note { font-size: 10px; color: #888; font-weight: 400; }
  .title .tag {
    display: inline-block; font-size: 9px; padding: 1px 6px;
    border-radius: 999px; font-weight: 500; margin-left: 4px; vertical-align: middle;
  }
  .title .tag-translate { background: #fff3cd; color: #7a5200; }
  .title .tag-x2 { background: #e8eaf6; color: #3949ab; }
  .title .tag-master { background: #fce4ec; color: #ad1457; }
  .title .tag-opt { background: #f3e5f5; color: #7b1fa2; }
  .sub { font-size: 10px; color: #666; margin-top: 1px; }
  .footer {
    margin-top: 18px; padding-top: 8px; border-top: 1px solid #e2e2de;
    font-size: 9.5px; color: #888;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Checklist — dossier <span>visa étudiant</span></h1>
      <div style="font-size:11px;color:#666;margin-top:3px;">Italie · 2026/2027 · Tunisie</div>
    </div>
    <div class="meta">
      <strong>${done} / ${total} documents</strong>
      ${today}
    </div>
  </div>
  <div class="legend">
    <span class="pill pill-tr">à traduire + apostille</span>
    <span class="pill pill-x2">×2 exemplaires</span>
    <span class="pill pill-ma">master</span>
    <span class="pill pill-op">optionnel</span>
  </div>
  ${bodyHtml}
  <div class="footer">Guide visa étudiant Italie — à titre indicatif. Vérifie toujours les exigences officielles avant le dépôt.</div>
  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
  <\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    window.alert('Autorise les pop-ups pour télécharger le PDF.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/** `spec` is either "kind" or "kind:custom label". */
function Tag({ spec, inline = false }) {
  const { kind, label } = parseTag(spec);
  return <span className={`tag tag-${kind}${inline ? ' tag-inline' : ''}`}>{label}</span>;
}

function ChecklistItem({ item, checked, onToggle }) {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle(item.id);
    }
  };

  return (
    <div
      className={`checklist-item${checked ? ' checked' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={checked}
      onClick={() => onToggle(item.id)}
      onKeyDown={handleKeyDown}
    >
      <input type="checkbox" checked={checked} readOnly tabIndex={-1} />
      <div>
        <div className="item-title">
          {item.title}
          {item.note ? <span className="title-note"> {item.note}</span> : null}
          {(item.tags || []).map((spec) => (
            <Fragment key={spec}>
              {' '}
              <Tag spec={spec} inline />
            </Fragment>
          ))}
        </div>
        {item.sub ? <div className="item-sub">{item.sub}</div> : null}
      </div>
    </div>
  );
}

function StepParagraph({ text }) {
  if (!text.includes('{universitaly}')) return <p>{text}</p>;
  const [before, after] = text.split('{universitaly}');
  return (
    <p>
      {before}
      <a href="https://www.universitaly.it" target="_blank" rel="noreferrer">
        universitaly.it
      </a>
      {after}
    </p>
  );
}

function AddressCard({ address }) {
  return (
    <div className="addr-card">
      <div className="addr-name">{address.name}</div>
      <div className="addr-price">{address.price}</div>
      <div className="addr-desc">{address.desc}</div>
      {address.href ? (
        <a className="addr-link" href={address.href} target="_blank" rel="noreferrer">
          {address.linkLabel}
        </a>
      ) : null}
    </div>
  );
}

export default function VisaGuidePage() {
  const { hash } = useLocation();
  const { checks, toggle, clearAll } = useChecks(STORAGE_KEY);
  const [garantTab, setGarantTab] = useState(GARANT_TABS[0].id);
  const [translatorFilter, setTranslatorFilter] = useState('');

  useEffect(() => {
    const id = hash.replace('#', '');
    if (!id) return;
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ block: 'start' });
  }, [hash]);

  const checkedCount = useMemo(
    () =>
      CHECKLIST_GROUPS.reduce(
        (total, group) => total + group.items.filter((item) => checks[item.id]).length,
        0
      ),
    [checks]
  );

  const translators = useMemo(
    () =>
      translatorFilter
        ? TRANSLATORS.filter(([, gov]) => gov === translatorFilter)
        : TRANSLATORS,
    [translatorFilter]
  );

  const activeGarant = GARANT_TABS.find((tab) => tab.id === garantTab) || GARANT_TABS[0];

  const scrollTo = (event, id) => {
    event.preventDefault();
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <VisaLayout>
      <nav className="visa-nav">
        <div className="nav-inner">
          {GUIDE_ANCHORS.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={(event) => scrollTo(event, id)}>
              {label}
            </a>
          ))}
          <span className="nav-lang">العربية</span>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="visa-card">
          <div className="visa-card-item">
            <span>VISTO NAZIONALE</span>
            <span>Tipo D — Studio</span>
          </div>
          <div className="visa-card-item">
            <span>Anno</span>
            <span>2026/2027</span>
          </div>
          <div className="visa-card-item">
            <span>Durata</span>
            <span>365 giorni</span>
          </div>
          <div className="visa-card-item">
            <span>Ingressi</span>
            <span>MULT</span>
          </div>
        </div>

        <div className="hero-eyebrow with-dot">
          Étudiant tunisien · Année universitaire 2026/2027
        </div>

        <h1>
          De Tunis à <em>l’Italie</em>.
          <br />
          Le guide du visa d’études.
        </h1>

        <p className="hero-lead">
          Tout le parcours, de l’admission jusqu’au titre de séjour : les étapes dans
          l’ordre, la checklist complète, quoi traduire et quoi laisser tel quel, le budget
          réel, et les témoignages de dossiers acceptés en 2026 — y compris un visa accordé
          en 5 jours.
        </p>

        <div className="stats-grid">
          {HERO_STATS.map(([value, label]) => (
            <div className="stat-card" key={label}>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="content">
        {/* 01 PARCOURS */}
        <section className="section" id="parcours">
          <div className="section-header">
            <span className="section-number">01</span>
            <h2>Le parcours en 9 étapes</h2>
          </div>
          <p className="section-intro" style={{ marginBottom: '1.75rem' }}>
            L’ordre compte, et certaines étapes prennent des semaines. Commence tôt : les
            candidatures s’ouvrent dès décembre pour la rentrée suivante.
          </p>
          <div className="steps">
            {PARCOURS_STEPS.map((step, index) => (
              <div className="step" key={step.title}>
                <div className="step-num">{index + 1}</div>
                <div className="step-body">
                  <h3>{step.title}</h3>
                  {(step.paragraphs || []).map((text) => (
                    <StepParagraph key={text} text={text} />
                  ))}
                  {step.note ? <p className="step-note">{step.note}</p> : null}
                  {step.tag ? (
                    <span
                      className={`step-tag${step.tagPink ? ' step-tag-pink' : ''}`}
                    >
                      {step.tag}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 02 CHECKLIST */}
        <section className="section" id="checklist">
          <div className="section-header">
            <span className="section-number">02</span>
            <h2>Checklist — dossier étudiant</h2>
          </div>
          <p className="section-intro" style={{ marginBottom: '1rem' }}>
            Coche au fur et à mesure — ta progression est sauvegardée sur cet appareil.
          </p>
          <div className="checklist-meta">
            <span className="tag tag-translate">
              à traduire{' '}
              <span className="tag-legend-note">traduction italienne + apostille</span>
            </span>
            <span className="tag tag-x2">
              ×2 <span className="tag-legend-note">deux exemplaires</span>
            </span>
            <span className="tag tag-master">
              master <span className="tag-legend-note">si tu postules en master</span>
            </span>
            <span className="tag tag-opt">
              optionnel <span className="tag-legend-note">selon le cas</span>
            </span>
          </div>
          <div className="checklist-progress">
            <span>
              {checkedCount} / {CHECKLIST_TOTAL}
            </span>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(checkedCount / CHECKLIST_TOTAL) * 100}%` }}
              />
            </div>
            <span className="checklist-actions">
              <button type="button" className="btn" onClick={clearAll}>
                Tout décocher
              </button>
              <button
                type="button"
                className="btn btn-pdf"
                onClick={() => downloadChecklistPdf(checks)}
                title="Télécharger la checklist en PDF"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Télécharger PDF
              </button>
            </span>
          </div>

          {CHECKLIST_GROUPS.map((group) => {
            const done = group.items.filter((item) => checks[item.id]).length;
            return (
              <div className="checklist-group" key={group.id}>
                <div className="checklist-group-title">
                  {group.title} — {done}/{group.items.length}
                </div>
                {group.items.map((item) => (
                  <ChecklistItem
                    key={item.id}
                    item={item}
                    checked={Boolean(checks[item.id])}
                    onToggle={toggle}
                  />
                ))}
              </div>
            );
          })}

          <div className="doc-links">
            <Link to="/visa/classement" className="doc-link">
              <div className="doc-link-eyebrow">PDF · A4</div>
              <div className="doc-link-title">Classement officiel des 18 documents</div>
              <div className="doc-link-desc">
                L’ordre exact du dossier au dépôt, avec cases à cocher pour suivre ce qui
                manque.
              </div>
            </Link>
            <Link to="/visa/modeles" className="doc-link">
              <div className="doc-link-eyebrow">3 documents</div>
              <div className="doc-link-title">3 modèles prêts à remplir</div>
              <div className="doc-link-desc">
                Prise en charge (texte officiel), attestation bancaire de blocage, lettre
                de motivation.
              </div>
            </Link>
          </div>
        </section>

        {/* 03 GARANT */}
        <section className="section" id="garant">
          <div className="section-header">
            <span className="section-number">03</span>
            <h2>Dossier du garant</h2>
          </div>
          <p className="section-intro" style={{ marginBottom: '1.25rem' }}>
            La personne qui te prend en charge (parent ou famille jusqu’au 4ᵉ degré) joint
            son dossier financier. Un ou deux garants (père + mère) — les deux
            configurations passent.
          </p>
          <div className="tabs">
            {GARANT_TABS.map((tab) => (
              <button
                type="button"
                key={tab.id}
                className={`tab-btn${tab.id === garantTab ? ' active' : ''}`}
                onClick={() => setGarantTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div>
            <div className="tab-title">{activeGarant.title}</div>
            <div className="checklist-group tight">
              {activeGarant.items.map((item) => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  checked={Boolean(checks[item.id])}
                  onToggle={toggle}
                />
              ))}
            </div>
          </div>
          <div className="common-docs">
            <h4>Commun à tous les profils</h4>
            <ul>
              {GARANT_COMMON_DOCS.map((doc) => (
                <li key={doc}>{doc}</li>
              ))}
            </ul>
          </div>
          <div className="garant-note">
            <p>
              <strong>Famille jusqu’au 4ᵉ degré</strong> : père, mère, frères et sœurs,
              grands-parents, oncles et tantes, cousins germains. Lien prouvé par actes
              d’état civil originaux, traduits, légalisés et apostillés.
            </p>
            <p>
              <strong>Fiches de paie</strong> : officiellement 6 sont parfois demandées ;
              des dossiers sont passés avec 3. Prends 6 si tu peux, par sécurité.
            </p>
          </div>
        </section>

        {/* 04 TRADUCTION */}
        <section className="section" id="traduction">
          <div className="section-header">
            <span className="section-number">04</span>
            <h2>Traduire, apostiller… ou laisser tel quel ?</h2>
          </div>
          <p className="section-intro" style={{ marginBottom: '1.25rem' }}>
            La question qui coûte le plus cher quand on se trompe. Règle générale : les
            documents d’état civil, fiscaux et de propriété se traduisent en italien ; les
            documents bancaires, les réservations et les certificats internationaux restent
            tels quels. Traduction chez un traducteur assermenté ; apostille ~35 DT par
            document.
          </p>
          <div className="translate-grid">
            <div className="translate-col do-translate">
              <h4>⇄ À traduire en italien</h4>
              <p className="translate-col-note">
                + apostille (et légalisation quand indiqué)
              </p>
              <ul>
                {TRANSLATE_YES.map((doc) => (
                  <li key={doc}>{doc}</li>
                ))}
              </ul>
            </div>
            <div className="translate-col no-translate">
              <h4>✓ À laisser tel quel</h4>
              <p className="translate-col-note">
                original ou simple copie, aucune traduction
              </p>
              <ul>
                {TRANSLATE_NO.map((doc) => (
                  <li key={doc}>{doc}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="translate-note">
            La règle simple : les documents administratifs tunisiens se traduisent. Les
            documents bancaires et les réservations restent tels quels.
          </p>
        </section>

        {/* 05 ZOOM */}
        <section className="section" id="zoom">
          <div className="section-header">
            <span className="section-number">05</span>
            <h2>Zoom sur les documents clés</h2>
          </div>
          <p className="section-intro" style={{ marginBottom: '1.5rem' }}>
            Les pièces qui posent le plus de questions, expliquées en clair, avec les
            astuces des dossiers acceptés.
          </p>
          <div className="zoom-grid">
            {ZOOM_CARDS.map((card) => (
              <div className="zoom-card" key={card.title}>
                <div className="zoom-card-eyebrow">{card.eyebrow}</div>
                <h4>{card.title}</h4>
                <div className="zoom-card-meta">{card.meta}</div>
                <p>{card.body}</p>
                <ul>
                  {card.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 06 BUDGET */}
        <section className="section" id="budget">
          <div className="section-header">
            <span className="section-number">06</span>
            <h2>Le budget réel du dossier</h2>
          </div>
          <p className="section-intro" style={{ marginBottom: '1.25rem' }}>
            Prix indicatifs 2026, relevés sur des dossiers réels. Ils varient selon le
            traducteur, l’assureur et le taux de change — prévois une marge.
          </p>
          <table className="budget-table">
            <tbody>
              {BUDGET_ROWS.map(([label, detail, price]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{detail}</td>
                  <td>{price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 08 ERREURS */}
        <section className="section" id="erreurs">
          <div className="section-header">
            <span className="section-number">08</span>
            <h2>Erreurs à éviter au dépôt</h2>
          </div>
          <div className="errors-list">
            {ERREURS.map(([title, detail], index) => (
              <div className="error-item" key={title}>
                <div className="error-num">{index + 1}</div>
                <div className="error-text">
                  <strong>{title}</strong>
                  <span>{detail}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 09 DATES */}
        <section className="section" id="dates">
          <div className="section-header">
            <span className="section-number">09</span>
            <h2>Dates &amp; délais à ne pas rater</h2>
          </div>
          <div className="dates-list">
            {DATES.map(([when, what]) => (
              <div className="date-item" key={what}>
                <span className="date-when">{when}</span>
                <span className="date-what">{what}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 10 REGLES */}
        <section className="section" id="regles">
          <div className="section-header">
            <span className="section-number">10</span>
            <h2>Les règles de l’Ambassade</h2>
          </div>
          <p className="section-intro" style={{ marginBottom: '1.25rem' }}>
            À garder en tête : aucune de ces étapes ne donne automatiquement droit au visa.
          </p>
          <div className="rules-list">
            {REGLES.map((rule) => (
              <div className="rule-item" key={rule}>
                <span className="rule-icon">!</span>
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 11 ADRESSES */}
        <section className="section" id="adresses">
          <div className="section-header">
            <span className="section-number">11</span>
            <h2>Adresses utiles</h2>
          </div>
          <p className="section-intro" style={{ marginBottom: '1.75rem' }}>
            Recommandations non sponsorisées, issues des dossiers acceptés et des listes
            officielles.
          </p>

          <div className="addr-section">
            <h3>Assurance voyage — où la prendre ?</h3>
            <div className="addr-grid">
              {ASSURANCE_ADDRESSES.map((address) => (
                <AddressCard key={address.name} address={address} />
              ))}
            </div>
          </div>

          <div className="addr-section">
            <h3>Billet + hôtel — où réserver ?</h3>
            <div className="addr-grid">
              {VOYAGE_ADDRESSES.map((address) => (
                <AddressCard key={address.name} address={address} />
              ))}
            </div>
          </div>

          <div className="addr-section">
            <h3>Traducteurs assermentés — italien</h3>
            <p className="addr-section-note">
              Liste officielle du ministère de la Justice (langue italienne), classée par
              gouvernorat. Appelle avant de te déplacer : disponibilité, tarif et délai
              varient.
            </p>
            <div className="translators-wrap">
              <div className="filter-tabs">
                {TRANSLATOR_FILTERS.map((filter) => (
                  <button
                    type="button"
                    key={filter.label}
                    className={`filter-btn${
                      filter.value === translatorFilter ? ' active' : ''
                    }`}
                    onClick={() => setTranslatorFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <table className="tr-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Gouvernorat</th>
                  </tr>
                </thead>
                <tbody>
                  {translators.map(([name, gov]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>{gov}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <footer>
        <p>
          Guide visa étudiant Italie 2026/2027 — fait par des étudiants tunisiens, pour des
          étudiants tunisiens.
        </p>
        <p className="footer-fine">
          Recommandations non sponsorisées, à titre indicatif (juillet 2026). Les prix,
          offres et listes évoluent — vérifie toujours avant de payer.
        </p>
        <button
          type="button"
          className="back-top"
          onClick={(event) => scrollTo(event, 'top')}
        >
          ↑ Revenir en haut
        </button>
      </footer>
    </VisaLayout>
  );
}
