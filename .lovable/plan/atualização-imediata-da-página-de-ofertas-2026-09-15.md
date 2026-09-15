# Atualização imediata da página de ofertas

## Resultado
- Recarregar as ofertas sempre que a página pública abrir, voltar ao primeiro plano ou recuperar o foco.
- Atualizar automaticamente a lista quando uma oferta for criada, editada, ativada, desativada ou excluída no painel.
- Exibir um erro claro caso a consulta pública falhe, em vez de manter dados antigos silenciosamente.

## Implementação
- Centralizar a consulta pública em uma função de carregamento reutilizável.
- Adicionar listeners de foco e visibilidade, removendo-os ao sair da página.
- Assinar mudanças da tabela de ofertas e refazer a consulta após cada mudança.
- Manter o cache geral do restante do app e não alterar catálogo ou painel administrativo.

## Validação
- Editar uma oferta no painel e confirmar a mudança na aba pública já aberta.
- Testar ativação/desativação e atualização após trocar de aba.
- Confirmar compilação sem erros.
