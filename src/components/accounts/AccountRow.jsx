import { useState } from 'react';
import { ACCOUNT_LABEL_COLORS } from '../../lib/config.js';
import {
  CopyIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  PencilIcon,
  TrashIcon,
} from '../icons.jsx';
import AccountForm from './AccountForm.jsx';

export default function AccountRow({
  account,
  onDelete,
  onSave,
  onToast,
  labelChoices = [],
  delegationChoices = [],
}) {
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const color = ACCOUNT_LABEL_COLORS[account.labels[0]] || { bg: '#F1EFE8', text: '#5F5E5A' };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(account.password || '');
      onToast('Mot de passe copié');
    } catch {
      onToast('Copie impossible sur ce navigateur');
    }
  };

  if (editing) {
    return (
      <AccountForm
        account={account}
        labelChoices={labelChoices}
        delegationChoices={delegationChoices}
        onCancel={() => setEditing(false)}
        onSubmit={async (values) => {
          await onSave(values);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
      <span
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color.text }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-strong">
          {account.mailUser || '—'}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-text-muted">
          <span className="select-none">{revealed ? account.password || '—' : '••••••••'}</span>
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            title={revealed ? 'Masquer le mot de passe' : 'Révéler le mot de passe'}
            className="rounded p-0.5 transition hover:bg-canvas hover:text-text-strong"
          >
            {revealed ? <EyeOffIcon size={13} /> : <EyeIcon size={13} />}
          </button>
          <button
            type="button"
            onClick={copyPassword}
            title="Copier le mot de passe"
            className="rounded p-0.5 transition hover:bg-canvas hover:text-text-strong"
          >
            <CopyIcon size={13} />
          </button>
        </div>
        {account.delegation ? (
          <p className="mt-1 truncate text-[11px] text-text-muted">
            Délégation : {account.delegation}
          </p>
        ) : (
          account.labels.includes('Email Candidature') && (
            <p className="mt-1 text-[11px] font-medium text-[#8a5c0f]">
              Sans délégation
            </p>
          )
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {account.link && (
          <a
            href={account.link}
            target="_blank"
            rel="noreferrer"
            title="Ouvrir le portail"
            className="rounded p-1.5 text-text-muted transition hover:bg-canvas hover:text-text-strong"
          >
            <ExternalLinkIcon size={14} />
          </a>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Modifier"
          className="rounded p-1.5 text-text-muted transition hover:bg-canvas hover:text-text-strong"
        >
          <PencilIcon size={14} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Supprimer"
          className="rounded p-1.5 text-text-muted transition hover:bg-red-50 hover:text-red-600"
        >
          <TrashIcon size={14} />
        </button>
      </div>
    </div>
  );
}
