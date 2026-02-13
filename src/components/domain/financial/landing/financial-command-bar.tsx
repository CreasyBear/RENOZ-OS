/**
 * FinancialCommandBar Component
 *
 * Command bar for financial landing page (Zone 2).
 * Provides quick search that navigates to invoices list.
 *
 * @see docs/design-system/DOMAIN-LANDING-STANDARDS.md
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface FinancialCommandBarProps {
  /** Placeholder text */
  placeholder?: string;
  /** Additional class names */
  className?: string;
}

/**
 * FinancialCommandBar - Quick search for financial domain
 *
 * Allows users to quickly search invoices and navigate to results.
 * Follows DOMAIN-LANDING-STANDARDS.md command bar pattern.
 */
export function FinancialCommandBar({
  placeholder = 'Search invoices, customers, or orders...',
  className,
}: FinancialCommandBarProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState('');

  // Handle search submission
  const handleSearch = (query: string) => {
    if (!query.trim()) return;

    navigate({
      to: '/financial/invoices',
      search: { search: query.trim() },
    });
  };

  // Global keyboard shortcut: "/" or Cmd+K focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // "/" or Cmd+K focuses search
      if (e.key === '/' || (e.metaKey && e.key === 'k')) {
        // Only focus if not already typing in an input
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }
      // Escape clears and blurs
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setLocalValue('');
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Enter key to submit search
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && localValue.trim()) {
      handleSearch(localValue);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        type="search"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="pl-10 pr-12 min-h-[44px]" // 44px touch target
        aria-label={placeholder}
      />
      <kbd
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded pointer-events-none hidden sm:inline-flex items-center gap-1"
        aria-hidden="true"
      >
        <span className="text-[10px]">⌘</span>K
      </kbd>
    </div>
  );
}
