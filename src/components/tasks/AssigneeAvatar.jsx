import Avatar from '../Avatar.jsx';

export default function AssigneeAvatar({ name, size = 32 }) {
  if (!name) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full border border-dashed border-border text-xs text-text-muted"
        style={{ width: size, height: size }}
        title="Non assigné"
      >
        —
      </span>
    );
  }
  return <Avatar fullName={name} seed={name} size={size} />;
}
