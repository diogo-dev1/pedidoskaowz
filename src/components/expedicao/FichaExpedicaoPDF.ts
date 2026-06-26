import jsPDF from 'jspdf';
import type { PedidoComItens } from '@/hooks/usePedidosByLote';

export function gerarFichaExpedicao(pedido: PedidoComItens, expedicao: {
  nome_destinatario?: string | null;
  codigo_rastreio?: string | null;
  tipo_caixa?: string | null;
  transportadora?: string | null;
} | null) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const margin = 15;
  const usable = W - margin * 2;
  let y = margin;

  const addLine = () => { pdf.setDrawColor(200); pdf.line(margin, y, W - margin, y); y += 4; };
  const checkPage = (need: number) => { if (y + need > 280) { pdf.addPage(); y = margin; } };

  // Header
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('KAOWZ FACAS — Ficha de Expedição', W / 2, y, { align: 'center' });
  y += 10;

  // Client info block
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Cliente:', margin, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(expedicao?.nome_destinatario || pedido.cliente_nome, margin + 18, y);
  y += 6;

  const fields = [
    ['NF-e Nº:', '______________________________'],
    ['Código de Rastreamento:', expedicao?.codigo_rastreio || '______________________________'],
    ['Data da Emissão:', new Date().toLocaleDateString('pt-BR')],
    ['Transportadora:', expedicao?.transportadora || 'Correios'],
  ];
  for (const [label, val] of fields) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(val, margin + 45, y);
    y += 5;
  }

  y += 4;
  addLine();

  // Items checklist
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Conferência de Itens', margin, y);
  y += 6;

  const boxSize = 3.5;
  let itemNum = 0;

  for (const item of pedido.pedido_itens) {
    const qty = item.quantidade || 1;
    for (let q = 0; q < qty; q++) {
      itemNum++;
      checkPage(18);

      // Checkbox + item line
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.rect(margin, y - 2.5, boxSize, boxSize);
      const specs = [item.aco, item.acabamento, item.empunhadura ? `(${item.empunhadura})` : null].filter(Boolean).join(' ');
      pdf.text(`FACA.${itemNum}: ${item.modelo || '—'} — ${specs}`, margin + 6, y);
      y += 5;

      // Personalização
      if (item.texto_laser) {
        checkPage(6);
        pdf.rect(margin + 6, y - 2.5, boxSize, boxSize);
        pdf.text(`PERSONALIZAÇÃO: ${item.texto_laser}`, margin + 12, y);
        y += 5;
      }

      // Certificado
      if (pedido.nome_certificado) {
        checkPage(6);
        pdf.rect(margin + 6, y - 2.5, boxSize, boxSize);
        pdf.text(`CERTIFICADO: ${pedido.nome_certificado}`, margin + 12, y);
        y += 5;
      }
    }
  }

  // Caixa
  if (expedicao?.tipo_caixa || pedido.embalagem) {
    checkPage(6);
    pdf.rect(margin, y - 2.5, boxSize, boxSize);
    pdf.text(`CAIXA: ${expedicao?.tipo_caixa || pedido.embalagem || '—'} — ${pedido.cliente_nome}`, margin + 6, y);
    y += 5;
  }

  // Brindes
  if (pedido.brindes) {
    checkPage(6);
    pdf.rect(margin, y - 2.5, boxSize, boxSize);
    pdf.text(`ADICIONAL: ${pedido.brindes}`, margin + 6, y);
    y += 5;
  }

  y += 4;
  addLine();

  // Footer
  checkPage(30);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`N° Total de Itens: ${itemNum}`, margin, y);
  y += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.text('Data do Envio: ____/____/________', margin, y);
  y += 8;
  pdf.text('Assinatura do Responsável: _________________________________________', margin, y);
  y += 8;
  pdf.text(`Data: __/__/__`, margin, y);
  y += 6;

  const col2x = margin + usable / 2;
  pdf.text(`Responsável pela Emissão: ____________________`, col2x, y);
  y += 5;
  pdf.text(`Data Da Emissão: ${new Date().toLocaleDateString('pt-BR')}`, col2x, y);

  // Download
  pdf.save(`Expedicao-${pedido.numero_pedido}.pdf`);
}
