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
          garantia: string | null
          id: string
          imagem_modelo: string | null
          nome_modelo: string
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
          garantia?: string | null
          id?: string
          imagem_modelo?: string | null
          nome_modelo: string
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
          garantia?: string | null
          id?: string
          imagem_modelo?: string | null
          nome_modelo?: string
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
      [_ in never]: never
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
