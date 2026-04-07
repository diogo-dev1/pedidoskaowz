// src/services/producaoService.ts

export const enviarParaProducaoManual = async (
  laminas: any[], 
  nomeCliente: string, 
  dataPrazo: string
) => {
  const GOOGLE_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwhmLigrGD-0Aser1uDyJmcGgxxF-54MkQHUx1hS2U-nQvKNy8BQ_WIlg3ulKYIJLT0Mw/exec"; 

  for (const item of laminas) {
    const payload = {
      nome: nomeCliente,
      item: `${item.modelo?.nome_modelo || ''} ${item.bruteForge ? 'Brute Forge' : ''}`.trim(),
      aco: item.aco?.nome_opcao || "-",
      acabamento: item.acabamento?.nome_opcao || "-",
      empunhadura: [
        item.empunhadura?.nome_opcao,
        item.dragonScale ? "Dragon Scale" : null,
        item.espacador ? `Espaçador G10 ${item.espacador.nome_opcao}` : null
      ].filter(Boolean).join(" / "),
      bainha: item.bainha?.nome_opcao || "-",
      corBainha: item.corBainha === "OUTRA" ? item.corBainhaPersonalizada : item.corBainha,
      prazo: dataPrazo,
      observacoes: item.observacoesLamina || "-",
      personalizacao: item.laser 
        ? `LASER: ${item.textoLaser} (${item.localGravacao?.join(', ') || 'Lâmina'})` 
        : "SEM GRAVAÇÃO",
      embalagem: item.embalagem || "Comum"
    };

    try {
      await fetch(GOOGLE_WEBAPP_URL, {
        method: "POST",
        mode: "no-cors", 
        headers: {
          "Content-Type": "text/plain", 
        },
        body: JSON.stringify(payload),
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));
      
    } catch (error) {
      console.error("Erro no fetch:", error);
      throw error;
    }
  }
};
