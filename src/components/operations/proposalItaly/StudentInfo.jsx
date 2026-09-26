import { UserIcon } from '../../icons.jsx';
import { Card, FieldLabel, TextInput } from './shared.jsx';

export default function StudentInfo({ data, onChange }) {
  return (
    <Card accent="from-indigo-600 to-indigo-400">
      <div className="flex items-center gap-4 border-b border-border px-6 py-5 sm:px-8 sm:py-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
          <UserIcon size={18} className="text-indigo-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Section 2</p>
          <h2 className="text-base font-bold text-text-strong">Student Information</h2>
        </div>
      </div>

      <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
        <div className="space-y-1.5">
          <FieldLabel>
            Full Name <span className="text-red-500">*</span>
          </FieldLabel>
          <TextInput
            placeholder="Student full name"
            value={data.studentName}
            onChange={(e) => onChange({ studentName: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>
            Email <span className="text-red-500">*</span>
          </FieldLabel>
          <TextInput
            type="email"
            placeholder="student@email.com"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Phone</FieldLabel>
          <TextInput
            type="tel"
            placeholder="+216 XX XXX XXX"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Nationality</FieldLabel>
          <TextInput
            placeholder="e.g. Tunisian"
            value={data.nationality}
            onChange={(e) => onChange({ nationality: e.target.value })}
          />
        </div>
      </div>

    </Card>
  );
}
