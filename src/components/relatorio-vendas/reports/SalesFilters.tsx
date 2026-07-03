import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronDown } from 'lucide-react';
import { SalesFilters as FiltersType } from '@/hooks/useSalesFilter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DateRangeFilter } from './DateRangeFilter';

interface SalesFiltersProps {
  filters: FiltersType;
  onSearchChange: (value: string) => void;
  onToggleValue: (key: 'sellers' | 'channels' | 'paymentMethods', value: string) => void;
  onClearFilter: (key: 'sellers' | 'channels' | 'paymentMethods' | 'dateRange') => void;
  onDateChange?: (dateFrom: Date | undefined, dateTo: Date | undefined) => void;
  sellers: string[];
  channels: string[];
  paymentMethods: string[];
  showDateFilter?: boolean;
}

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}

function MultiSelectFilter({ label, options, selectedValues, onToggle, onClear }: MultiSelectFilterProps) {
  const hasSelection = selectedValues.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-8 text-xs gap-1 ${hasSelection ? 'border-primary' : ''}`}
        >
          {label}
          {hasSelection && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {selectedValues.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {hasSelection && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={onClear}
            >
              Limpar
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-48">
          <div className="space-y-1">
            {options.map(option => (
              <label
                key={option}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={selectedValues.includes(option)}
                  onCheckedChange={() => onToggle(option)}
                  className="h-3.5 w-3.5"
                />
                <span className="text-xs truncate">{option}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function SalesFilters({
  filters,
  onSearchChange,
  onToggleValue,
  onClearFilter,
  onDateChange,
  sellers,
  channels,
  paymentMethods,
  showDateFilter = false,
}: SalesFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <div className="relative flex-1 min-w-[140px] max-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={filters.search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>

      {showDateFilter && onDateChange && (
        <DateRangeFilter
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onDateChange={onDateChange}
          onClear={() => onClearFilter('dateRange')}
        />
      )}

      <MultiSelectFilter
        label="Vendedor"
        options={sellers}
        selectedValues={filters.sellers}
        onToggle={(value) => onToggleValue('sellers', value)}
        onClear={() => onClearFilter('sellers')}
      />

      <MultiSelectFilter
        label="Canal"
        options={channels}
        selectedValues={filters.channels}
        onToggle={(value) => onToggleValue('channels', value)}
        onClear={() => onClearFilter('channels')}
      />

      <MultiSelectFilter
        label="Pagamento"
        options={paymentMethods}
        selectedValues={filters.paymentMethods}
        onToggle={(value) => onToggleValue('paymentMethods', value)}
        onClear={() => onClearFilter('paymentMethods')}
      />
    </div>
  );
}
