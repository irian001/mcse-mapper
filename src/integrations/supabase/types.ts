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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      cliente_contas_origem: {
        Row: {
          aceita_lancamento: boolean
          ativo: boolean
          cliente_id: string
          codigo_origem: string
          created_at: string
          descricao_origem: string
          id: string
          natureza_origem: string | null
          nivel_origem: number | null
          updated_at: string
        }
        Insert: {
          aceita_lancamento?: boolean
          ativo?: boolean
          cliente_id: string
          codigo_origem: string
          created_at?: string
          descricao_origem: string
          id?: string
          natureza_origem?: string | null
          nivel_origem?: number | null
          updated_at?: string
        }
        Update: {
          aceita_lancamento?: boolean
          ativo?: boolean
          cliente_id?: string
          codigo_origem?: string
          created_at?: string
          descricao_origem?: string
          id?: string
          natureza_origem?: string | null
          nivel_origem?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_contas_origem_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_mapeamento_mcse: {
        Row: {
          cliente_id: string
          confianca_mapeamento: number | null
          conta_mcse_id: string | null
          conta_origem_id: string
          created_at: string
          data_homologacao: string | null
          homologado: boolean
          homologado_por: string | null
          id: string
          observacao: string | null
          tipo_mapeamento: Database["public"]["Enums"]["tipo_mapeamento"]
          updated_at: string
        }
        Insert: {
          cliente_id: string
          confianca_mapeamento?: number | null
          conta_mcse_id?: string | null
          conta_origem_id: string
          created_at?: string
          data_homologacao?: string | null
          homologado?: boolean
          homologado_por?: string | null
          id?: string
          observacao?: string | null
          tipo_mapeamento?: Database["public"]["Enums"]["tipo_mapeamento"]
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          confianca_mapeamento?: number | null
          conta_mcse_id?: string | null
          conta_origem_id?: string
          created_at?: string
          data_homologacao?: string | null
          homologado?: boolean
          homologado_por?: string | null
          id?: string
          observacao?: string | null
          tipo_mapeamento?: Database["public"]["Enums"]["tipo_mapeamento"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_mapeamento_mcse_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_mapeamento_mcse_conta_mcse_id_fkey"
            columns: ["conta_mcse_id"]
            isOneToOne: false
            referencedRelation: "mcse_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_mapeamento_mcse_conta_origem_id_fkey"
            columns: ["conta_origem_id"]
            isOneToOne: false
            referencedRelation: "cliente_contas_origem"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_parametros: {
        Row: {
          cliente_id: string
          created_at: string
          erp_principal: string | null
          id: string
          limite_variacao_padrao: number | null
          materialidade_global: number | null
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          erp_principal?: string | null
          id?: string
          limite_variacao_padrao?: number | null
          materialidade_global?: number | null
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          erp_principal?: string | null
          id?: string
          limite_variacao_padrao?: number | null
          materialidade_global?: number | null
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_parametros_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cnpj: string
          created_at: string
          id: string
          nome_fantasia: string | null
          razao_social: string
          segmento: Database["public"]["Enums"]["segmento_cliente"]
          status: Database["public"]["Enums"]["status_cliente"]
          updated_at: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          id?: string
          nome_fantasia?: string | null
          razao_social: string
          segmento?: Database["public"]["Enums"]["segmento_cliente"]
          status?: Database["public"]["Enums"]["status_cliente"]
          updated_at?: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          id?: string
          nome_fantasia?: string | null
          razao_social?: string
          segmento?: Database["public"]["Enums"]["segmento_cliente"]
          status?: Database["public"]["Enums"]["status_cliente"]
          updated_at?: string
        }
        Relationships: []
      }
      exercicios: {
        Row: {
          ano_exercicio: number
          cliente_id: string
          created_at: string
          data_fim: string
          data_inicio: string
          id: string
          status: Database["public"]["Enums"]["status_exercicio"]
          updated_at: string
        }
        Insert: {
          ano_exercicio: number
          cliente_id: string
          created_at?: string
          data_fim: string
          data_inicio: string
          id?: string
          status?: Database["public"]["Enums"]["status_exercicio"]
          updated_at?: string
        }
        Update: {
          ano_exercicio?: number
          cliente_id?: string
          created_at?: string
          data_fim?: string
          data_inicio?: string
          id?: string
          status?: Database["public"]["Enums"]["status_exercicio"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercicios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      mcse_contas: {
        Row: {
          aceita_lancamento: boolean
          aceita_reg_soc: boolean
          ativo: boolean
          codigo_mcse: string
          conta_critica: boolean
          created_at: string
          descricao_conta: string
          grupo_id: string
          id: string
          natureza: Database["public"]["Enums"]["natureza_conta"]
          nivel: number
          subgrupo_id: string | null
          updated_at: string
        }
        Insert: {
          aceita_lancamento?: boolean
          aceita_reg_soc?: boolean
          ativo?: boolean
          codigo_mcse: string
          conta_critica?: boolean
          created_at?: string
          descricao_conta: string
          grupo_id: string
          id?: string
          natureza: Database["public"]["Enums"]["natureza_conta"]
          nivel?: number
          subgrupo_id?: string | null
          updated_at?: string
        }
        Update: {
          aceita_lancamento?: boolean
          aceita_reg_soc?: boolean
          ativo?: boolean
          codigo_mcse?: string
          conta_critica?: boolean
          created_at?: string
          descricao_conta?: string
          grupo_id?: string
          id?: string
          natureza?: Database["public"]["Enums"]["natureza_conta"]
          nivel?: number
          subgrupo_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcse_contas_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "mcse_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcse_contas_subgrupo_id_fkey"
            columns: ["subgrupo_id"]
            isOneToOne: false
            referencedRelation: "mcse_subgrupos"
            referencedColumns: ["id"]
          },
        ]
      }
      mcse_grupos: {
        Row: {
          ativo: boolean
          codigo_grupo: string
          created_at: string
          descricao_grupo: string
          id: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo_grupo: string
          created_at?: string
          descricao_grupo: string
          id?: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo_grupo?: string
          created_at?: string
          descricao_grupo?: string
          id?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      mcse_regras_conta: {
        Row: {
          conta_id: string
          created_at: string
          id: string
          limite_variacao_absoluta: number | null
          limite_variacao_percentual: number | null
          materialidade_padrao: number | null
          observacao_regra: string | null
          requer_conciliacao_reg_soc: boolean
          requer_documento_obrigatorio: boolean
          requer_revisao_humana: boolean
          updated_at: string
        }
        Insert: {
          conta_id: string
          created_at?: string
          id?: string
          limite_variacao_absoluta?: number | null
          limite_variacao_percentual?: number | null
          materialidade_padrao?: number | null
          observacao_regra?: string | null
          requer_conciliacao_reg_soc?: boolean
          requer_documento_obrigatorio?: boolean
          requer_revisao_humana?: boolean
          updated_at?: string
        }
        Update: {
          conta_id?: string
          created_at?: string
          id?: string
          limite_variacao_absoluta?: number | null
          limite_variacao_percentual?: number | null
          materialidade_padrao?: number | null
          observacao_regra?: string | null
          requer_conciliacao_reg_soc?: boolean
          requer_documento_obrigatorio?: boolean
          requer_revisao_humana?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcse_regras_conta_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "mcse_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      mcse_subgrupos: {
        Row: {
          ativo: boolean
          codigo_subgrupo: string
          created_at: string
          descricao_subgrupo: string
          grupo_id: string
          id: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo_subgrupo: string
          created_at?: string
          descricao_subgrupo: string
          grupo_id: string
          id?: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo_subgrupo?: string
          created_at?: string
          descricao_subgrupo?: string
          grupo_id?: string
          id?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcse_subgrupos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "mcse_grupos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      natureza_conta:
        | "ativo"
        | "passivo"
        | "patrimonio_liquido"
        | "receita"
        | "despesa"
        | "compensacao"
      segmento_cliente: "setor_eletrico" | "outro"
      status_cliente: "ativo" | "inativo" | "prospecto"
      status_exercicio: "aberto" | "em_andamento" | "fechado" | "arquivado"
      tipo_mapeamento: "manual" | "automatico"
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
    Enums: {
      natureza_conta: [
        "ativo",
        "passivo",
        "patrimonio_liquido",
        "receita",
        "despesa",
        "compensacao",
      ],
      segmento_cliente: ["setor_eletrico", "outro"],
      status_cliente: ["ativo", "inativo", "prospecto"],
      status_exercicio: ["aberto", "em_andamento", "fechado", "arquivado"],
      tipo_mapeamento: ["manual", "automatico"],
    },
  },
} as const
