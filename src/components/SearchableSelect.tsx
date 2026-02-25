import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, ChevronDown, X } from 'lucide-react';

interface SearchableSelectOption {
  value: string;
  label: string;
  extra?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  className,
  required,
}: SearchableSelectProps) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(o => o.value === value);

  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Hidden input for form required validation */}
      {required && (
        <input
          type="text"
          value={value}
          required
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
      <div
        className="flex items-center w-full p-2 border rounded-md bg-background cursor-pointer min-h-[40px]"
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        {isOpen ? (
          <div className="flex items-center w-full gap-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Digite para buscar..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <span className={cn('text-sm truncate', !selectedOption && 'text-muted-foreground')}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <div className="flex items-center gap-1">
              {value && (
                <X
                  className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={handleClear}
                />
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border bg-popover shadow-lg">
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              Nenhum resultado encontrado
            </div>
          ) : (
            filtered.map((option) => (
              <div
                key={option.value}
                className={cn(
                  'px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground',
                  option.value === value && 'bg-accent text-accent-foreground font-medium'
                )}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
                {option.extra && (
                  <span className="ml-2 text-muted-foreground text-xs">{option.extra}</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
