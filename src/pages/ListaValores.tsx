import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set active tab to first sheet when data loads
  useMemo(() => {
    if (data && data.length > 0 && !activeTab) {
      setActiveTab(data[0].sheetName);
    }
  }, [data, activeTab]);

  // Filter items based on search term across all columns
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchTerm.trim()) return data;

    const searchLower = searchTerm.toLowerCase();

    return data.map(sheet => ({
      ...sheet,
      items: sheet.items.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchLower)
        )
      ),
    })).filter(sheet => sheet.items.length > 0);
  }, [data, searchTerm]);

  // Get headers from first item of each sheet
  const getHeaders = (items: Record<string, string>[]) => {
    if (items.length === 0) return [];
    const firstItem = items[0];
    return Object.keys(firstItem).filter(key => key !== '_sheetName');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando lista de valores...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar a lista de valores: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Lista de Valores</h1>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar em todas as abas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredData.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhum resultado encontrado para a busca.' : 'Nenhum dado disponível.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <ScrollArea className="w-full">
            <TabsList className="mb-4 flex-wrap h-auto gap-1 p-1">
              {filteredData.map((sheet) => (
                <TabsTrigger
                  key={sheet.sheetName}
                  value={sheet.sheetName}
                  className="text-xs sm:text-sm"
                >
                  {sheet.sheetName}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({sheet.items.length})
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>

          {filteredData.map((sheet) => (
            <TabsContent key={sheet.sheetName} value={sheet.sheetName}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{sheet.sheetName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {getHeaders(sheet.items).map((header) => (
                            <TableHead key={header} className="whitespace-nowrap font-semibold">
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sheet.items.map((item, index) => (
                          <TableRow key={index}>
                            {getHeaders(sheet.items).map((header) => (
                              <TableCell key={header} className="whitespace-nowrap">
                                {item[header] || '-'}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
