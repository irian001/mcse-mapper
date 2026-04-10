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
      auditores: {
        Row: {
          ativo: boolean
          auth_user_id: string | null
          cargo: Database["public"]["Enums"]["cargo_auditor"]
          created_at: string
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          perfil: Database["public"]["Enums"]["cargo_auditor"]
          perfil_acesso: Database["public"]["Enums"]["perfil_acesso"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          auth_user_id?: string | null
          cargo?: Database["public"]["Enums"]["cargo_auditor"]
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          perfil?: Database["public"]["Enums"]["cargo_auditor"]
          perfil_acesso?: Database["public"]["Enums"]["perfil_acesso"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          auth_user_id?: string | null
          cargo?: Database["public"]["Enums"]["cargo_auditor"]
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          perfil?: Database["public"]["Enums"]["cargo_auditor"]
          perfil_acesso?: Database["public"]["Enums"]["perfil_acesso"]
          updated_at?: string
        }
        Relationships: []
      }
      balancete_linhas: {
        Row: {
          balancete_id: string
          classificacao_origem: string | null
          cliente_id: string
          codigo_conta_balancete: string
          codigo_mcse: string | null
          comentario_auditor: string | null
          comentario_revisor: string | null
          conta_mcse_id: string | null
          conta_origem_id: string | null
          created_at: string
          creditos: number | null
          data_revisao: string | null
          data_validacao: string | null
          debitos: number | null
          descricao_conta_balancete: string
          descricao_mcse: string | null
          descricao_pendencia: string | null
          diferenca_aceita: boolean | null
          diferenca_validacao: number | null
          exercicio_id: string
          grupo_mcse: string | null
          id: string
          justificativa_diferenca: string | null
          observacao_importacao: string | null
          possui_pendencia: boolean | null
          saldo_anterior: number | null
          saldo_atual: number | null
          severidade: Database["public"]["Enums"]["severidade_pendencia"] | null
          status_linha:
            | Database["public"]["Enums"]["status_linha_balancete"]
            | null
          status_localizacao_conta: Database["public"]["Enums"]["status_localizacao_conta"]
          status_mapeamento_mcse: Database["public"]["Enums"]["status_mapeamento_mcse"]
          status_validacao: Database["public"]["Enums"]["status_validacao_linha"]
          subgrupo_mcse: string | null
          trabalho_auditoria_id: string
          updated_at: string
          usuario_revisao: string | null
          usuario_validacao: string | null
          valor_validado: number | null
          variacao_absoluta: number | null
          variacao_percentual: number | null
        }
        Insert: {
          balancete_id: string
          classificacao_origem?: string | null
          cliente_id: string
          codigo_conta_balancete: string
          codigo_mcse?: string | null
          comentario_auditor?: string | null
          comentario_revisor?: string | null
          conta_mcse_id?: string | null
          conta_origem_id?: string | null
          created_at?: string
          creditos?: number | null
          data_revisao?: string | null
          data_validacao?: string | null
          debitos?: number | null
          descricao_conta_balancete?: string
          descricao_mcse?: string | null
          descricao_pendencia?: string | null
          diferenca_aceita?: boolean | null
          diferenca_validacao?: number | null
          exercicio_id: string
          grupo_mcse?: string | null
          id?: string
          justificativa_diferenca?: string | null
          observacao_importacao?: string | null
          possui_pendencia?: boolean | null
          saldo_anterior?: number | null
          saldo_atual?: number | null
          severidade?:
            | Database["public"]["Enums"]["severidade_pendencia"]
            | null
          status_linha?:
            | Database["public"]["Enums"]["status_linha_balancete"]
            | null
          status_localizacao_conta?: Database["public"]["Enums"]["status_localizacao_conta"]
          status_mapeamento_mcse?: Database["public"]["Enums"]["status_mapeamento_mcse"]
          status_validacao?: Database["public"]["Enums"]["status_validacao_linha"]
          subgrupo_mcse?: string | null
          trabalho_auditoria_id: string
          updated_at?: string
          usuario_revisao?: string | null
          usuario_validacao?: string | null
          valor_validado?: number | null
          variacao_absoluta?: number | null
          variacao_percentual?: number | null
        }
        Update: {
          balancete_id?: string
          classificacao_origem?: string | null
          cliente_id?: string
          codigo_conta_balancete?: string
          codigo_mcse?: string | null
          comentario_auditor?: string | null
          comentario_revisor?: string | null
          conta_mcse_id?: string | null
          conta_origem_id?: string | null
          created_at?: string
          creditos?: number | null
          data_revisao?: string | null
          data_validacao?: string | null
          debitos?: number | null
          descricao_conta_balancete?: string
          descricao_mcse?: string | null
          descricao_pendencia?: string | null
          diferenca_aceita?: boolean | null
          diferenca_validacao?: number | null
          exercicio_id?: string
          grupo_mcse?: string | null
          id?: string
          justificativa_diferenca?: string | null
          observacao_importacao?: string | null
          possui_pendencia?: boolean | null
          saldo_anterior?: number | null
          saldo_atual?: number | null
          severidade?:
            | Database["public"]["Enums"]["severidade_pendencia"]
            | null
          status_linha?:
            | Database["public"]["Enums"]["status_linha_balancete"]
            | null
          status_localizacao_conta?: Database["public"]["Enums"]["status_localizacao_conta"]
          status_mapeamento_mcse?: Database["public"]["Enums"]["status_mapeamento_mcse"]
          status_validacao?: Database["public"]["Enums"]["status_validacao_linha"]
          subgrupo_mcse?: string | null
          trabalho_auditoria_id?: string
          updated_at?: string
          usuario_revisao?: string | null
          usuario_validacao?: string | null
          valor_validado?: number | null
          variacao_absoluta?: number | null
          variacao_percentual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "balancete_linhas_balancete_id_fkey"
            columns: ["balancete_id"]
            isOneToOne: false
            referencedRelation: "balancetes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balancete_linhas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balancete_linhas_conta_mcse_id_fkey"
            columns: ["conta_mcse_id"]
            isOneToOne: false
            referencedRelation: "mcse_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balancete_linhas_conta_origem_id_fkey"
            columns: ["conta_origem_id"]
            isOneToOne: false
            referencedRelation: "cliente_contas_origem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balancete_linhas_exercicio_id_fkey"
            columns: ["exercicio_id"]
            isOneToOne: false
            referencedRelation: "exercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balancete_linhas_trabalho_auditoria_id_fkey"
            columns: ["trabalho_auditoria_id"]
            isOneToOne: false
            referencedRelation: "trabalhos_auditoria"
            referencedColumns: ["id"]
          },
        ]
      }
      balancetes: {
        Row: {
          cliente_id: string
          created_at: string
          data_importacao: string
          exercicio_id: string
          id: string
          nome_arquivo: string
          observacao: string | null
          status_importacao: Database["public"]["Enums"]["status_importacao_balancete"]
          tipo_balancete: Database["public"]["Enums"]["tipo_balancete"]
          total_linhas: number
          total_linhas_com_mapeamento: number
          total_linhas_sem_mapeamento: number
          trabalho_auditoria_id: string
          updated_at: string
          usuario_importacao: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_importacao?: string
          exercicio_id: string
          id?: string
          nome_arquivo: string
          observacao?: string | null
          status_importacao?: Database["public"]["Enums"]["status_importacao_balancete"]
          tipo_balancete?: Database["public"]["Enums"]["tipo_balancete"]
          total_linhas?: number
          total_linhas_com_mapeamento?: number
          total_linhas_sem_mapeamento?: number
          trabalho_auditoria_id: string
          updated_at?: string
          usuario_importacao?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_importacao?: string
          exercicio_id?: string
          id?: string
          nome_arquivo?: string
          observacao?: string | null
          status_importacao?: Database["public"]["Enums"]["status_importacao_balancete"]
          tipo_balancete?: Database["public"]["Enums"]["tipo_balancete"]
          total_linhas?: number
          total_linhas_com_mapeamento?: number
          total_linhas_sem_mapeamento?: number
          trabalho_auditoria_id?: string
          updated_at?: string
          usuario_importacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "balancetes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balancetes_exercicio_id_fkey"
            columns: ["exercicio_id"]
            isOneToOne: false
            referencedRelation: "exercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balancetes_trabalho_auditoria_id_fkey"
            columns: ["trabalho_auditoria_id"]
            isOneToOne: false
            referencedRelation: "trabalhos_auditoria"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_contas_origem: {
        Row: {
          analitica: boolean
          ativa: boolean
          clasmasc: string | null
          classificacao: string | null
          cliente_id: string
          codigo_mcse_sugerido: string | null
          contabmp: string | null
          created_at: string
          data_inclusao: string | null
          gerar_lanctos_cso: boolean
          grau: number | null
          id: string
          idconta: string
          idempresa: string | null
          idversao: string | null
          nivel_classificacao: number | null
          nome: string
          observacao_importacao: string | null
          status_mapeamento: Database["public"]["Enums"]["status_mapeamento"]
          tipo_contab: string | null
          updated_at: string
        }
        Insert: {
          analitica?: boolean
          ativa?: boolean
          clasmasc?: string | null
          classificacao?: string | null
          cliente_id: string
          codigo_mcse_sugerido?: string | null
          contabmp?: string | null
          created_at?: string
          data_inclusao?: string | null
          gerar_lanctos_cso?: boolean
          grau?: number | null
          id?: string
          idconta?: string
          idempresa?: string | null
          idversao?: string | null
          nivel_classificacao?: number | null
          nome?: string
          observacao_importacao?: string | null
          status_mapeamento?: Database["public"]["Enums"]["status_mapeamento"]
          tipo_contab?: string | null
          updated_at?: string
        }
        Update: {
          analitica?: boolean
          ativa?: boolean
          clasmasc?: string | null
          classificacao?: string | null
          cliente_id?: string
          codigo_mcse_sugerido?: string | null
          contabmp?: string | null
          created_at?: string
          data_inclusao?: string | null
          gerar_lanctos_cso?: boolean
          grau?: number | null
          id?: string
          idconta?: string
          idempresa?: string | null
          idversao?: string | null
          nivel_classificacao?: number | null
          nome?: string
          observacao_importacao?: string | null
          status_mapeamento?: Database["public"]["Enums"]["status_mapeamento"]
          tipo_contab?: string | null
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
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string
          complemento: string | null
          created_at: string
          email_contato: string | null
          id: string
          logradouro: string | null
          nome_contador: string | null
          nome_fantasia: string | null
          numero: string | null
          razao_social: string
          segmento: Database["public"]["Enums"]["segmento_cliente"]
          status: Database["public"]["Enums"]["status_cliente"]
          uf: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj: string
          complemento?: string | null
          created_at?: string
          email_contato?: string | null
          id?: string
          logradouro?: string | null
          nome_contador?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social: string
          segmento?: Database["public"]["Enums"]["segmento_cliente"]
          status?: Database["public"]["Enums"]["status_cliente"]
          uf?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          complemento?: string | null
          created_at?: string
          email_contato?: string | null
          id?: string
          logradouro?: string | null
          nome_contador?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          razao_social?: string
          segmento?: Database["public"]["Enums"]["segmento_cliente"]
          status?: Database["public"]["Enums"]["status_cliente"]
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      documentos_referencia_balancete: {
        Row: {
          ativo: boolean
          balancete_linha_id: string
          caminho_arquivo_ou_url: string
          cliente_id: string
          created_at: string
          exercicio_id: string
          id: string
          nome_arquivo: string
          observacao_documento: string | null
          tipo_arquivo: string
          trabalho_auditoria_id: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          ativo?: boolean
          balancete_linha_id: string
          caminho_arquivo_ou_url: string
          cliente_id: string
          created_at?: string
          exercicio_id: string
          id?: string
          nome_arquivo: string
          observacao_documento?: string | null
          tipo_arquivo?: string
          trabalho_auditoria_id: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          ativo?: boolean
          balancete_linha_id?: string
          caminho_arquivo_ou_url?: string
          cliente_id?: string
          created_at?: string
          exercicio_id?: string
          id?: string
          nome_arquivo?: string
          observacao_documento?: string | null
          tipo_arquivo?: string
          trabalho_auditoria_id?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_referencia_balancete_balancete_linha_id_fkey"
            columns: ["balancete_linha_id"]
            isOneToOne: false
            referencedRelation: "balancete_linhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_referencia_balancete_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_referencia_balancete_exercicio_id_fkey"
            columns: ["exercicio_id"]
            isOneToOne: false
            referencedRelation: "exercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_referencia_balancete_trabalho_auditoria_id_fkey"
            columns: ["trabalho_auditoria_id"]
            isOneToOne: false
            referencedRelation: "trabalhos_auditoria"
            referencedColumns: ["id"]
          },
        ]
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
          ativo: boolean
          codigo_mcse: string | null
          conta_critica: boolean
          conta_mcse_id: string
          created_at: string
          descricao_mcse: string | null
          exige_conciliacao_reg_soc: boolean
          exige_documento_obrigatorio: boolean
          exige_revisao_humana: boolean
          gera_solicitacao_automatica: boolean
          grupo_documental: string | null
          id: string
          limite_variacao_absoluta: number | null
          limite_variacao_percentual: number | null
          materialidade_padrao: number | null
          observacao_regra: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo_mcse?: string | null
          conta_critica?: boolean
          conta_mcse_id: string
          created_at?: string
          descricao_mcse?: string | null
          exige_conciliacao_reg_soc?: boolean
          exige_documento_obrigatorio?: boolean
          exige_revisao_humana?: boolean
          gera_solicitacao_automatica?: boolean
          grupo_documental?: string | null
          id?: string
          limite_variacao_absoluta?: number | null
          limite_variacao_percentual?: number | null
          materialidade_padrao?: number | null
          observacao_regra?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo_mcse?: string | null
          conta_critica?: boolean
          conta_mcse_id?: string
          created_at?: string
          descricao_mcse?: string | null
          exige_conciliacao_reg_soc?: boolean
          exige_documento_obrigatorio?: boolean
          exige_revisao_humana?: boolean
          gera_solicitacao_automatica?: boolean
          grupo_documental?: string | null
          id?: string
          limite_variacao_absoluta?: number | null
          limite_variacao_percentual?: number | null
          materialidade_padrao?: number | null
          observacao_regra?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcse_regras_conta_conta_id_fkey"
            columns: ["conta_mcse_id"]
            isOneToOne: true
            referencedRelation: "mcse_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      mcse_regras_documentos: {
        Row: {
          ativo: boolean
          codigo_mcse: string | null
          conta_mcse_id: string
          created_at: string
          descricao_documento: string
          descricao_mcse: string | null
          formato_aceito: string | null
          id: string
          obrigatorio: boolean
          observacao: string | null
          ordem_solicitacao: number
          permite_excel: boolean
          permite_pdf: boolean
          regra_mcse_id: string
          tipo_documento: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo_mcse?: string | null
          conta_mcse_id: string
          created_at?: string
          descricao_documento?: string
          descricao_mcse?: string | null
          formato_aceito?: string | null
          id?: string
          obrigatorio?: boolean
          observacao?: string | null
          ordem_solicitacao?: number
          permite_excel?: boolean
          permite_pdf?: boolean
          regra_mcse_id: string
          tipo_documento?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo_mcse?: string | null
          conta_mcse_id?: string
          created_at?: string
          descricao_documento?: string
          descricao_mcse?: string | null
          formato_aceito?: string | null
          id?: string
          obrigatorio?: boolean
          observacao?: string | null
          ordem_solicitacao?: number
          permite_excel?: boolean
          permite_pdf?: boolean
          regra_mcse_id?: string
          tipo_documento?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcse_regras_documentos_conta_mcse_id_fkey"
            columns: ["conta_mcse_id"]
            isOneToOne: false
            referencedRelation: "mcse_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcse_regras_documentos_regra_mcse_id_fkey"
            columns: ["regra_mcse_id"]
            isOneToOne: false
            referencedRelation: "mcse_regras_conta"
            referencedColumns: ["id"]
          },
        ]
      }
      mcse_regras_emissao_erp: {
        Row: {
          ativo: boolean
          caminho_emissao: string | null
          campos_minimos_esperados: string | null
          codigo_mcse: string | null
          conta_mcse_id: string
          created_at: string
          descricao_mcse: string | null
          erp_nome: string
          filtros_obrigatorios: string | null
          formato_preferencial: string | null
          id: string
          modulo_erp: string | null
          nome_relatorio: string
          observacao: string | null
          ordem: number
          regra_mcse_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          caminho_emissao?: string | null
          campos_minimos_esperados?: string | null
          codigo_mcse?: string | null
          conta_mcse_id: string
          created_at?: string
          descricao_mcse?: string | null
          erp_nome?: string
          filtros_obrigatorios?: string | null
          formato_preferencial?: string | null
          id?: string
          modulo_erp?: string | null
          nome_relatorio?: string
          observacao?: string | null
          ordem?: number
          regra_mcse_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          caminho_emissao?: string | null
          campos_minimos_esperados?: string | null
          codigo_mcse?: string | null
          conta_mcse_id?: string
          created_at?: string
          descricao_mcse?: string | null
          erp_nome?: string
          filtros_obrigatorios?: string | null
          formato_preferencial?: string | null
          id?: string
          modulo_erp?: string | null
          nome_relatorio?: string
          observacao?: string | null
          ordem?: number
          regra_mcse_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcse_regras_emissao_erp_conta_mcse_id_fkey"
            columns: ["conta_mcse_id"]
            isOneToOne: false
            referencedRelation: "mcse_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcse_regras_emissao_erp_regra_mcse_id_fkey"
            columns: ["regra_mcse_id"]
            isOneToOne: false
            referencedRelation: "mcse_regras_conta"
            referencedColumns: ["id"]
          },
        ]
      }
      mcse_regras_instrucoes: {
        Row: {
          ativo: boolean
          codigo_mcse: string | null
          conta_mcse_id: string
          created_at: string
          descricao_mcse: string | null
          id: string
          ordem: number
          publico_alvo: string
          regra_mcse_id: string
          texto_instrucao: string
          titulo_instrucao: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo_mcse?: string | null
          conta_mcse_id: string
          created_at?: string
          descricao_mcse?: string | null
          id?: string
          ordem?: number
          publico_alvo?: string
          regra_mcse_id: string
          texto_instrucao?: string
          titulo_instrucao?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo_mcse?: string | null
          conta_mcse_id?: string
          created_at?: string
          descricao_mcse?: string | null
          id?: string
          ordem?: number
          publico_alvo?: string
          regra_mcse_id?: string
          texto_instrucao?: string
          titulo_instrucao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcse_regras_instrucoes_conta_mcse_id_fkey"
            columns: ["conta_mcse_id"]
            isOneToOne: false
            referencedRelation: "mcse_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mcse_regras_instrucoes_regra_mcse_id_fkey"
            columns: ["regra_mcse_id"]
            isOneToOne: false
            referencedRelation: "mcse_regras_conta"
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
      papeis_trabalho: {
        Row: {
          atualizado_por: string | null
          cliente_id: string
          codigo_mcse: string | null
          comentario_auditor: string | null
          comentario_revisor: string | null
          conclusao_final: string | null
          conclusao_preliminar: string | null
          conta_mcse_id: string | null
          created_at: string
          criado_por: string | null
          descricao_mcse: string | null
          diferenca_total: number | null
          exercicio_id: string
          fechado: boolean
          grupo_mcse: string | null
          id: string
          limite_materialidade: number | null
          limite_variacao: number | null
          materialidade_aplicavel: boolean | null
          objetivo_procedimento: string | null
          saldo_anterior_total: number | null
          saldo_atual_total: number | null
          status_pta: Database["public"]["Enums"]["status_pta"]
          subgrupo_mcse: string | null
          titulo_pta: string
          total_documentos_referencia: number | null
          total_linhas_com_pendencia: number | null
          total_linhas_vinculadas: number | null
          trabalho_auditoria_id: string
          updated_at: string
          valor_validado_total: number | null
          variacao_absoluta_total: number | null
          variacao_percentual_total: number | null
        }
        Insert: {
          atualizado_por?: string | null
          cliente_id: string
          codigo_mcse?: string | null
          comentario_auditor?: string | null
          comentario_revisor?: string | null
          conclusao_final?: string | null
          conclusao_preliminar?: string | null
          conta_mcse_id?: string | null
          created_at?: string
          criado_por?: string | null
          descricao_mcse?: string | null
          diferenca_total?: number | null
          exercicio_id: string
          fechado?: boolean
          grupo_mcse?: string | null
          id?: string
          limite_materialidade?: number | null
          limite_variacao?: number | null
          materialidade_aplicavel?: boolean | null
          objetivo_procedimento?: string | null
          saldo_anterior_total?: number | null
          saldo_atual_total?: number | null
          status_pta?: Database["public"]["Enums"]["status_pta"]
          subgrupo_mcse?: string | null
          titulo_pta?: string
          total_documentos_referencia?: number | null
          total_linhas_com_pendencia?: number | null
          total_linhas_vinculadas?: number | null
          trabalho_auditoria_id: string
          updated_at?: string
          valor_validado_total?: number | null
          variacao_absoluta_total?: number | null
          variacao_percentual_total?: number | null
        }
        Update: {
          atualizado_por?: string | null
          cliente_id?: string
          codigo_mcse?: string | null
          comentario_auditor?: string | null
          comentario_revisor?: string | null
          conclusao_final?: string | null
          conclusao_preliminar?: string | null
          conta_mcse_id?: string | null
          created_at?: string
          criado_por?: string | null
          descricao_mcse?: string | null
          diferenca_total?: number | null
          exercicio_id?: string
          fechado?: boolean
          grupo_mcse?: string | null
          id?: string
          limite_materialidade?: number | null
          limite_variacao?: number | null
          materialidade_aplicavel?: boolean | null
          objetivo_procedimento?: string | null
          saldo_anterior_total?: number | null
          saldo_atual_total?: number | null
          status_pta?: Database["public"]["Enums"]["status_pta"]
          subgrupo_mcse?: string | null
          titulo_pta?: string
          total_documentos_referencia?: number | null
          total_linhas_com_pendencia?: number | null
          total_linhas_vinculadas?: number | null
          trabalho_auditoria_id?: string
          updated_at?: string
          valor_validado_total?: number | null
          variacao_absoluta_total?: number | null
          variacao_percentual_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "papeis_trabalho_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "papeis_trabalho_conta_mcse_id_fkey"
            columns: ["conta_mcse_id"]
            isOneToOne: false
            referencedRelation: "mcse_contas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "papeis_trabalho_exercicio_id_fkey"
            columns: ["exercicio_id"]
            isOneToOne: false
            referencedRelation: "exercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "papeis_trabalho_trabalho_auditoria_id_fkey"
            columns: ["trabalho_auditoria_id"]
            isOneToOne: false
            referencedRelation: "trabalhos_auditoria"
            referencedColumns: ["id"]
          },
        ]
      }
      papel_trabalho_linhas: {
        Row: {
          balancete_linha_id: string
          created_at: string
          diferenca_linha: number | null
          id: string
          papel_trabalho_id: string
          saldo_atual_linha: number | null
          status_linha_snapshot: string | null
          trabalho_auditoria_id: string
          valor_validado_linha: number | null
        }
        Insert: {
          balancete_linha_id: string
          created_at?: string
          diferenca_linha?: number | null
          id?: string
          papel_trabalho_id: string
          saldo_atual_linha?: number | null
          status_linha_snapshot?: string | null
          trabalho_auditoria_id: string
          valor_validado_linha?: number | null
        }
        Update: {
          balancete_linha_id?: string
          created_at?: string
          diferenca_linha?: number | null
          id?: string
          papel_trabalho_id?: string
          saldo_atual_linha?: number | null
          status_linha_snapshot?: string | null
          trabalho_auditoria_id?: string
          valor_validado_linha?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "papel_trabalho_linhas_balancete_linha_id_fkey"
            columns: ["balancete_linha_id"]
            isOneToOne: false
            referencedRelation: "balancete_linhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "papel_trabalho_linhas_papel_trabalho_id_fkey"
            columns: ["papel_trabalho_id"]
            isOneToOne: false
            referencedRelation: "papeis_trabalho"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "papel_trabalho_linhas_trabalho_auditoria_id_fkey"
            columns: ["trabalho_auditoria_id"]
            isOneToOne: false
            referencedRelation: "trabalhos_auditoria"
            referencedColumns: ["id"]
          },
        ]
      }
      trabalho_auditores: {
        Row: {
          ativo: boolean
          auditor_id: string
          created_at: string
          id: string
          papel_no_trabalho: Database["public"]["Enums"]["papel_trabalho"]
          responsavel_principal: boolean
          trabalho_auditoria_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          auditor_id: string
          created_at?: string
          id?: string
          papel_no_trabalho?: Database["public"]["Enums"]["papel_trabalho"]
          responsavel_principal?: boolean
          trabalho_auditoria_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          auditor_id?: string
          created_at?: string
          id?: string
          papel_no_trabalho?: Database["public"]["Enums"]["papel_trabalho"]
          responsavel_principal?: boolean
          trabalho_auditoria_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trabalho_auditores_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "auditores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabalho_auditores_trabalho_auditoria_id_fkey"
            columns: ["trabalho_auditoria_id"]
            isOneToOne: false
            referencedRelation: "trabalhos_auditoria"
            referencedColumns: ["id"]
          },
        ]
      }
      trabalhos_auditoria: {
        Row: {
          cliente_id: string
          created_at: string
          data_fim_programada: string | null
          data_fim_real: string | null
          data_inicio_programada: string | null
          data_inicio_real: string | null
          descricao: string | null
          exercicio_id: string
          id: string
          nome_trabalho: string
          observacoes: string | null
          status_trabalho: Database["public"]["Enums"]["status_trabalho"]
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_fim_programada?: string | null
          data_fim_real?: string | null
          data_inicio_programada?: string | null
          data_inicio_real?: string | null
          descricao?: string | null
          exercicio_id: string
          id?: string
          nome_trabalho: string
          observacoes?: string | null
          status_trabalho?: Database["public"]["Enums"]["status_trabalho"]
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_fim_programada?: string | null
          data_fim_real?: string | null
          data_inicio_programada?: string | null
          data_inicio_real?: string | null
          descricao?: string | null
          exercicio_id?: string
          id?: string
          nome_trabalho?: string
          observacoes?: string | null
          status_trabalho?: Database["public"]["Enums"]["status_trabalho"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trabalhos_auditoria_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabalhos_auditoria_exercicio_id_fkey"
            columns: ["exercicio_id"]
            isOneToOne: false
            referencedRelation: "exercicios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_storage_doc: {
        Args: { p_object_name: string }
        Returns: boolean
      }
      get_accessible_cliente_ids: { Args: never; Returns: string[] }
      get_accessible_trabalho_ids: { Args: never; Returns: string[] }
      get_auth_users_for_linking: {
        Args: never
        Returns: {
          user_email: string
          user_id: string
        }[]
      }
      get_my_auditor_id: { Args: never; Returns: string }
      has_any_admin: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      link_auditor_account: {
        Args: { p_auditor_id: string; p_user_id?: string }
        Returns: undefined
      }
      link_auditor_by_email: {
        Args: { p_auditor_id: string; p_user_email: string }
        Returns: undefined
      }
    }
    Enums: {
      cargo_auditor: "assistente" | "senior" | "gerente" | "socio" | "revisor"
      natureza_conta:
        | "ativo"
        | "passivo"
        | "patrimonio_liquido"
        | "receita"
        | "despesa"
        | "compensacao"
      papel_trabalho:
        | "elaborador"
        | "revisor_1"
        | "revisor_2"
        | "gerente"
        | "socio"
      perfil_acesso: "assistente" | "senior" | "gerente" | "socio" | "admin"
      segmento_cliente: "setor_eletrico" | "outro"
      severidade_pendencia: "baixa" | "media" | "alta" | "critica"
      status_cliente: "ativo" | "inativo" | "prospecto"
      status_exercicio: "aberto" | "em_andamento" | "fechado" | "arquivado"
      status_importacao_balancete:
        | "importado"
        | "processando"
        | "erro"
        | "finalizado"
      status_linha_balancete:
        | "pendente"
        | "em_analise"
        | "validado"
        | "divergente"
        | "revisado"
        | "concluido"
      status_localizacao_conta:
        | "localizada"
        | "nao_localizada"
        | "localizada_por_classificacao"
        | "localizada_por_codigo"
        | "localizada_por_descricao"
      status_mapeamento:
        | "nao_mapeado"
        | "mapeado_automatico"
        | "mapeado_manual"
        | "homologado"
      status_mapeamento_mcse:
        | "mapeado"
        | "sem_mapeamento"
        | "conta_nao_localizada"
      status_pta:
        | "pendente"
        | "em_analise"
        | "em_revisao"
        | "concluido"
        | "finalizado"
      status_trabalho:
        | "planejado"
        | "iniciado"
        | "em_execucao"
        | "revisao_1"
        | "revisao_2"
        | "finalizado_para_parecer"
        | "encerrado"
      status_validacao_linha:
        | "pendente"
        | "pronto_para_analise"
        | "revisar_mapeamento"
      tipo_balancete: "mensal" | "trimestral" | "semestral" | "anual" | "outro"
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
      cargo_auditor: ["assistente", "senior", "gerente", "socio", "revisor"],
      natureza_conta: [
        "ativo",
        "passivo",
        "patrimonio_liquido",
        "receita",
        "despesa",
        "compensacao",
      ],
      papel_trabalho: [
        "elaborador",
        "revisor_1",
        "revisor_2",
        "gerente",
        "socio",
      ],
      perfil_acesso: ["assistente", "senior", "gerente", "socio", "admin"],
      segmento_cliente: ["setor_eletrico", "outro"],
      severidade_pendencia: ["baixa", "media", "alta", "critica"],
      status_cliente: ["ativo", "inativo", "prospecto"],
      status_exercicio: ["aberto", "em_andamento", "fechado", "arquivado"],
      status_importacao_balancete: [
        "importado",
        "processando",
        "erro",
        "finalizado",
      ],
      status_linha_balancete: [
        "pendente",
        "em_analise",
        "validado",
        "divergente",
        "revisado",
        "concluido",
      ],
      status_localizacao_conta: [
        "localizada",
        "nao_localizada",
        "localizada_por_classificacao",
        "localizada_por_codigo",
        "localizada_por_descricao",
      ],
      status_mapeamento: [
        "nao_mapeado",
        "mapeado_automatico",
        "mapeado_manual",
        "homologado",
      ],
      status_mapeamento_mcse: [
        "mapeado",
        "sem_mapeamento",
        "conta_nao_localizada",
      ],
      status_pta: [
        "pendente",
        "em_analise",
        "em_revisao",
        "concluido",
        "finalizado",
      ],
      status_trabalho: [
        "planejado",
        "iniciado",
        "em_execucao",
        "revisao_1",
        "revisao_2",
        "finalizado_para_parecer",
        "encerrado",
      ],
      status_validacao_linha: [
        "pendente",
        "pronto_para_analise",
        "revisar_mapeamento",
      ],
      tipo_balancete: ["mensal", "trimestral", "semestral", "anual", "outro"],
      tipo_mapeamento: ["manual", "automatico"],
    },
  },
} as const
