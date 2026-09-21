# Sincronização automática dos pedidos do site

## O que será feito
- Agendar a sincronização existente para rodar automaticamente a cada 1 hora.
- Em cada execução, buscar os pedidos do dia atual, mantendo a proteção já existente contra duplicação no banco e na planilha.
- Manter o botão manual “Sincronizar” funcionando normalmente.
- Confirmar no banco que o agendamento ficou ativo e testar uma execução da sincronização.

## Detalhes técnicos
- Usar o agendador já habilitado no banco para chamar a função `sync-shopify-orders` uma vez por hora.
- Criar apenas um agendamento com nome fixo, evitando cron duplicado caso a configuração seja reaplicada.
- Não alterar o Apps Script nem a lógica atual de gravação na planilha.
