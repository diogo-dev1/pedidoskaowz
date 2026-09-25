# Origem da venda no rascunho

## Objetivo
Adicionar ao preenchimento do pedido rascunho um campo obrigatório de origem, com as opções **Recorrência**, **Orgânico**, **Tráfego** e **Presencial**, e registrar a escolha na coluna **L (Origem)** da aba **Vendas Diário**.

## Alterações
- Incluir o seletor **Origem** junto ao vendedor no formulário do rascunho, sempre vazio ao abrir um novo lançamento.
- Validar a escolha antes de criar o rascunho.
- Enviar a origem como atributo do pedido para que permaneça vinculada ao pedido na loja.
- Na sincronização dos pedidos, ler esse atributo e preencher a coluna L; pedidos comuns do site sem essa informação continuarão identificados como **Site**.
- Ampliar somente o intervalo de leitura e gravação do relatório de `B:K` para `B:L`, preservando a deduplicação e a ordem atuais.

## Validação
- Confirmar as quatro opções e a validação no formulário.
- Confirmar que o valor atravessa a criação do rascunho e é reconhecido pela sincronização.
- Verificar o funcionamento em celular e desktop, além da compilação do projeto.
