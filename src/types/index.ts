export interface Service {
  id: string
  nome: string
  preco: number
  duracao_minutos: number
}

export interface Product {
  id: string
  nome: string
  preco: number
  quantidade_estoque: number
  unidade_medida: 'unidade' | 'ml' | 'gramas' | 'L' | 'kg' | 'caixa' | 'peca'
}

export interface Combo {
  id: string
  nome: string
  preco_promocional: number
  services: Service[]
  products: Product[]
}

export interface Plan {
  id: string
  nome: string
  cota_servicos: number
}

export type CustomerPlanStatus = 'ativo' | 'inativo'

export interface CustomerPlan {
  id: string
  planId: string
  status: CustomerPlanStatus
  cota_restante: number
}

export interface CustomerCombo {
  id: string
  comboId: string
  servicos_restantes: number
}