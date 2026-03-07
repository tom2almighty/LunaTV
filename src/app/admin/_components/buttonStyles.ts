const base =
  'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none';

export const inputStyles = {
  base: `app-control w-full rounded-2xl border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-[var(--accent)] focus:ring-0`,
  select: `app-control w-full rounded-2xl border px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-[var(--accent)] focus:ring-0`,
  checkbox:
    'h-4 w-4 rounded border border-white/20 bg-white/6 text-[var(--accent)] focus:ring-0',
  dropdownTrigger: `app-control w-full rounded-2xl border px-3 py-2.5 pr-10 text-left text-sm text-foreground outline-none transition-all duration-200 focus:border-[var(--accent)] focus:ring-0`,
  textareaBase: `app-control w-full resize-none rounded-2xl border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-[var(--accent)] focus:ring-0`,
};

export const buttonStyles = {
  primary: `${base} rounded-2xl bg-[var(--accent)] px-4 py-2.5 text-sm text-black hover:opacity-92`,
  secondary: `${base} rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 text-sm text-foreground hover:bg-white/10`,
  danger: `${base} rounded-2xl bg-destructive px-4 py-2.5 text-sm text-destructive-foreground hover:bg-destructive/90`,
  disabled: `${base} rounded-2xl bg-white/6 px-4 py-2.5 text-sm text-muted-foreground opacity-50 cursor-not-allowed`,

  primarySmall: `${base} rounded-xl bg-[var(--accent)] px-2.5 py-1.5 text-xs text-black hover:opacity-92`,
  secondarySmall: `${base} rounded-xl border border-white/10 bg-white/6 px-2.5 py-1.5 text-xs text-foreground hover:bg-white/10`,
  dangerSmall: `${base} rounded-xl bg-destructive px-2.5 py-1.5 text-xs text-destructive-foreground hover:bg-destructive/90`,
  disabledSmall: `${base} rounded-xl bg-white/6 px-2.5 py-1.5 text-xs text-muted-foreground opacity-50 cursor-not-allowed`,

  roundedPrimary: `${base} rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-3 py-1 text-xs text-[var(--accent)] hover:bg-[var(--accent)]/16`,
  roundedSecondary: `${base} rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-muted-foreground hover:bg-white/10`,
  roundedDanger: `${base} rounded-full border border-destructive/25 bg-destructive/10 px-3 py-1 text-xs text-destructive hover:bg-destructive/16`,
  roundedWarning: `${base} rounded-full border border-warning/25 bg-warning/10 px-3 py-1 text-xs text-warning hover:bg-warning/16`,
  roundedPurple: `${base} rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-3 py-1 text-xs text-[var(--accent)] hover:bg-[var(--accent)]/16`,
  roundedSuccess: `${base} rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-3 py-1 text-xs text-[var(--accent)] hover:bg-[var(--accent)]/16`,

  quickAction: `${base} rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground`,

  toggleOn: 'bg-[var(--accent)]/55',
  toggleOff: 'bg-white/10',
  toggleThumb: 'bg-white border border-white/10',
  toggleThumbOn: 'translate-x-6',
  toggleThumbOff: 'translate-x-1',
};
