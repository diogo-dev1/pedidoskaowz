# Lista Avulsa para Upsell

## Objetivo
Criar uma área interna, otimizada para celular, para importar contatos de feiras, preparar mensagens e acompanhar os envios pelo WhatsApp.

## Implementação
- Criar a tabela `upsell_lista_avulsa` com telefone único normalizado, origem, status de envio, observação, índice e acesso exclusivo para usuários autenticados.
- Adicionar em Upsell o botão secundário “Lista avulsa (feira)” sem alterar o restante da página.
- Criar `/upsell-lista-avulsa` dentro da área protegida, seguindo o padrão visual atual.
- Implementar importação tolerante por linha, vírgula ou ponto e vírgula, extração de nome, normalização brasileira e resumo de válidos, inválidos e duplicados antes de salvar.
- Reutilizar os modelos existentes, permitir mensagem livre e substituir `{nome}` com limpeza de pontuação quando o contato não tiver nome.
- Listar contatos por pendentes/enviados/todos, filtrar por origem, abrir WhatsApp, marcar/desmarcar envio, editar observação e excluir.
- Adicionar meta diária persistida no aparelho, aviso ao atingir a meta, progresso geral, limpeza confirmada de enviados e exportação CSV.
- Registrar a nova rota e atualizar os tipos usados pelo aplicativo.

## Validação
- Conferir permissões da tabela e operações de leitura/escrita autenticadas.
- Validar compilação e a página em largura de celular, incluindo importação, filtros e montagem do link do WhatsApp.
