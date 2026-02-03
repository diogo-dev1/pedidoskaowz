import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface SheetData {
  sheetName: string;
  items: Record<string, string>[];
}

export default function ListaValores() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['price-list'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-price-list');
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data.data as SheetData[];
    },
    staleTime: 5 * 60 * 1000,
  });

  useMemo(() => {
    if (data && data.length > 0 && !activeTab) {
      setActiveTab(data[0].sheetName);
    }
  }, [data, activeTab]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchTerm.trim()) return data;

    // Divide a busca em palavras individuais
    const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(word => word.length > 0);

    return data.map(sheet => ({
      ...sheet,
      items: sheet.items.filter(item => {
        // Junta todos os valores do item em uma única string
        const itemText = Object.values(item).join(' ').toLowerCase();
        // Verifica se TODAS as palavras da busca estão presentes (em qualquer ordem)
        return searchWords.every(word => itemText.includes(word));
      }),
    })).filter(sheet => sheet.items.length > 0);
  }, [data, searchTerm]);

  const getHeaders = (items: Record<string, string>[]) => {
    if (items.length === 0) return [];
    const firstItem = items[0];
    return Object.keys(firstItem).filter(key => key !== '_sheetName');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Carregando valores...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Erro ao carregar: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 space-y-3">
        <h1 className="text-lg font-semibold text-foreground">Lista de Valores</h1>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-sm text-muted-foreground text-center">
            {searchTerm ? 'Nenhum resultado encontrado.' : 'Nenhum dado disponível.'}
          </p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          {/* Tabs com scroll horizontal */}
          <div className="border-b bg-muted/30">
            <ScrollArea className="w-full">
              <TabsList className="inline-flex h-auto p-1 gap-1 bg-transparent w-max">
                {filteredData.map((sheet) => (
                  <TabsTrigger
                    key={sheet.sheetName}
                    value={sheet.sheetName}
                    className="text-xs px-3 py-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap"
                  >
                    {sheet.sheetName}
                    <span className="ml-1.5 text-[10px] opacity-70">
                      ({sheet.items.length})
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
              <ScrollBar orientation="horizontal" className="h-1.5" />
            </ScrollArea>
          </div>

          {/* Conteúdo das tabs */}
          <div className="flex-1 overflow-auto">
            {filteredData.map((sheet) => (
              <TabsContent 
                key={sheet.sheetName} 
                value={sheet.sheetName}
                className="m-0 h-full"
              >
                <div className="divide-y">
                  {sheet.items.map((item, index) => {
                    const headers = getHeaders([item]);
                    const primaryHeader = headers[0];
                    const primaryValue = item[primaryHeader];
                    const secondaryHeaders = headers.slice(1);

                    return (
                      <div 
                        key={index}
                        className="px-4 py-3 bg-background hover:bg-muted/30 transition-colors"
                      >
                        {/* Valor principal */}
                        <div className="font-medium text-sm text-foreground mb-1">
                          {primaryValue || '-'}
                        </div>
                        
                        {/* Valores secundários em grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {secondaryHeaders.map((header) => (
                            <div key={header} className="flex items-baseline gap-1.5 text-xs">
                              <span className="text-muted-foreground truncate">{header}:</span>
                              <span className="text-foreground font-medium truncate">
                                {item[header] || '-'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      )}
    </div>
  );
}