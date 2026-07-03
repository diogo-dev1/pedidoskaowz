import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';

interface DateRangeFilterProps {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  onDateChange: (dateFrom: Date | undefined, dateTo: Date | undefined) => void;
  onClear: () => void;
}

export function DateRangeFilter({ dateFrom, dateTo, onDateChange, onClear }: DateRangeFilterProps) {
  const hasSelection = dateFrom || dateTo;
  const isMobile = useIsMobile();

  const formatDateDisplay = () => {
    if (dateFrom && dateTo) {
      return `${format(dateFrom, 'dd/MM', { locale: ptBR })} - ${format(dateTo, 'dd/MM', { locale: ptBR })}`;
    }
    if (dateFrom) {
      return `A partir de ${format(dateFrom, 'dd/MM', { locale: ptBR })}`;
    }
    if (dateTo) {
      return `Até ${format(dateTo, 'dd/MM', { locale: ptBR })}`;
    }
    return 'Período';
  };

  const triggerButton = (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        'h-8 text-xs gap-1',
        hasSelection && 'border-primary'
      )}
    >
      <CalendarIcon className="h-3 w-3" />
      {formatDateDisplay()}
    </Button>
  );

  const calendarContent = (
    <div className="flex w-max max-w-full flex-col sm:flex-row">
      <div className="p-2 border-b sm:border-b-0 sm:border-r">
        <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Data inicial</p>
        <Calendar
          mode="single"
          selected={dateFrom}
          onSelect={(date) => onDateChange(date, dateTo)}
          locale={ptBR}
          className={cn("p-1 pointer-events-auto")}
          classNames={{
            month: "space-y-2",
            caption: "flex justify-center pt-1 relative items-center",
            head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.75rem]",
            row: "flex w-full mt-1",
            cell: "h-8 w-8 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: cn("h-8 w-8 p-0 font-normal aria-selected:opacity-100"),
          }}
        />
      </div>
      <div className="p-2">
        <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Data final</p>
        <Calendar
          mode="single"
          selected={dateTo}
          onSelect={(date) => onDateChange(dateFrom, date)}
          locale={ptBR}
          disabled={(date) => dateFrom ? date < dateFrom : false}
          className={cn("p-1 pointer-events-auto")}
          classNames={{
            month: "space-y-2",
            caption: "flex justify-center pt-1 relative items-center",
            head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.75rem]",
            row: "flex w-full mt-1",
            cell: "h-8 w-8 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: cn("h-8 w-8 p-0 font-normal aria-selected:opacity-100"),
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="flex items-center gap-1">
      {isMobile ? (
        <Dialog>
          <DialogTrigger asChild>{triggerButton}</DialogTrigger>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-[360px] max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden p-0 rounded-lg">
            {calendarContent}
          </DialogContent>
        </Dialog>
      ) : (
        <Popover>
          <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
          <PopoverContent
            className="w-auto max-w-[calc(100vw-1rem)] max-h-[var(--radix-popover-content-available-height)] p-0 overflow-y-auto overflow-x-hidden"
            align="center"
            side="bottom"
            sideOffset={8}
            collisionPadding={12}
          >
            {calendarContent}
          </PopoverContent>
        </Popover>
      )}
      {hasSelection && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onClear}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
