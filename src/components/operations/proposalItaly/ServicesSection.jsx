import {
  AwardIcon,
  BookOpenIcon,
  CheckIcon,
  FileCheckIcon,
  GlobeIcon,
  LayersIcon,
  PackageIcon,
  SparklesIcon,
  StarIcon,
} from '../../icons.jsx';
import { Card, FieldLabel, SectionTitle, TextInput } from './shared.jsx';

const SERVICE_OPTIONS = [
  { name: 'Admission Standard', icon: FileCheckIcon, color: 'blue', desc: 'University application support' },
  { name: 'Admission Premium', icon: AwardIcon, color: 'violet', desc: 'Priority & dedicated advisor' },
  { name: 'Scholarship', icon: StarIcon, color: 'amber', desc: 'Scholarship search & application' },
  { name: 'Visa Support', icon: GlobeIcon, color: 'emerald', desc: 'Visa documentation & prep' },
  { name: 'Integration', icon: BookOpenIcon, color: 'sky', desc: 'Settling in Italy' },
  { name: 'Standard Pack', icon: PackageIcon, color: 'slate', desc: 'Core services bundle' },
  { name: 'Elite Pack', icon: SparklesIcon, color: 'rose', desc: 'All-inclusive premium bundle' },
];

const COLOR_MAP = {
  blue: { border: 'border-blue-400', bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100' },
  violet: { border: 'border-violet-400', bg: 'bg-violet-50', text: 'text-violet-700', iconBg: 'bg-violet-100' },
  amber: { border: 'border-amber-400', bg: 'bg-amber-50', text: 'text-amber-700', iconBg: 'bg-amber-100' },
  emerald: { border: 'border-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100' },
  sky: { border: 'border-sky-400', bg: 'bg-sky-50', text: 'text-sky-700', iconBg: 'bg-sky-100' },
  slate: { border: 'border-slate-400', bg: 'bg-slate-100', text: 'text-slate-700', iconBg: 'bg-slate-200' },
  rose: { border: 'border-rose-400', bg: 'bg-rose-50', text: 'text-rose-700', iconBg: 'bg-rose-100' },
};

export default function ServicesSection({ data, onChange }) {
  const toggleService = (service) => {
    const current = data.selected || [];
    const updated = current.includes(service) ? current.filter((s) => s !== service) : [...current, service];
    onChange({ ...data, selected: updated });
  };

  return (
    <Card accent="from-amber-500 to-rose-400">
      <div className="flex items-center gap-4 border-b border-border px-6 py-5 sm:px-8 sm:py-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
          <LayersIcon size={18} className="text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Section 6</p>
          <h2 className="text-base font-bold text-text-strong">Services</h2>
        </div>
        {data.selected.length > 0 && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
            {data.selected.length}
          </span>
        )}
      </div>

      <div className="space-y-6 p-6 sm:p-8">
        <div>
          <SectionTitle>Select Services</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SERVICE_OPTIONS.map(({ name, icon: Icon, color, desc }) => {
              const selected = (data.selected || []).includes(name);
              const c = COLOR_MAP[color];
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleService(name)}
                  className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
                    selected ? `${c.border} ${c.bg}` : 'border-border hover:border-border-strong hover:bg-canvas'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      selected ? c.iconBg : 'bg-canvas'
                    }`}
                  >
                    <Icon size={18} className={selected ? c.text : 'text-text-muted'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${selected ? c.text : 'text-text-strong'}`}>{name}</p>
                    <p className="mt-0.5 text-xs text-text-muted">{desc}</p>
                  </div>
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      selected ? `${c.border} ${c.iconBg}` : 'border-border'
                    }`}
                  >
                    {selected && <CheckIcon size={12} className={c.text} />}
                  </div>
                </button>
              );
            })}
          </div>
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
