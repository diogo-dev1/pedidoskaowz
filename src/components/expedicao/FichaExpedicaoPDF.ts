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
  const indent1 = margin + 6;
  const indent2 = margin + 12;
  let itemNum = 0;

  const subLine = (label: string, value: string) => {
    checkPage(5);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text(`${label}: `, indent2, y);
    const labelW = pdf.getTextWidth(`${label}: `);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, indent2 + labelW, y);
    y += 4.5;
  };

  for (const item of pedido.pedido_itens) {
    const qty = item.quantidade || 1;
    for (let q = 0; q < qty; q++) {
      itemNum++;
      checkPage(40);

      // Título da faca (checkbox + modelo)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.rect(margin, y - 2.5, boxSize, boxSize);
      pdf.text(`FACA.${itemNum}: ${item.modelo || '—'}`, indent1, y);
      y += 5;

      // Detalhes completos da lâmina
      pdf.setFontSize(8);
      if (item.aco) subLine('Aço', item.aco);
      if (item.acabamento) subLine('Acabamento', item.acabamento);
      if (item.empunhadura) subLine('Empunhadura', item.empunhadura);
      if (item.brute_forge) subLine('Brute Forge', 'Sim');
      if (item.dragon_scale) subLine('Dragon Scale', 'Sim');
      if (item.bainha) subLine('Bainha', `${item.bainha}${item.cor_bainha ? ` — ${item.cor_bainha}` : ''}`);
      else if (item.cor_bainha) subLine('Cor Bainha', item.cor_bainha);
      if (item.embalagem_item) subLine('Embalagem', item.embalagem_item);

      // Personalização / Laser
      if (item.texto_laser) {
        checkPage(5);
        pdf.rect(indent1, y - 2.5, boxSize, boxSize);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(`PERSONALIZAÇÃO: ${item.texto_laser}${item.posicao_laser ? ` (${item.posicao_laser})` : ''}`, indent2 + 6, y);
        y += 5;
      }

      // Observações do item
      if (item.observacoes_item) {
        checkPage(5);
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7.5);
        const obsLines = pdf.splitTextToSize(`OBS: ${item.observacoes_item}`, usable - 20);
        for (const line of obsLines) {
          checkPage(4.5);
          pdf.text(line, indent2, y);
          y += 4;
        }
        pdf.setFont('helvetica', 'normal');
      }

      // Certificado
      if (pedido.nome_certificado) {
        checkPage(5);
        pdf.rect(indent1, y - 2.5, boxSize, boxSize);
        pdf.setFontSize(8);
        pdf.text(`CERTIFICADO: ${pedido.nome_certificado}`, indent2 + 6, y);
        y += 5;
      }

      // Separador entre itens
      y += 2;
      pdf.setDrawColor(230);
      pdf.line(indent1, y, W - margin, y);
      y += 3;
    }
  }

  // Caixa
  if (expedicao?.tipo_caixa || pedido.embalagem) {
    checkPage(6);
    pdf.setFontSize(9);
    pdf.rect(margin, y - 2.5, boxSize, boxSize);
    pdf.text(`CAIXA: ${expedicao?.tipo_caixa || pedido.embalagem || '—'} — ${pedido.cliente_nome}`, indent1, y);
    y += 5;
  }

  // Brindes / Adicionais
  if (pedido.brindes) {
    checkPage(6);
    pdf.rect(margin, y - 2.5, boxSize, boxSize);
    pdf.text(`ADICIONAL: ${pedido.brindes}`, indent1, y);
    y += 5;
  }

  // Observações gerais do pedido
  if (pedido.observacao) {
    checkPage(10);
    y += 2;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('Observações do Pedido:', margin, y);
    y += 4;
    pdf.setFont('helvetica', 'normal');
    const obsLines = pdf.splitTextToSize(pedido.observacao, usable);
    for (const line of obsLines) {
      checkPage(4.5);
      pdf.text(line, margin, y);
      y += 4;
    }
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
