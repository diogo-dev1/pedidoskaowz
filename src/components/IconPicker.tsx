import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AVAILABLE_ICONS, getIconComponent } from '@/lib/icon-utils';
import { Search } from 'lucide-react';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const SelectedIcon = getIconComponent(value);
  const filtered = AVAILABLE_ICONS.filter(name =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-10 w-10 p-0"
        onClick={() => setOpen(true)}
        title="Selecionar ícone"
      >
        <SelectedIcon className="h-5 w-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Selecionar ícone</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar ícone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
          <div className="grid grid-cols-8 gap-1 max-h-64 overflow-y-auto">
            {filtered.map(name => {
              const Icon = getIconComponent(name);
              return (
                <button
                  key={name}
                  type="button"
                  className={`p-2 rounded-md hover:bg-muted transition-colors ${
                    value === name ? 'bg-accent text-accent-foreground' : ''
                  }`}
                  onClick={() => { onChange(name); setOpen(false); }}
                  title={name}
                >
                  <Icon className="h-4 w-4 mx-auto" />
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
