import { AlertCircle, LoaderCircle, SearchX } from 'lucide-react';
import type { ReactNode } from 'react';

export function WorkspaceState({ kind = 'empty', title, description, children }: { kind?: 'empty' | 'loading' | 'error'; title: string; description: string; children?: ReactNode }) {
  const Icon = kind === 'loading' ? LoaderCircle : kind === 'error' ? AlertCircle : SearchX;
  return <div className={`workspace-state state-${kind}`} role={kind === 'error' ? 'alert' : 'status'} aria-live="polite" aria-busy={kind === 'loading'}>
    <Icon className={kind === 'loading' ? 'state-spinner' : ''}/>
    <h2>{title}</h2><p>{description}</p>
    {children && <div className="state-actions">{children}</div>}
  </div>;
}