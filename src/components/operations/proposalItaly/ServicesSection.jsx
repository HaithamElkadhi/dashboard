import { CheckIcon, LayersIcon } from '../../icons.jsx';
import { Card, FieldLabel, SectionTitle, TextInput } from './shared.jsx';

export const PHASE_OPTIONS = [
  {
    id: 'phase-1-admission',
    badge: 'PHASE 1',
    badgeClass: 'bg-[#0B1F3A] text-white',
    name: 'Admission',
    price: '1 300 DT',
    subtitle: 'Accès complet',
    steps: [
      { amount: '700 DT', label: 'à la signature', done: true },
      { amount: '600 DT', label: 'une fois accepté(e)', step: 2 },
    ],
  },
  {
    id: 'phase-2-bourse',
    badge: 'PHASE 2',
    badgeClass: 'bg-[#185FA5] text-white',
    name: 'Bourse',
    price: '1 200 DT',
    subtitle: 'Si continuation',
    steps: [
      { amount: '600 DT', label: 'à la décision', done: true },
      { amount: '600 DT', label: 'bourse acceptée et validée', step: 2 },
    ],
  },
  {
    id: 'phase-3-visa',
    badge: 'PHASE 3',
    badgeClass: 'bg-[#3B6D11] text-white',
    name: 'Visa + Intégration',
    price: '500 DT',
    subtitle: 'Si continuation',
    steps: [
      { amount: '200 DT', label: 'avant visa', done: true },
      { amount: '300 DT', label: 'après visa accordé', step: 2 },
    ],
  },
];

export const PACK_OPTION = {
  id: 'pack-tout-inclus',
  badge: 'Pack tout inclus',
  name: 'Admission + Bourse + Visa + Intégration',
  price: '2 300 DT',
  tags: ['Admission', 'Bourse', 'Visa', 'Intégration'],
  note: 'Paiement global — toutes les étapes couvertes dès le départ',
};

function selectionLabel(option) {
  return `${option.name} (${option.price})`;
}

function StepDot({ done, step }) {
  if (done) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckIcon size={12} />
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E6F1FB] text-[11px] font-bold text-[#185FA5]">
      {step}
    </span>
  );
}

export default function ServicesSection({ data, onChange }) {
  const selected = data.selected || [];
  const packLabel = selectionLabel(PACK_OPTION);
  const packSelected = selected.includes(packLabel);

  const togglePhase = (phase) => {
    const label = selectionLabel(phase);
    const withoutPack = selected.filter((s) => s !== packLabel);
    const next = withoutPack.includes(label)
      ? withoutPack.filter((s) => s !== label)
      : [...withoutPack, label];
    onChange({ ...data, selected: next });
  };

  const togglePack = () => {
    if (packSelected) {
      onChange({ ...data, selected: selected.filter((s) => s !== packLabel) });
    } else {
      onChange({ ...data, selected: [packLabel] });
    }
  };

  return (
    <Card accent="from-[#0B1F3A] via-[#185FA5] to-[#F5C518]">
      <div className="flex items-center gap-4 border-b border-border px-6 py-5 sm:px-8 sm:py-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6F1FB]">
          <LayersIcon size={18} className="text-[#185FA5]" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#185FA5]">
            Section 6
          </p>
          <h2 className="text-base font-bold text-text-strong">
            Modèle de paiement JEExpert
          </h2>
          <p className="text-xs text-text-muted">Votre avenir, notre expertise.</p>
        </div>
        {selected.length > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#E6F1FB] px-1.5 text-xs font-bold text-[#185FA5]">
            {selected.length}
          </span>
        )}
      </div>

      <div className="space-y-6 p-6 sm:p-8">
        <div>
          <SectionTitle>Phases (sélection multiple)</SectionTitle>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {PHASE_OPTIONS.map((phase) => {
              const label = selectionLabel(phase);
              const isOn = selected.includes(label);
              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => togglePhase(phase)}
                  className={`flex flex-col rounded-2xl border-2 bg-white p-4 text-left transition ${
                    isOn
                      ? 'border-[#185FA5] shadow-sm ring-2 ring-[#185FA5]/15'
                      : 'border-border hover:border-border-strong'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${phase.badgeClass}`}
                    >
                      {phase.badge}
                    </span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        isOn ? 'border-[#185FA5] bg-[#185FA5] text-white' : 'border-border'
                      }`}
                    >
                      {isOn && <CheckIcon size={12} />}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-[#0B1F3A]">{phase.name}</h3>
                  <p className="mt-1 text-2xl font-extrabold tracking-tight text-[#E8A317]">
                    {phase.price}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">{phase.subtitle}</p>

                  <ul className="mt-4 space-y-2 border-t border-border pt-3">
                    {phase.steps.map((step) => (
                      <li key={step.label} className="flex items-start gap-2 text-sm">
                        <StepDot done={step.done} step={step.step} />
                        <span className="text-[#0B1F3A]">
                          <span className="font-semibold">{step.amount}</span>{' '}
                          <span className="text-text-muted">{step.label}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <SectionTitle>Pack alternatif</SectionTitle>
          <button
            type="button"
            onClick={togglePack}
            className={`w-full rounded-2xl border-2 p-5 text-left transition ${
              packSelected
                ? 'border-[#185FA5] bg-[#F3F8FF] shadow-sm ring-2 ring-[#185FA5]/15'
                : 'border-[#9CC7FF] bg-white hover:border-[#185FA5]'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#E6F1FB] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#185FA5]">
                    {PACK_OPTION.badge}
                  </span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      packSelected
                        ? 'border-[#185FA5] bg-[#185FA5] text-white'
                        : 'border-border'
                    }`}
                  >
                    {packSelected && <CheckIcon size={12} />}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-bold text-[#0B1F3A]">
                  {PACK_OPTION.name}
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PACK_OPTION.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#E6F1FB] px-2.5 py-1 text-xs font-medium text-[#185FA5]"
                    >
                      ✦ {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-text-muted">{PACK_OPTION.note}</p>
              </div>
              <p className="text-3xl font-extrabold tracking-tight text-[#E8A317]">
                {PACK_OPTION.price}
              </p>
            </div>
          </button>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-[#E8D5B0] bg-[#FBF6EC] px-4 py-3 text-sm text-[#854F0B]">
          <span className="mt-0.5 text-base leading-none" aria-hidden>
            ⚠
          </span>
          <p>
            <strong>Visa refusé ?</strong> Remboursement de <strong>1 000 DT</strong> sur
            demande — réservé au <strong>Pack tout inclus</strong>.
          </p>
        </div>

        <div className="space-y-1.5">
          <FieldLabel>Note</FieldLabel>
          <TextInput
            placeholder="Any additional notes about services…"
            value={data.note}
            onChange={(e) => onChange({ ...data, note: e.target.value })}
          />
        </div>
      </div>
    </Card>
  );
}
