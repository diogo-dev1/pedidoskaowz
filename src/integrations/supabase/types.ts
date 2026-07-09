export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      albuns_midia: {
        Row: {
          capa_url: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
          user_id: string
        }
        Insert: {
          capa_url?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          capa_url?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      banners_catalogo: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          imagem_url: string
          link: string | null
          ordem: number
          subtitulo: string | null
          titulo: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          imagem_url: string
          link?: string | null
          ordem?: number
          subtitulo?: string | null
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          imagem_url?: string
          link?: string | null
          ordem?: number
          subtitulo?: string | null
          titulo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bling_contatos: {
        Row: {
          bling_id: number
          celular: string | null
          created_at: string
          dados_completos: Json | null
          email: string | null
          endereco: Json | null
          fantasia: string | null
          id: string
          nome: string | null
          numero_documento: string | null
          telefone: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          bling_id: number
          celular?: string | null
          created_at?: string
          dados_completos?: Json | null
          email?: string | null
          endereco?: Json | null
          fantasia?: string | null
          id?: string
          nome?: string | null
          numero_documento?: string | null
          telefone?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          bling_id?: number
          celular?: string | null
          created_at?: string
          dados_completos?: Json | null
          email?: string | null
          endereco?: Json | null
          fantasia?: string | null
          id?: string
          nome?: string | null
          numero_documento?: string | null
          telefone?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bling_pedidos: {
        Row: {
          bling_id: number
          contato_bling_id: number | null
          created_at: string
          dados_completos: Json | null
          data: string | null
          id: string
          itens: Json | null
          numero: string | null
          situacao: string | null
          total: number | null
          updated_at: string
        }
        Insert: {
          bling_id: number
          contato_bling_id?: number | null
          created_at?: string
          dados_completos?: Json | null
          data?: string | null
          id?: string
          itens?: Json | null
          numero?: string | null
          situacao?: string | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          bling_id?: number
          contato_bling_id?: number | null
          created_at?: string
          dados_completos?: Json | null
          data?: string | null
          id?: string
          itens?: Json | null
          numero?: string | null
          situacao?: string | null
          total?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      bling_sync_log: {
        Row: {
          erro: string | null
          finished_at: string | null
          id: string
          started_at: string
          status: string
          tipo: string
          total_registros: number | null
        }
        Insert: {
          erro?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          tipo: string
          total_registros?: number | null
        }
        Update: {
          erro?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          tipo?: string
          total_registros?: number | null
        }
        Relationships: []
      }
      bling_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      cases_patola_config: {
        Row: {
          chave: string
          id: string
          updated_at: string
          valor: string | null
        }
        Insert: {
          chave: string
          id?: string
          updated_at?: string
          valor?: string | null
        }
        Update: {
          chave?: string
          id?: string
          updated_at?: string
          valor?: string | null
        }
        Relationships: []
      }
      cases_patola_modelos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          horizontal_cm: number | null
          id: string
          imagem_url: string | null
          nome: string
          ordem: number
          updated_at: string
          vertical_cm: number | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          horizontal_cm?: number | null
          id?: string
          imagem_url?: string | null
          nome: string
          ordem?: number
          updated_at?: string
          vertical_cm?: number | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          horizontal_cm?: number | null
          id?: string
          imagem_url?: string | null
          nome?: string
          ordem?: number
          updated_at?: string
          vertical_cm?: number | null
        }
        Relationships: []
      }
      cases_patola_solicitacoes: {
        Row: {
          calibre: string | null
          created_at: string
          customizacoes: string | null
          fabricante: string | null
          foto_arma_url: string | null
          foto_carregador_url: string | null
          fotos_extras: Json
          id: string
          modelo_arma: string | null
          nome: string
          observacoes: string | null
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          calibre?: string | null
          created_at?: string
          customizacoes?: string | null
          fabricante?: string | null
          foto_arma_url?: string | null
          foto_carregador_url?: string | null
          fotos_extras?: Json
          id?: string
          modelo_arma?: string | null
          nome: string
          observacoes?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          calibre?: string | null
          created_at?: string
          customizacoes?: string | null
          fabricante?: string | null
          foto_arma_url?: string | null
          foto_carregador_url?: string | null
          fotos_extras?: Json
          id?: string
          modelo_arma?: string | null
          nome?: string
          observacoes?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      catalogo_modelos: {
        Row: {
          apresentacao_venda: string | null
          area_util_corte: number | null
          aspect_ratio: string
          categoria: string | null
          categorias: string[] | null
          comprimento_total: number | null
          created_at: string
          descricao_html: string | null
          descricao_html_en: string | null
          garantia: string | null
          id: string
          imagem_modelo: string | null
          nome_modelo: string
          nome_modelo_en: string | null
          ordem_catalogo: number
          prazo_entrega: string | null
          preco_base: number
          pronta_entrega: boolean
          updated_at: string
          video_url: string | null
          visivel_catalogo: boolean
          visivel_todas: boolean
        }
        Insert: {
          apresentacao_venda?: string | null
          area_util_corte?: number | null
          aspect_ratio?: string
          categoria?: string | null
          categorias?: string[] | null
          comprimento_total?: number | null
          created_at?: string
          descricao_html?: string | null
          descricao_html_en?: string | null
          garantia?: string | null
          id?: string
          imagem_modelo?: string | null
          nome_modelo: string
          nome_modelo_en?: string | null
          ordem_catalogo?: number
          prazo_entrega?: string | null
          preco_base: number
          pronta_entrega?: boolean
          updated_at?: string
          video_url?: string | null
          visivel_catalogo?: boolean
          visivel_todas?: boolean
        }
        Update: {
          apresentacao_venda?: string | null
          area_util_corte?: number | null
          aspect_ratio?: string
          categoria?: string | null
          categorias?: string[] | null
          comprimento_total?: number | null
          created_at?: string
          descricao_html?: string | null
          descricao_html_en?: string | null
          garantia?: string | null
          id?: string
          imagem_modelo?: string | null
          nome_modelo?: string
          nome_modelo_en?: string | null
          ordem_catalogo?: number
          prazo_entrega?: string | null
          preco_base?: number
          pronta_entrega?: boolean
          updated_at?: string
          video_url?: string | null
          visivel_catalogo?: boolean
          visivel_todas?: boolean
        }
        Relationships: []
      }
      categorias_catalogo_visiveis: {
        Row: {
          categoria: string
          categoria_pai_id: string | null
          created_at: string
          icone: string
          id: string
          nome_en: string | null
          ordem: number
          visivel: boolean
          visivel_kit: boolean
          visivel_todas: boolean
        }
        Insert: {
          categoria: string
          categoria_pai_id?: string | null
          created_at?: string
          icone?: string
          id?: string
          nome_en?: string | null
          ordem?: number
          visivel?: boolean
          visivel_kit?: boolean
          visivel_todas?: boolean
        }
        Update: {
          categoria?: string
          categoria_pai_id?: string | null
          created_at?: string
          icone?: string
          id?: string
          nome_en?: string | null
          ordem?: number
          visivel?: boolean
          visivel_kit?: boolean
          visivel_todas?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "categorias_catalogo_visiveis_categoria_pai_id_fkey"
            columns: ["categoria_pai_id"]
            isOneToOne: false
            referencedRelation: "categorias_catalogo_visiveis"
            referencedColumns: ["id"]
          },
        ]
      }
      certificados: {
        Row: {
          arquivo_gerado: boolean | null
          arquivo_gravado: boolean | null
          categoria: string | null
          created_at: string | null
          data_emissao: string | null
          id: string
          modelo: string
          nome_proprietario: string
          numero: number
          observacoes: string | null
          pedido_item_id: string | null
        }
        Insert: {
          arquivo_gerado?: boolean | null
          arquivo_gravado?: boolean | null
          categoria?: string | null
          created_at?: string | null
          data_emissao?: string | null
          id?: string
          modelo: string
          nome_proprietario: string
          numero: number
          observacoes?: string | null
          pedido_item_id?: string | null
        }
        Update: {
          arquivo_gerado?: boolean | null
          arquivo_gravado?: boolean | null
          categoria?: string | null
          created_at?: string | null
          data_emissao?: string | null
          id?: string
          modelo?: string
          nome_proprietario?: string
          numero?: number
          observacoes?: string | null
          pedido_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificados_pedido_item_id_fkey"
            columns: ["pedido_item_id"]
            isOneToOne: false
            referencedRelation: "pedido_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      config_internacional: {
        Row: {
          chave: string
          created_at: string
          id: string
          updated_at: string
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string
          id?: string
          updated_at?: string
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string
          id?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      config_publico_internacional: {
        Row: {
          chave: string
          created_at: string
          id: string
          updated_at: string
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string
          id?: string
          updated_at?: string
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string
          id?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      config_revendedor: {
        Row: {
          chave: string
          created_at: string
          id: string
          updated_at: string
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string
          id?: string
          updated_at?: string
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string
          id?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      configuracoes_catalogo: {
        Row: {
          chave: string
          created_at: string
          id: string
          updated_at: string
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string
          id?: string
          updated_at?: string
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string
          id?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      expedicao: {
        Row: {
          brindes: string | null
          cep_destino: string | null
          codigo_rastreio: string | null
          created_at: string | null
          data_entrega: string | null
          data_mesa: string | null
          data_postagem: string | null
          endereco_completo: string | null
          espuma_cortada: boolean | null
          id: string
          nome_destinatario: string | null
          observacoes: string | null
          pedido_id: string | null
          prazo_previsto: string | null
          status: string | null
          tipo_caixa: string | null
          transportadora: string | null
          updated_at: string | null
        }
        Insert: {
          brindes?: string | null
          cep_destino?: string | null
          codigo_rastreio?: string | null
          created_at?: string | null
          data_entrega?: string | null
          data_mesa?: string | null
          data_postagem?: string | null
          endereco_completo?: string | null
          espuma_cortada?: boolean | null
          id?: string
          nome_destinatario?: string | null
          observacoes?: string | null
          pedido_id?: string | null
          prazo_previsto?: string | null
          status?: string | null
          tipo_caixa?: string | null
          transportadora?: string | null
          updated_at?: string | null
        }
        Update: {
          brindes?: string | null
          cep_destino?: string | null
          codigo_rastreio?: string | null
          created_at?: string | null
          data_entrega?: string | null
          data_mesa?: string | null
          data_postagem?: string | null
          endereco_completo?: string | null
          espuma_cortada?: boolean | null
          id?: string
          nome_destinatario?: string | null
          observacoes?: string | null
          pedido_id?: string | null
          prazo_previsto?: string | null
          status?: string | null
          tipo_caixa?: string | null
          transportadora?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expedicao_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_recebimentos: {
        Row: {
          created_at: string | null
          data_recebimento: string | null
          data_vencimento: string | null
          forma_pagamento: string | null
          id: string
          parcela: number | null
          pedido_id: string | null
          status: string | null
          total_parcelas: number | null
          valor: number | null
        }
        Insert: {
          created_at?: string | null
          data_recebimento?: string | null
          data_vencimento?: string | null
          forma_pagamento?: string | null
          id?: string
          parcela?: number | null
          pedido_id?: string | null
          status?: string | null
          total_parcelas?: number | null
          valor?: number | null
        }
        Update: {
          created_at?: string | null
          data_recebimento?: string | null
          data_vencimento?: string | null
          forma_pagamento?: string | null
          id?: string
          parcela?: number | null
          pedido_id?: string | null
          status?: string | null
          total_parcelas?: number | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_recebimentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      imagens_album: {
        Row: {
          album_id: string
          created_at: string
          id: string
          legenda: string | null
          nome_arquivo: string
          ordem: number
          url: string
        }
        Insert: {
          album_id: string
          created_at?: string
          id?: string
          legenda?: string | null
          nome_arquivo: string
          ordem?: number
          url: string
        }
        Update: {
          album_id?: string
          created_at?: string
          id?: string
          legenda?: string | null
          nome_arquivo?: string
          ordem?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "imagens_album_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albuns_midia"
            referencedColumns: ["id"]
          },
        ]
      }
      info_etapas_customizacao: {
        Row: {
          conteudo: string | null
          cor_botao: string | null
          created_at: string
          etapa_key: string
          id: string
          imagem_url: string | null
          label_botao: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          conteudo?: string | null
          cor_botao?: string | null
          created_at?: string
          etapa_key: string
          id?: string
          imagem_url?: string | null
          label_botao?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          conteudo?: string | null
          cor_botao?: string | null
          created_at?: string
          etapa_key?: string
          id?: string
          imagem_url?: string | null
          label_botao?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      international_catalog_config: {
        Row: {
          available_currencies: string[]
          available_languages: string[]
          banner_content: string | null
          base_currency: string
          contact_email: string | null
          contact_whatsapp: string | null
          created_at: string
          default_currency: string
          default_language: string
          exchange_mode: string
          id: string
          manual_rates: Json
          manual_rates_updated_at: string | null
          margin_percent: number
          show_banner: boolean
          show_currency_selector: boolean
          show_language_selector: boolean
          show_logo: boolean
          show_prices: boolean
          show_stock: boolean
          updated_at: string
          visible_product_ids: string[]
        }
        Insert: {
          available_currencies?: string[]
          available_languages?: string[]
          banner_content?: string | null
          base_currency?: string
          contact_email?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          default_currency?: string
          default_language?: string
          exchange_mode?: string
          id?: string
          manual_rates?: Json
          manual_rates_updated_at?: string | null
          margin_percent?: number
          show_banner?: boolean
          show_currency_selector?: boolean
          show_language_selector?: boolean
          show_logo?: boolean
          show_prices?: boolean
          show_stock?: boolean
          updated_at?: string
          visible_product_ids?: string[]
        }
        Update: {
          available_currencies?: string[]
          available_languages?: string[]
          banner_content?: string | null
          base_currency?: string
          contact_email?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          default_currency?: string
          default_language?: string
          exchange_mode?: string
          id?: string
          manual_rates?: Json
          manual_rates_updated_at?: string | null
          margin_percent?: number
          show_banner?: boolean
          show_currency_selector?: boolean
          show_language_selector?: boolean
          show_logo?: boolean
          show_prices?: boolean
          show_stock?: boolean
          updated_at?: string
          visible_product_ids?: string[]
        }
        Relationships: []
      }
      kit_laminas_combos: {
        Row: {
          ativo: boolean
          created_at: string
          desconto_percentual: number
          descricao: string | null
          id: string
          imagem_url: string | null
          modelo_ids: string[]
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          desconto_percentual?: number
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          modelo_ids?: string[]
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          desconto_percentual?: number
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          modelo_ids?: string[]
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      kit_laminas_config: {
        Row: {
          chave: string
          created_at: string
          id: string
          updated_at: string
          valor: string | null
        }
        Insert: {
          chave: string
          created_at?: string
          id?: string
          updated_at?: string
          valor?: string | null
        }
        Update: {
          chave?: string
          created_at?: string
          id?: string
          updated_at?: string
          valor?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
          observacao: string | null
          origem: string | null
          situacao: string
          telefone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          observacao?: string | null
          origem?: string | null
          situacao?: string
          telefone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          origem?: string | null
          situacao?: string
          telefone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lotes: {
        Row: {
          capacidade_max: number | null
          created_at: string | null
          data_exportacao: string | null
          exportado_sheets: boolean | null
          id: string
          lote_id_semana: string | null
          numero_lote: number
          prazo_envio: string | null
          status: string | null
          total_pedidos: number | null
        }
        Insert: {
          capacidade_max?: number | null
          created_at?: string | null
          data_exportacao?: string | null
          exportado_sheets?: boolean | null
          id?: string
          lote_id_semana?: string | null
          numero_lote: number
          prazo_envio?: string | null
          status?: string | null
          total_pedidos?: number | null
        }
        Update: {
          capacidade_max?: number | null
          created_at?: string | null
          data_exportacao?: string | null
          exportado_sheets?: boolean | null
          id?: string
          lote_id_semana?: string | null
          numero_lote?: number
          prazo_envio?: string | null
          status?: string | null
          total_pedidos?: number | null
        }
        Relationships: []
      }
      margem_internacional_produto: {
        Row: {
          created_at: string
          id: string
          margem_percentual: number
          modelo_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          margem_percentual: number
          modelo_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          margem_percentual?: number
          modelo_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      margem_publico_internacional: {
        Row: {
          created_at: string
          id: string
          margem_percentual: number
          modelo_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          margem_percentual?: number
          modelo_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          margem_percentual?: number
          modelo_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      margem_revendedor_produto: {
        Row: {
          created_at: string
          id: string
          margem_percentual: number
          modelo_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          margem_percentual: number
          modelo_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          margem_percentual?: number
          modelo_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "margem_revendedor_produto_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: true
            referencedRelation: "catalogo_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_padrao: {
        Row: {
          categoria: string
          conteudo: string
          created_at: string
          id: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria?: string
          conteudo: string
          created_at?: string
          id?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string
          conteudo?: string
          created_at?: string
          id?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      midias_catalogo: {
        Row: {
          created_at: string
          id: string
          modelo_id: string
          nome_arquivo: string
          updated_at: string
          url: string
          visivel_catalogo: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          modelo_id: string
          nome_arquivo: string
          updated_at?: string
          url: string
          visivel_catalogo?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          modelo_id?: string
          nome_arquivo?: string
          updated_at?: string
          url?: string
          visivel_catalogo?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "midias_catalogo_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "catalogo_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      midias_info_etapas: {
        Row: {
          created_at: string
          etapa_key: string
          id: string
          nome_arquivo: string
          ordem: number
          tipo: string
          url: string
        }
        Insert: {
          created_at?: string
          etapa_key: string
          id?: string
          nome_arquivo: string
          ordem?: number
          tipo: string
          url: string
        }
        Update: {
          created_at?: string
          etapa_key?: string
          id?: string
          nome_arquivo?: string
          ordem?: number
          tipo?: string
          url?: string
        }
        Relationships: []
      }
      modelos: {
        Row: {
          categoria: string | null
          categorias: string[] | null
          created_at: string
          id: string
          imagem_modelo: string | null
          nome_modelo: string
          preco_base: number
          updated_at: string
          video_url: string | null
        }
        Insert: {
          categoria?: string | null
          categorias?: string[] | null
          created_at?: string
          id?: string
          imagem_modelo?: string | null
          nome_modelo: string
          preco_base: number
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          categoria?: string | null
          categorias?: string[] | null
          created_at?: string
          id?: string
          imagem_modelo?: string | null
          nome_modelo?: string
          preco_base?: number
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      modelos_base: {
        Row: {
          apresentacao_venda: string | null
          categoria: string | null
          created_at: string
          id: string
          imagem_modelo: string | null
          nome_modelo: string
          preco_base: number
          updated_at: string
        }
        Insert: {
          apresentacao_venda?: string | null
          categoria?: string | null
          created_at?: string
          id?: string
          imagem_modelo?: string | null
          nome_modelo: string
          preco_base: number
          updated_at?: string
        }
        Update: {
          apresentacao_venda?: string | null
          categoria?: string | null
          created_at?: string
          id?: string
          imagem_modelo?: string | null
          nome_modelo?: string
          preco_base?: number
          updated_at?: string
        }
        Relationships: []
      }
      opcoes_componentes: {
        Row: {
          created_at: string
          id: string
          nome_opcao: string
          preco_adicional: number
          tipo_opcao: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome_opcao: string
          preco_adicional: number
          tipo_opcao: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome_opcao?: string
          preco_adicional?: number
          tipo_opcao?: string
          updated_at?: string
        }
        Relationships: []
      }
      ordem_categoria_internacional: {
        Row: {
          categoria_id: string
          created_at: string
          id: string
          modelo_id: string
          ordem: number
        }
        Insert: {
          categoria_id: string
          created_at?: string
          id?: string
          modelo_id: string
          ordem?: number
        }
        Update: {
          categoria_id?: string
          created_at?: string
          id?: string
          modelo_id?: string
          ordem?: number
        }
        Relationships: []
      }
      ordem_categoria_modelos: {
        Row: {
          categoria_id: string
          created_at: string
          id: string
          modelo_id: string
          ordem: number
        }
        Insert: {
          categoria_id: string
          created_at?: string
          id?: string
          modelo_id: string
          ordem?: number
        }
        Update: {
          categoria_id?: string
          created_at?: string
          id?: string
          modelo_id?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "ordem_categoria_modelos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_catalogo_visiveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordem_categoria_modelos_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "catalogo_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      ordem_categoria_publico_internacional: {
        Row: {
          categoria_id: string
          created_at: string
          id: string
          modelo_id: string
          ordem: number
        }
        Insert: {
          categoria_id: string
          created_at?: string
          id?: string
          modelo_id: string
          ordem?: number
        }
        Update: {
          categoria_id?: string
          created_at?: string
          id?: string
          modelo_id?: string
          ordem?: number
        }
        Relationships: []
      }
      ordem_categoria_revendedor: {
        Row: {
          categoria_id: string
          created_at: string
          id: string
          modelo_id: string
          ordem: number
        }
        Insert: {
          categoria_id: string
          created_at?: string
          id?: string
          modelo_id: string
          ordem?: number
        }
        Update: {
          categoria_id?: string
          created_at?: string
          id?: string
          modelo_id?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "ordem_categoria_revendedor_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_catalogo_visiveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordem_categoria_revendedor_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "catalogo_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelamento_orcamentos: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string
          id: string
          observacao: string | null
          parcelas_max: number
          parcelas_sem_juros_max: number
          slug: string
          updated_at: string
          valor: number
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao: string
          id?: string
          observacao?: string | null
          parcelas_max?: number
          parcelas_sem_juros_max?: number
          slug: string
          updated_at?: string
          valor: number
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          observacao?: string | null
          parcelas_max?: number
          parcelas_sem_juros_max?: number
          slug?: string
          updated_at?: string
          valor?: number
          whatsapp?: string | null
        }
        Relationships: []
      }
      parcelamento_taxas: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          ordem: number
          parcelas: number
          rotulo: string | null
          taxa_percentual: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          ordem?: number
          parcelas: number
          rotulo?: string | null
          taxa_percentual?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          ordem?: number
          parcelas?: number
          rotulo?: string | null
          taxa_percentual?: number
          updated_at?: string
        }
        Relationships: []
      }
      pedido_comentarios: {
        Row: {
          autor_id: string | null
          autor_nome: string
          created_at: string
          id: string
          pedido_id: string
          texto: string
        }
        Insert: {
          autor_id?: string | null
          autor_nome: string
          created_at?: string
          id?: string
          pedido_id: string
          texto: string
        }
        Update: {
          autor_id?: string | null
          autor_nome?: string
          created_at?: string
          id?: string
          pedido_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_comentarios_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_comentarios_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_itens: {
        Row: {
          acabamento: string | null
          aco: string | null
          bainha: string | null
          brute_forge: boolean | null
          certificado_id: string | null
          cor_bainha: string | null
          created_at: string | null
          dragon_scale: boolean | null
          embalagem_item: string | null
          empunhadura: string | null
          id: string
          modelo: string | null
          observacoes_item: string | null
          pedido_id: string | null
          posicao_laser: string | null
          preco_unitario: number | null
          quantidade: number | null
          status_bainha: string | null
          status_empunhadura: string | null
          status_lamina: string | null
          status_laser: string | null
          texto_laser: string | null
        }
        Insert: {
          acabamento?: string | null
          aco?: string | null
          bainha?: string | null
          brute_forge?: boolean | null
          certificado_id?: string | null
          cor_bainha?: string | null
          created_at?: string | null
          dragon_scale?: boolean | null
          embalagem_item?: string | null
          empunhadura?: string | null
          id?: string
          modelo?: string | null
          observacoes_item?: string | null
          pedido_id?: string | null
          posicao_laser?: string | null
          preco_unitario?: number | null
          quantidade?: number | null
          status_bainha?: string | null
          status_empunhadura?: string | null
          status_lamina?: string | null
          status_laser?: string | null
          texto_laser?: string | null
        }
        Update: {
          acabamento?: string | null
          aco?: string | null
          bainha?: string | null
          brute_forge?: boolean | null
          certificado_id?: string | null
          cor_bainha?: string | null
          created_at?: string | null
          dragon_scale?: boolean | null
          embalagem_item?: string | null
          empunhadura?: string | null
          id?: string
          modelo?: string | null
          observacoes_item?: string | null
          pedido_id?: string | null
          posicao_laser?: string | null
          preco_unitario?: number | null
          quantidade?: number | null
          status_bainha?: string | null
          status_empunhadura?: string | null
          status_lamina?: string | null
          status_laser?: string | null
          texto_laser?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_certificado_id_fkey"
            columns: ["certificado_id"]
            isOneToOne: false
            referencedRelation: "certificados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          bling_contato_id: number | null
          bling_nfe_id: number | null
          bling_pedido_id: number | null
          bloqueado_expedicao: boolean | null
          brindes: string | null
          canal: string | null
          cliente_bairro: string | null
          cliente_celular: string | null
          cliente_cep: string | null
          cliente_cidade: string | null
          cliente_complemento: string | null
          cliente_cpf: string | null
          cliente_email: string | null
          cliente_endereco: string | null
          cliente_estado: string | null
          cliente_nascimento: string | null
          cliente_nome: string
          cliente_numero: string | null
          created_at: string | null
          cupom: string | null
          desconto: number | null
          embalagem: string | null
          forma_pagamento: string | null
          id: string
          lote_id: string | null
          motivo_bloqueio: string | null
          nome_certificado: string | null
          numero_pedido: string
          observacao: string | null
          prazo_entrega: string | null
          status: string | null
          updated_at: string | null
          valor_total: number | null
          vendedor_id: string | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          bling_contato_id?: number | null
          bling_nfe_id?: number | null
          bling_pedido_id?: number | null
          bloqueado_expedicao?: boolean | null
          brindes?: string | null
          canal?: string | null
          cliente_bairro?: string | null
          cliente_celular?: string | null
          cliente_cep?: string | null
          cliente_cidade?: string | null
          cliente_complemento?: string | null
          cliente_cpf?: string | null
          cliente_email?: string | null
          cliente_endereco?: string | null
          cliente_estado?: string | null
          cliente_nascimento?: string | null
          cliente_nome: string
          cliente_numero?: string | null
          created_at?: string | null
          cupom?: string | null
          desconto?: number | null
          embalagem?: string | null
          forma_pagamento?: string | null
          id?: string
          lote_id?: string | null
          motivo_bloqueio?: string | null
          nome_certificado?: string | null
          numero_pedido: string
          observacao?: string | null
          prazo_entrega?: string | null
          status?: string | null
          updated_at?: string | null
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          bling_contato_id?: number | null
          bling_nfe_id?: number | null
          bling_pedido_id?: number | null
          bloqueado_expedicao?: boolean | null
          brindes?: string | null
          canal?: string | null
          cliente_bairro?: string | null
          cliente_celular?: string | null
          cliente_cep?: string | null
          cliente_cidade?: string | null
          cliente_complemento?: string | null
          cliente_cpf?: string | null
          cliente_email?: string | null
          cliente_endereco?: string | null
          cliente_estado?: string | null
          cliente_nascimento?: string | null
          cliente_nome?: string
          cliente_numero?: string | null
          created_at?: string | null
          cupom?: string | null
          desconto?: number | null
          embalagem?: string | null
          forma_pagamento?: string | null
          id?: string
          lote_id?: string | null
          motivo_bloqueio?: string | null
          nome_certificado?: string | null
          numero_pedido?: string
          observacao?: string | null
          prazo_entrega?: string | null
          status?: string | null
          updated_at?: string | null
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preview_config: {
        Row: {
          created_at: string
          dorso_color: string
          dorso_font_family: string
          dorso_font_size: number
          dorso_letter_spacing: number
          dorso_rotation: number
          dorso_x: number
          dorso_y: number
          id: string
          imagem_preview: string | null
          lateral_color: string
          lateral_font_family: string
          lateral_font_size: number
          lateral_letter_spacing: number
          lateral_rotation: number
          lateral_x: number
          lateral_y: number
          logo_height: number
          logo_width: number
          logo_x: number
          logo_y: number
          modelo_id: string
          updated_at: string
          viewbox_height: number
          viewbox_width: number
        }
        Insert: {
          created_at?: string
          dorso_color?: string
          dorso_font_family?: string
          dorso_font_size?: number
          dorso_letter_spacing?: number
          dorso_rotation?: number
          dorso_x?: number
          dorso_y?: number
          id?: string
          imagem_preview?: string | null
          lateral_color?: string
          lateral_font_family?: string
          lateral_font_size?: number
          lateral_letter_spacing?: number
          lateral_rotation?: number
          lateral_x?: number
          lateral_y?: number
          logo_height?: number
          logo_width?: number
          logo_x?: number
          logo_y?: number
          modelo_id: string
          updated_at?: string
          viewbox_height?: number
          viewbox_width?: number
        }
        Update: {
          created_at?: string
          dorso_color?: string
          dorso_font_family?: string
          dorso_font_size?: number
          dorso_letter_spacing?: number
          dorso_rotation?: number
          dorso_x?: number
          dorso_y?: number
          id?: string
          imagem_preview?: string | null
          lateral_color?: string
          lateral_font_family?: string
          lateral_font_size?: number
          lateral_letter_spacing?: number
          lateral_rotation?: number
          lateral_x?: number
          lateral_y?: number
          logo_height?: number
          logo_width?: number
          logo_x?: number
          logo_y?: number
          modelo_id?: string
          updated_at?: string
          viewbox_height?: number
          viewbox_width?: number
        }
        Relationships: [
          {
            foreignKeyName: "preview_config_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: true
            referencedRelation: "modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_adicionais: {
        Row: {
          created_at: string
          id: string
          nome_produto: string
          preco_unitario: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome_produto: string
          preco_unitario: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome_produto?: string
          preco_unitario?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cargo: string
          created_at: string
          id: string
          nome_vendedor: string
          user_id: string
        }
        Insert: {
          cargo: string
          created_at?: string
          id?: string
          nome_vendedor: string
          user_id: string
        }
        Update: {
          cargo?: string
          created_at?: string
          id?: string
          nome_vendedor?: string
          user_id?: string
        }
        Relationships: []
      }
      push_dagger_config: {
        Row: {
          chave: string
          updated_at: string
          valor: string | null
        }
        Insert: {
          chave: string
          updated_at?: string
          valor?: string | null
        }
        Update: {
          chave?: string
          updated_at?: string
          valor?: string | null
        }
        Relationships: []
      }
      push_dagger_galeria: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          imagem_url: string
          ordem: number
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url: string
          ordem?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url?: string
          ordem?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      shopify_orders_sync: {
        Row: {
          exportado_em: string | null
          id: string
          shopify_order_id: number
          shopify_order_name: string | null
        }
        Insert: {
          exportado_em?: string | null
          id?: string
          shopify_order_id: number
          shopify_order_name?: string | null
        }
        Update: {
          exportado_em?: string | null
          id?: string
          shopify_order_id?: number
          shopify_order_name?: string | null
        }
        Relationships: []
      }
      situacoes_leads: {
        Row: {
          cor: string
          created_at: string
          id: string
          nome: string
          ordem: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cor?: string
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      urban_edc_config: {
        Row: {
          chave: string
          updated_at: string
          valor: string | null
        }
        Insert: {
          chave: string
          updated_at?: string
          valor?: string | null
        }
        Update: {
          chave?: string
          updated_at?: string
          valor?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calcular_prazo_uteis: { Args: { dias: number }; Returns: string }
      gerar_numero_pedido: { Args: never; Returns: string }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
