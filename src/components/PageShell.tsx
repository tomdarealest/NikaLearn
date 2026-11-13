import { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  className?: string;
}

/** Standard page wrapper — respects light/dark theme via CSS variables */
export default function PageShell({ children, className = '' }: PageShellProps) {
  return (
    <div className={`bg-background text-foreground min-h-screen transition-colors duration-300 ${className}`}>
      {children}
    </div>
  );
}
