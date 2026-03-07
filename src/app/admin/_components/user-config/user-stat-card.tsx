type UserStatCardProps = {
  label: string;
  value: number;
  tone?: 'primary' | 'muted';
};

export function UserStatCard({
  label,
  value,
  tone = 'primary',
}: UserStatCardProps) {
  const wrapperClass =
    tone === 'primary'
      ? 'border-[var(--accent)]/20 bg-[var(--accent)]/10'
      : 'border-white/10 bg-white/6';
  const textClass =
    tone === 'primary' ? 'text-[var(--accent)]' : 'text-foreground';

  return (
    <div className={`rounded-[1.25rem] border p-4 ${wrapperClass}`}>
      <div className={`text-2xl font-bold ${textClass}`}>{value}</div>
      <div className={`text-sm ${textClass}`}>{label}</div>
    </div>
  );
}
