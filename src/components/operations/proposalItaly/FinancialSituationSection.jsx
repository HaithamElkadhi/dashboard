import { WalletIcon } from '../../icons.jsx';
import { Card, CardHeader, FieldLabel, Select, TextInput } from './shared.jsx';

const FINANCING_PLAN_OPTIONS = [
  { value: 'scholarship-only', label: 'Fully dependent on scholarship' },
  { value: 'scholarship-plus-personal', label: 'Scholarship + personal funds' },
  { value: 'personal-family-only', label: 'Personal / family funds only' },
  { value: 'not-sure-yet', label: 'Not sure yet' },
];

const YES_NO_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const FINANCIAL_GUARANTOR_OPTIONS = [
  { value: 'self', label: 'Self' },
  { value: 'parent', label: 'Parent' },
  { value: 'relative', label: 'Relative' },
  { value: 'sponsor', label: 'Sponsor' },
];

const APPLICATION_FEES_PREFERENCE_OPTIONS = [
  { value: 'separate', label: 'I can pay application fees separately' },
  { value: 'include-in-service', label: 'Include fees in the service package' },
];

export default function FinancialSituationSection({ data, onChange }) {
  return (
    <Card accent="from-emerald-600 to-teal-400">
      <CardHeader
        icon={WalletIcon}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        sectionLabel="Section 5"
        title="Financial Situation"
        hint="Funding strategy and visa financial readiness."
      />

      <div className="space-y-6 p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <FieldLabel>How will you finance your studies?</FieldLabel>
            <Select
              options={FINANCING_PLAN_OPTIONS}
              placeholder="Select financing plan"
              value={data.financingPlan || ''}
              onChange={(e) => onChange({ ...data, financingPlan: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel>Who will be your financial guarantor?</FieldLabel>
            <Select
              options={FINANCIAL_GUARANTOR_OPTIONS}
              placeholder="Select guarantor"
              value={data.financialGuarantor || ''}
              onChange={(e) => onChange({ ...data, financialGuarantor: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel>Can you provide a blocked account?</FieldLabel>
            <Select
              options={YES_NO_OPTIONS}
              placeholder="Select answer"
              value={data.blockedAccount || ''}
              onChange={(e) => onChange({ ...data, blockedAccount: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel>Do you have financial support from abroad?</FieldLabel>
            <Select
              options={YES_NO_OPTIONS}
              placeholder="Select answer"
              value={data.hasAbroadSupport || ''}
              onChange={(e) =>
                onChange({
                  ...data,
                  hasAbroadSupport: e.target.value,
                  abroadSupportDetails: e.target.value === 'yes' ? data.abroadSupportDetails : '',
                })
              }
            />
          </div>
        </div>

        {data.hasAbroadSupport === 'yes' && (
          <div className="space-y-1.5">
            <FieldLabel>Specify country and relation</FieldLabel>
            <TextInput
              placeholder="e.g. France – uncle"
              value={data.abroadSupportDetails}
              onChange={(e) => onChange({ ...data, abroadSupportDetails: e.target.value })}
            />
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <FieldLabel>Application fees preference</FieldLabel>
            <Select
              options={APPLICATION_FEES_PREFERENCE_OPTIONS}
              placeholder="Select preference"
              value={data.applicationFeesPreference || ''}
              onChange={(e) => onChange({ ...data, applicationFeesPreference: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel>Available budget (€)</FieldLabel>
            <TextInput
              type="number"
              placeholder="e.g. 5000"
              value={data.projectBudget}
              onChange={(e) => onChange({ ...data, projectBudget: e.target.value })}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
