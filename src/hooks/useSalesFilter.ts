import { useState, useMemo } from 'react';
import { Sale } from '@/types/sales';

export interface SalesFilters {
  search: string;
  sellers: string[];
  channels: string[];
  paymentMethods: string[];
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

export function useSalesFilter(sales: Sale[]) {
  const [filters, setFilters] = useState<SalesFilters>({
    search: '',
    sellers: [],
    channels: [],
    paymentMethods: [],
    dateFrom: undefined,
    dateTo: undefined,
  });

  const [sortField, setSortField] = useState<keyof Sale>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Get unique values for filters
  const sellers = useMemo(() => [...new Set(sales.map(s => s.seller).filter(Boolean))].sort(), [sales]);
  const channels = useMemo(() => [...new Set(sales.map(s => s.channel).filter(Boolean))].sort(), [sales]);
  const paymentMethods = useMemo(() => [...new Set(sales.map(s => s.paymentMethod).filter(Boolean))].sort(), [sales]);

  // Parse date from DD/MM/YYYY format
  const parseDate = (dateStr: string): Date => {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  // Filter and sort sales
  const filteredSales = useMemo(() => {
    return sales
      .filter(sale => {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          sale.name.toLowerCase().includes(searchLower) ||
          sale.item.toLowerCase().includes(searchLower) ||
          sale.seller.toLowerCase().includes(searchLower);
        const matchesSeller = filters.sellers.length === 0 || filters.sellers.includes(sale.seller);
        const matchesChannel = filters.channels.length === 0 || filters.channels.includes(sale.channel);
        const matchesPayment = filters.paymentMethods.length === 0 || filters.paymentMethods.includes(sale.paymentMethod);

        // Date range filter
        let matchesDateRange = true;
        if (filters.dateFrom || filters.dateTo) {
          const saleDate = parseDate(sale.date);
          saleDate.setHours(0, 0, 0, 0);

          if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            if (saleDate < fromDate) matchesDateRange = false;
          }

          if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            if (saleDate > toDate) matchesDateRange = false;
          }
        }

        return matchesSearch && matchesSeller && matchesChannel && matchesPayment && matchesDateRange;
      })
      .sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        if (sortField === 'value') {
          return sortDirection === 'asc'
            ? (aValue as number) - (bValue as number)
            : (bValue as number) - (aValue as number);
        }

        if (sortField === 'date') {
          const [dayA, monthA, yearA] = (aValue as string).split('/').map(Number);
          const [dayB, monthB, yearB] = (bValue as string).split('/').map(Number);
          const dateA = new Date(yearA, monthA - 1, dayA);
          const dateB = new Date(yearB, monthB - 1, dayB);
          return sortDirection === 'asc'
            ? dateA.getTime() - dateB.getTime()
            : dateB.getTime() - dateA.getTime();
        }

        return sortDirection === 'asc'
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      });
  }, [sales, filters, sortField, sortDirection]);

  const handleSort = (field: keyof Sale) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleFilterValue = (key: 'sellers' | 'channels' | 'paymentMethods', value: string) => {
    setFilters(prev => {
      const currentValues = prev[key];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return { ...prev, [key]: newValues };
    });
  };

  const setSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const setDateRange = (dateFrom: Date | undefined, dateTo: Date | undefined) => {
    setFilters(prev => ({ ...prev, dateFrom, dateTo }));
  };

  const clearFilter = (key: 'sellers' | 'channels' | 'paymentMethods' | 'dateRange') => {
    if (key === 'dateRange') {
      setFilters(prev => ({ ...prev, dateFrom: undefined, dateTo: undefined }));
    } else {
      setFilters(prev => ({ ...prev, [key]: [] }));
    }
  };

  const hasActiveFilters = filters.search !== '' ||
    filters.sellers.length > 0 ||
    filters.channels.length > 0 ||
    filters.paymentMethods.length > 0 ||
    filters.dateFrom !== undefined ||
    filters.dateTo !== undefined;

  return {
    filters,
    setSearch,
    setDateRange,
    toggleFilterValue,
    clearFilter,
    filteredSales,
    sortField,
    sortDirection,
    handleSort,
    sellers,
    channels,
    paymentMethods,
    hasActiveFilters,
  };
}
