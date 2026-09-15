# Novidades e Ofertas — condições separadas e card compacto

## Resultado
- Manter `/ofertas` pública e `/admin/ofertas` protegida, com o acesso administrativo no menu lateral usando o ícone Tag.
- Separar Pix, parcelamento e selos no cadastro de ofertas.
- Reorganizar o card público para leitura rápida em duas colunas no celular.

## Banco de dados
- Adicionar `texto_pix`, `texto_parcelamento` e `selos` à tabela `ofertas`.
- Copiar `condicoes` existente para `texto_pix`, sem remover a coluna antiga.
- Aplicar a alteração no Lovable Cloud e manter uma migration equivalente no projeto.

## Administração
- Substituir o campo único de condições pelos campos de Pix e parcelamento.
- Adicionar selos por Enter ou botão, exibindo badges removíveis.
- Salvar e carregar os novos campos ao criar ou editar ofertas.

## Página pública
- Exibir selos no canto superior esquerdo da imagem e manter a etiqueta no canto inferior.
- Limitar título a uma linha e descrição a duas.
- Mostrar preço antigo, preço atual, Pix e parcelamento na ordem solicitada, omitindo campos vazios.
- Compactar os botões e reduzir o peso visual do WhatsApp, preservando hover e swipe das imagens.

## Validação
- Verificar a página pública em celular e desktop.
- Confirmar que as rotas e o menu apontam para os destinos corretos e que o projeto continua compilando.
