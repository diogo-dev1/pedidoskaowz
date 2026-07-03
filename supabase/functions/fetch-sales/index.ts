import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Version for cache busting
const VERSION = "v1.0.5";

console.log(`[${VERSION}] Edge function starting`);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Google Sheets public URL for CSV export
const SPREADSHEET_ID = '1gSgwf7vOAHAk7fzA87_9Bo-darg1dSYyAf9lNk2p8pg';
const SHEET_GID = '71481665';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

interface Sale {
  id: string;
  date: string;
  name: string;
  channel: string;
  seller: string;
  value: number;
  paymentMethod: string;
  status: string;
  item: string;
  observation: string;
  coupon: string;
  grupoPedidos: string;
  bling: string;
  controle: string;
}

function isValidDate(dateStr: string): boolean {
  // Check if date matches DD/MM/YYYY format (allow single digits too)
  const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
  return dateRegex.test(dateStr.trim());
}

// Parse localized numbers - handles Brazilian format (1.234,56) and standard format (1,234.56)
function parseLocalizedNumber(value: string): number {
  if (!value || value === '') return 0;

  let str = String(value).trim();

  // Remove currency symbols (R$, $, €, £, ¥) and spaces
  str = str.replace(/[R$\u20AC\u00A3\u00A5\s]/g, '');

  // If empty after cleanup, return 0
  if (!str) return 0;

  // Auto-detect format based on position of last comma and last dot
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');

  // Determine if comma is used as decimal separator
  // Brazilian format: 1.234,56 (comma after dot, or comma with no dot)
  // US format: 1,234.56 (dot after comma, or dot with no comma)
  const isCommaDecimal = lastComma > lastDot;

  if (isCommaDecimal) {
    // Brazilian format: 1.234,56
    // Remove dots (thousand separators), then replace comma with dot
    str = str.replace(/\./g, '').replace(',', '.');
  } else {
    // US format: 1,234.56
    // Just remove commas (thousand separators)
    str = str.replace(/,/g, '');
  }

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100; // Round to 2 decimal places
}

function parseCSV(csv: string): Sale[] {
  // Parse CSV properly handling quoted fields with newlines
  const lines = parseCSVIntoLines(csv);
  if (lines.length < 2) return [];

  // Find the header row by looking for "Data" and "Nome"
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('data') && line.includes('nome') && line.includes('valor')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    console.log('Header row not found, using default index 0');
    headerIndex = 0;
  }

  console.log(`Header found at index ${headerIndex}: ${lines[headerIndex]}`);

  // Parse header to find column indices
  const headerValues = parseCSVLine(lines[headerIndex]);
  const columnMap: Record<string, number> = {};

  headerValues.forEach((header, index) => {
    const lowerHeader = header.toLowerCase().trim();
    if (lowerHeader.includes('data')) columnMap['date'] = index;
    else if (lowerHeader.includes('nome')) columnMap['name'] = index;
    else if (lowerHeader.includes('canal')) columnMap['channel'] = index;
    else if (lowerHeader.includes('vendedor') || lowerHeader === 'c' || lowerHeader === 'v') columnMap['seller'] = index;
    else if (lowerHeader.includes('valor')) columnMap['value'] = index;
    else if (lowerHeader.includes('forma') || lowerHeader.includes('pag')) columnMap['paymentMethod'] = index;
    else if (lowerHeader.includes('status')) columnMap['status'] = index;
    else if (lowerHeader.includes('item') || lowerHeader.includes('produto')) columnMap['item'] = index;
    else if (lowerHeader.includes('obs')) columnMap['observation'] = index;
    else if (lowerHeader.includes('cupom')) columnMap['coupon'] = index;
    else if (lowerHeader.includes('grupo')) columnMap['grupoPedidos'] = index;
    else if (lowerHeader.includes('bling')) columnMap['bling'] = index;
    else if (lowerHeader.includes('controle')) columnMap['controle'] = index;
  });

  console.log('Column mapping:', JSON.stringify(columnMap));

  const sales: Sale[] = [];

  // Expected number of columns based on header
  const expectedColumns = headerValues.length;

  // Process data rows (skip header and everything before it)
  for (let i = headerIndex + 1; i < lines.length; i++) {
    let values = parseCSVLine(lines[i]);

    // Skip empty rows
    const hasData = values.some(v => v.trim() !== '');
    if (!hasData) continue;

    // Pad values array to match expected columns if it's shorter
    // This handles rows where trailing empty cells are omitted in CSV export
    while (values.length < expectedColumns) {
      values.push('');
    }

    // Get date and validate it
    const dateValue = values[columnMap['date'] ?? 0] || '';

    // Skip rows with invalid dates (like "Valor Recebido", "Meta Diária", etc.)
    if (!isValidDate(dateValue)) continue;

    // Only skip if there's no name at all (likely empty row that passed date check somehow)
    const nameValue = values[columnMap['name'] ?? 1] || '';
    if (!nameValue.trim()) continue;

    // Parse value - handle Brazilian currency format (1.234,56 or 1234,56)
    const valueIndex = columnMap['value'] ?? 5;
    const value = parseLocalizedNumber(values[valueIndex] || '0');

    // Get all field values using column mapping
    const channel = values[columnMap['channel'] ?? 3] || '';
    const seller = values[columnMap['seller'] ?? 4] || '';
    const paymentMethod = values[columnMap['paymentMethod'] ?? 6] || '';
    const status = values[columnMap['status'] ?? 7] || '';
    const item = values[columnMap['item'] ?? 9] || '';
    const observation = values[columnMap['observation'] ?? 10] || '';
    const coupon = values[columnMap['coupon'] ?? 11] || '';
    const grupoPedidos = values[columnMap['grupoPedidos'] ?? 12] || '';
    const bling = values[columnMap['bling'] ?? 13] || '';
    const controle = values[columnMap['controle'] ?? 14] || '';

    // Log problematic rows for debugging
    if (!channel || !seller || !item || value === 0) {
      console.log(`Row ${i} potential issue:`, JSON.stringify({
        name: nameValue,
        date: dateValue,
        channel,
        seller,
        item,
        value,
        paymentMethod,
        status,
        valuesCount: values.length,
        expectedColumns,
        rawValues: values,
      }));
    }

    const sale: Sale = {
      id: `sale-${i}`,
      date: dateValue,
      name: nameValue,
      channel: channel,
      seller: seller,
      value: value,
      paymentMethod: paymentMethod,
      status: status,
      item: item,
      observation: observation,
      coupon: coupon,
      grupoPedidos: grupoPedidos,
      bling: bling,
      controle: controle,
    };

    sales.push(sale);
  }

  return sales;
}

// Parse entire CSV into logical lines, handling quoted fields with embedded newlines
function parseCSVIntoLines(csv: string): string[] {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];

    if (char === '"') {
      // Handle escaped quotes ("") inside quoted fields
      if (inQuotes && i + 1 < csv.length && csv[i + 1] === '"') {
        currentLine += '""';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
        currentLine += char;
      }
    } else if (char === '\n' && !inQuotes) {
      // End of logical line
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else if (char === '\r') {
      // Skip carriage returns
      continue;
    } else {
      currentLine += char;
    }
  }

  // Don't forget the last line
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  return lines;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Handle escaped quotes
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cleanValue(current));
      current = '';
    } else {
      current += char;
    }
  }

  result.push(cleanValue(current));
  return result;
}

// Clean cell value - remove invisible characters, trim spaces, normalize
function cleanValue(value: string): string {
  return value
    .trim()
    // Remove common invisible characters
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, '')
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    // Final trim
    .trim();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching data from Google Sheets...');

    const response = await fetch(CSV_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch spreadsheet: ${response.status}`);
    }

    const csvData = await response.text();
    console.log('CSV data received, parsing...');

    const sales = parseCSV(csvData);

    // Calculate and log total for debugging
    const total = sales.reduce((sum, s) => sum + s.value, 0);
    console.log(`Parsed ${sales.length} sales records, Total: R$ ${total.toFixed(2)}`);

    return new Response(JSON.stringify({ sales, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching sales data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
