import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  children?: ReactNode;
  action?: ReactNode;
};

export function PageHeader({ title, description, children, action }: Props) {
  return (
    <div className="anim-slide-up flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        {action}
        {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
