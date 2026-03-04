import React from 'react';

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
      ? 'bg-primary/10 border-primary/20'
      : 'bg-card border-border';
  const textClass = tone === 'primary' ? 'text-primary' : 'text-foreground';

  return (
    <div className={`rounded-lg border p-4 ${wrapperClass}`}>
      <div className={`text-2xl font-bold ${textClass}`}>{value}</div>
      <div className={`text-sm ${textClass}`}>{label}</div>
    </div>
  );
}
