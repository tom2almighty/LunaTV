// 统一按钮 & 表单样式系统
// 原则：primary = 主要操作，secondary = 次要/取消，danger = 破坏性操作，ghost = 轻量操作

const base =
  'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none';

export const inputStyles = {
  base: `${base} border-border bg-card text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors`,
  select: `border-border bg-card text-foreground w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors`,
  checkbox: `text-primary bg-card border-border focus:ring-primary/30 h-4 w-4 rounded focus:ring-2`,
  dropdownTrigger: `border-border bg-card text-foreground hover:border-primary/50 w-full rounded-lg border px-3 py-2.5 pr-10 text-left text-sm transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30`,
  textareaBase: `border-border bg-card text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors resize-none`,
};

export const buttonStyles = {
  // ── 实心按钮（标准尺寸）──
  primary: `${base} px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90`,
  secondary: `${base} px-3 py-1.5 text-sm rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80`,
  danger: `${base} px-3 py-1.5 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90`,
  disabled: `${base} px-3 py-1.5 text-sm rounded-lg bg-muted text-muted-foreground opacity-50 cursor-not-allowed`,

  // ── 实心按钮（小尺寸）──
  primarySmall: `${base} px-2 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90`,
  secondarySmall: `${base} px-2 py-1 text-xs rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80`,
  dangerSmall: `${base} px-2 py-1 text-xs rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90`,
  disabledSmall: `${base} px-2 py-1 text-xs rounded-md bg-muted text-muted-foreground opacity-50 cursor-not-allowed`,

  // ── 圆角 badge 式按钮 ──
  roundedPrimary: `${base} px-3 py-1 rounded-full text-xs bg-primary/10 text-primary hover:bg-primary/20`,
  roundedSecondary: `${base} px-3 py-1 rounded-full text-xs bg-muted text-muted-foreground hover:bg-muted/80`,
  roundedDanger: `${base} px-3 py-1 rounded-full text-xs bg-destructive/10 text-destructive hover:bg-destructive/20`,
  roundedWarning: `${base} px-3 py-1 rounded-full text-xs bg-warning/10 text-warning hover:bg-warning/20`,
  // 原 roundedPurple（设为管理）→ 改用 primary 变体
  roundedPurple: `${base} px-3 py-1 rounded-full text-xs bg-primary/10 text-primary hover:bg-primary/20`,
  // 原 roundedSuccess（解封）→ 语义上是"恢复正常"，用 primary
  roundedSuccess: `${base} px-3 py-1 rounded-full text-xs bg-primary/10 text-primary hover:bg-primary/20`,

  // ── 轻量操作按钮 ──
  quickAction: `${base} px-3 py-1.5 text-xs rounded-md text-muted-foreground bg-card border border-border hover:bg-muted`,

  // ── Toggle ──
  toggleOn: 'bg-primary',
  toggleOff: 'bg-muted',
  toggleThumb: 'bg-white dark:bg-card',
  toggleThumbOn: 'translate-x-6',
  toggleThumbOff: 'translate-x-1',
};
