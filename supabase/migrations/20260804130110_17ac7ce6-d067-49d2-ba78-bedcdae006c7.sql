UPDATE checkouts_abandonados_templates SET mensagem = 'Olá {nome}, meu nome é {vendedor}, faço parte da equipe Kaowz!

Vi que você começou a finalizar seu pedido ({itens}) mas por algum motivo não concluiu.

Posso te ajudar com alguma dúvida sobre a lâmina, prazo ou pagamento, como posso te servir?' WHERE ordem = 1;