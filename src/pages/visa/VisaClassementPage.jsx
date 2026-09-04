import { Link } from 'react-router-dom';
import VisaLayout from './VisaLayout.jsx';
import useChecks from './useChecks.js';
import { CLASSEMENT_DOCS } from './data.js';

const STORAGE_KEY = 'visa-classement';

function docId(index) {
  return `d${index + 1}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function downloadClassementPdf(checks) {
  const total = CLASSEMENT_DOCS.length;
  let done = 0;

  const rows = CLASSEMENT_DOCS.map((doc, index) => {
    const checked = Boolean(checks[docId(index)]);
    if (checked) done += 1;
    return `
      <div class="row${checked ? ' done' : ''}">
        <div class="num">${index + 1}</div>
        <div class="box">${checked ? '✓' : ''}</div>
        <div>
          <div class="title">${escapeHtml(doc.title)}</div>
          <div class="sub">${escapeHtml(doc.sub)}</div>
        </div>
      </div>`;
  }).join('');

  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Classement des documents — visa Italie ${done}/${total}</title>
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
    border-bottom: 2px solid #1a6b3c; padding-bottom: 10px; margin-bottom: 14px;
  }
  .header h1 { font-size: 18px; font-weight: 700; line-height: 1.25; }
  .header h1 span { color: #1a6b3c; }
  .meta { text-align: right; font-size: 11px; color: #666; }
  .meta strong { display: block; color: #1a1a1a; font-size: 13px; margin-bottom: 2px; }
  .lead { font-size: 11px; color: #666; margin-bottom: 14px; }
  .row {
    display: grid; grid-template-columns: 28px 14px 1fr; gap: 8px;
    padding: 7px 0; border-bottom: 1px solid #f0f0ec; align-items: start;
  }
  .num {
    font-size: 14px; font-weight: 700; color: #c8c8c4; text-align: right;
    font-variant-numeric: tabular-nums; line-height: 1.2; padding-top: 1px;
  }
  .row.done .num { color: #1a6b3c; }
  .box {
    width: 12px; height: 12px; margin-top: 2px;
    border: 1.5px solid #1a6b3c; border-radius: 2px;
    font-size: 9px; line-height: 10px; text-align: center; color: #1a6b3c;
  }
  .row.done .title { text-decoration: line-through; color: #888; }
  .row.done { opacity: .7; }
  .title { font-size: 11.5px; font-weight: 600; line-height: 1.35; }
  .sub { font-size: 10px; color: #666; margin-top: 1px; }
  .extra {
    margin-top: 12px; padding: 8px 10px; border: 1px solid #e2e2de; border-radius: 6px;
    font-size: 11px;
  }
  .extra strong { display: block; margin-bottom: 2px; }
  .extra span { color: #666; font-size: 10px; }
  .footer {
    margin-top: 14px; padding-top: 8px; border-top: 1px solid #e2e2de;
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
      <h1>Classement des <span>18 documents</span></h1>
      <div style="font-size:11px;color:#666;margin-top:3px;">Studio Immatricolazione · Italie · 2026/2027</div>
    </div>
    <div class="meta">
      <strong>${done} / ${total}</strong>
      ${today}
    </div>
  </div>
  <p class="lead">Ordre exact du dossier au dépôt ALMAVIVA / AVS — Ambassade d’Italie à Tunis.</p>
  ${rows}
  <div class="extra">
    <strong>+ Une photo d’identité récente</strong>
    <span>Norme ICAO, moins de ~6 mois.</span>
  </div>
  <div class="footer">Source : classement affiché au centre de dépôt, campagne 2026/2027. En cas de divergence, l’affichage du centre et l’Ambassade font foi.</div>
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

function PdfIcon() {
  return (
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
  );
}

export default function VisaClassementPage() {
  const { checks, toggle, clearAll } = useChecks(STORAGE_KEY);

  const total = CLASSEMENT_DOCS.length;
  const done = CLASSEMENT_DOCS.filter((_, index) => checks[docId(index)]).length;

  return (
    <VisaLayout narrow>
      <div className="topbar">
        <div className="topbar-inner">
          <Link to="/visa#checklist" className="back-link">
            ← Revenir au guide
          </Link>
        </div>
      </div>

      <div className="hero hero-compact">
        <div className="hero-eyebrow">Dépôt ALMAVIVA / AVS · 2026/2027</div>
        <h1>Classement des documents</h1>
        <p className="hero-lead">
          Les 18 pièces dans l’ordre exact du dépôt. Coche au fur et à mesure — sauvegardé
          sur cet appareil.
        </p>
      </div>

      <div className="content">
        <div className="progress-bar-wrap">
          <span>
            {done} / {total}
          </span>
          <div className="pbar">
            <div className="pfill" style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <span className="checklist-actions">
            <button type="button" className="btn" onClick={clearAll}>
              Tout décocher
            </button>
            <button
              type="button"
              className="btn btn-pdf"
              onClick={() => downloadClassementPdf(checks)}
              title="Télécharger le classement en PDF"
            >
              <PdfIcon />
              Télécharger PDF
            </button>
          </span>
        </div>

        <div className="doc-list">
          {CLASSEMENT_DOCS.map((doc, index) => {
            const id = docId(index);
            const checked = Boolean(checks[id]);
            const handleKeyDown = (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggle(id);
              }
            };
            return (
              <div
                key={id}
                className={`doc-item${checked ? ' checked' : ''}`}
                role="button"
                tabIndex={0}
                aria-pressed={checked}
                onClick={() => toggle(id)}
                onKeyDown={handleKeyDown}
              >
                <div className="doc-num">{index + 1}</div>
                <input type="checkbox" checked={checked} readOnly tabIndex={-1} />
                <div>
                  <div className="doc-title">{doc.title}</div>
                  <div className="doc-sub">{doc.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="doc-extra">
          <div className="doc-extra-title">+ Une photo d’identité récente</div>
          <p>Norme ICAO, moins de ~6 mois.</p>
        </div>

        <div className="source-note">
          Source : classement affiché au centre de dépôt, campagne 2026/2027.
        </div>
      </div>
    </VisaLayout>
  );
}
