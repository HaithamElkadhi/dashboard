import { Link } from 'react-router-dom';
import { UsersIcon, ChevronRightIcon } from '../components/icons.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function HumanResourcesPage() {
  const { user } = useAuth();
  if (!user?.isAdmin) return <p className="p-6" role="alert">Accès réservé aux administrateurs.</p>;
  return <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
    <p className="mb-1 text-sm text-text-muted">Retrouvez vos outils de gestion des ressources humaines.</p>
    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Link to="/human-resources/recruitment" className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-border-strong hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
        <div className="flex items-center justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand"><UsersIcon size={18} /></span>
          <ChevronRightIcon size={18} className="text-text-muted" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-text-strong">Candidatures</h2>
          <p className="mt-1 text-xs text-text-muted">Consultez les profils et les CV, suivez les contacts et gérez les décisions de recrutement.</p>
        </div>
      </Link>
    </div>
  </div>;
}
