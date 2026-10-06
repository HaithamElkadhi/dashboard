import { Link } from 'react-router-dom';
import { GraduationCapIcon } from '../components/icons.jsx';

const TOOLS = [
  {
    to: '/operations/integration',
    icon: GraduationCapIcon,
    title: 'Integration',
    desc: 'Follow arrival and settlement steps for students in Italy.',
  },
  {
    to: '/operations/admission-documents',
    icon: GraduationCapIcon,
    title: 'Admission documents',
    desc: 'Select a prospect and add required admission documents.',
  },
  {
    icon: GraduationCapIcon,
    title: 'Scholarship documents',
    desc: 'Manage requested scholarship documents.',
    comingSoon: true,
  },
  {
    to: '/operations/application',
    icon: GraduationCapIcon,
    title: 'Application',
    desc: 'Select a prospect, record a university application and review existing candidatures.',
  },
  {
    to: '/operations/proposal-italy',
    icon: GraduationCapIcon,
    title: 'Proposal — Italy',
    desc: 'Build and send study-abroad proposals for Italy, then export as PDF.',
  },
];

export default function OperationsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
      <p className="mb-1 text-sm text-text-muted">Internal tools used day to day, gathered in one place.</p>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link
            key={tool.title}
            to={tool.to || '#'}
            aria-disabled={tool.comingSoon || undefined}
            onClick={event => { if (tool.comingSoon) event.preventDefault(); }}
            className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-border-strong hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <tool.icon size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-strong">{tool.title}</h2>
              <p className="mt-1 text-xs text-text-muted">{tool.desc}</p>
              {tool.comingSoon && <span className="mt-3 inline-block rounded-full bg-canvas px-3 py-1 text-xs text-text-muted">Coming soon</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
