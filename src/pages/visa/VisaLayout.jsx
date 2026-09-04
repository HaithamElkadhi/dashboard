import { Link, useLocation } from 'react-router-dom';
import './visa.css';

const SUBNAV = [
  { path: '/visa', label: 'Guide' },
  { path: '/visa/classement', label: 'Classement' },
  { path: '/visa/modeles', label: 'Modèles' },
];

/**
 * Shell for every visa page: owns the scroll container, the module stylesheet
 * and the sticky Guide / Classement / Modèles switcher.
 */
export default function VisaLayout({ children, narrow = false }) {
  const { pathname } = useLocation();

  return (
    <div
      className={`visa-page${narrow ? ' narrow' : ''} h-full overflow-y-auto scroll-thin`}
    >
      <div className="visa-subnav">
        <div className="visa-subnav-inner">
          {SUBNAV.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={pathname === item.path ? 'active' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
