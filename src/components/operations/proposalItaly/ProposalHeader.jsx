import { CalendarIcon } from '../../icons.jsx';
import { Card, CardHeader, FieldLabel, TextInput } from './shared.jsx';

export default function ProposalHeader({ data, onChange }) {
  return (
    <Card accent="from-brand to-blue-400">
      <CardHeader
        icon={CalendarIcon}
        iconBg="bg-brand/10"
        iconColor="text-brand"
        sectionLabel="Section 1"
        title="Proposal Information"
        hint="Set the date and validity window."
      />
      <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
        <div className="space-y-1.5">
          <FieldLabel>Proposal Date</FieldLabel>
          <TextInput
            type="date"
            value={data.proposalDate}
            onChange={(e) => onChange({ proposalDate: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>
            Valid Until <span className="font-normal normal-case tracking-normal text-text-muted">(optional)</span>
          </FieldLabel>
          <TextInput
            type="date"
            value={data.validUntil}
            onChange={(e) => onChange({ validUntil: e.target.value })}
          />
        </div>
      </div>
    </Card>
  );
}
