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
          conteudo: string
          created_at: string
          id: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          id?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
