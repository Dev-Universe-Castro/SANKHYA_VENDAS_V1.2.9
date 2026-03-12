"use client"

import { useState, useEffect } from "react"
import { Plus, Minus, Package, ShoppingCart, ChevronRight, Check, Table, Boxes, ChevronDown, ChevronUp, Sparkles } from "lucide-react"
import { EscolherPrecoTabelaModal } from "@/components/escolher-preco-tabela-modal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export interface UnidadeVolume {
  CODVOL: string
  DESCRICAO: string
  QUANTIDADE: number
  isPadrao?: boolean
}

export interface ConfiguracaoProduto {
  quantidade: number
  desconto: number
  preco: number
  unidade: string
  tabelaPreco?: string
  nutab?: number
  acrescimo?: number
  precoBase?: number
  controle?: string
}

export interface TabelaPreco {
  CODTAB: string
  DESCRICAO: string
  NUTAB?: number
  ATIVO?: string
}

export interface ConfiguracaoProdutoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  produto: any | null
  imagemUrl?: string | null
  unidades: UnidadeVolume[]
  tabelasPrecos?: TabelaPreco[]
  configInicial?: Partial<ConfiguracaoProduto>
  onConfirmar: (config: ConfiguracaoProduto) => void
  onVerPrecos?: () => void
  onTabelaPrecoChange?: (codTab: string) => void
  modo?: 'adicionar' | 'editar'
  disabled?: boolean
  maxDesconto?: number
  maxAcrescimo?: number
  politicaAplicada?: any
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function ConfiguracaoProdutoModal({
  open,
  onOpenChange,
  produto,
  imagemUrl,
  unidades,
  tabelasPrecos = [],
  configInicial,
  onConfirmar,
  onVerPrecos,
  onTabelaPrecoChange,
  modo = 'adicionar',
  disabled = false,
  maxDesconto,
  maxAcrescimo,
  politicaAplicada
}: ConfiguracaoProdutoModalProps) {
  const [config, setConfig] = useState<ConfiguracaoProduto>({
    quantidade: 1,
    desconto: 0,
    acrescimo: 0, // Initialize acrescimo
    preco: 0,
    unidade: 'UN',
    tabelaPreco: 'PADRAO'
  })

  const [showEscolherPreco, setShowEscolherPreco] = useState(false)
  const [estoques, setEstoques] = useState<any[]>([])
  const [loadingEstoque, setLoadingEstoque] = useState(false)
  const [politicaAberta, setPoliticaAberta] = useState(false)
  const [estoqueAberto, setEstoqueAberto] = useState(false)

  useEffect(() => {
    if (produto && open) {
      setConfig({
        quantidade: configInicial?.quantidade ?? 1,
        desconto: configInicial?.desconto ?? 0,
        acrescimo: configInicial?.acrescimo ?? 0, // Set acrescimo from configInicial
        preco: configInicial?.preco ?? 0,
        unidade: configInicial?.unidade || 'UN',
        tabelaPreco: configInicial?.tabelaPreco || '',
        nutab: configInicial?.nutab,
        precoBase: configInicial?.precoBase || configInicial?.preco || 0,
        controle: configInicial?.controle || ''
      })
      carregarEstoqueOnline()
    }
  }, [produto, open, configInicial])

  const carregarEstoqueOnline = async () => {
    if (!produto?.CODPROD || !navigator.onLine) {
      setEstoques([])
      return
    }

    setLoadingEstoque(true)
    try {
      const response = await fetch(`/api/sankhya/estoque/live?codProd=${produto.CODPROD}`)
      if (!response.ok) throw new Error('Erro ao buscar estoque live')

      const data = await response.json()
      if (data.estoque && Array.isArray(data.estoque)) {
        setEstoques(data.estoque)
      } else {
        setEstoques([])
      }
    } catch (error) {
      console.error('Erro no carregarEstoqueOnline:', error)
      setEstoques([])
    } finally {
      setLoadingEstoque(false)
    }
  }

  const handleUnidadeChange = (novaUnidade: string) => {
    const volume = unidades.find(u => u.CODVOL === novaUnidade)
    if (volume) {
      // Se não houver preço selecionado, mantém 0 para forçar seleção via tabela
      if (config.preco > 0) {
        const precoBase = config.precoBase ?? produto?.preco ?? produto?.VLRUNIT ?? 0
        const precoAjustado = precoBase * (volume.QUANTIDADE || 1)
        setConfig(prev => ({
          ...prev,
          unidade: novaUnidade,
          preco: precoAjustado
        }))
      } else {
        setConfig(prev => ({ ...prev, unidade: novaUnidade }))
      }
    } else {
      setConfig(prev => ({ ...prev, unidade: novaUnidade }))
    }
  }

  const handleTabelaChange = (novaTabela: string) => {
    setConfig(prev => ({ ...prev, tabelaPreco: novaTabela }))
    if (onTabelaPrecoChange) {
      onTabelaPrecoChange(novaTabela)
    }
  }

  const handlePrecoChange = (novoPreco: number) => {
    const precoBase = config.precoBase || novoPreco; // Use precoBase if available, otherwise the new price itself
    let novoDesconto = 0;
    let novoAcrescimo = 0;

    if (precoBase > 0) {
      if (novoPreco < precoBase) {
        novoDesconto = ((precoBase - novoPreco) / precoBase) * 100;
      } else if (novoPreco > precoBase) {
        novoAcrescimo = ((novoPreco - precoBase) / precoBase) * 100;
      }
    }

    setConfig(prev => ({
      ...prev,
      preco: novoPreco,
      desconto: Number(novoDesconto.toFixed(2)),
      acrescimo: Number(novoAcrescimo.toFixed(2))
    }));
  }

  const handleDescontoChange = (novoDesconto: number) => {
    const precoBase = config.precoBase || config.preco; // Use precoBase or current price as base
    const novoPreco = precoBase * (1 - novoDesconto / 100);

    setConfig(prev => ({
      ...prev,
      desconto: novoDesconto,
      acrescimo: 0, // Reset acrescimo when discount is applied
      preco: Number(novoPreco.toFixed(2))
    }));
  }

  const handleAcrescimoChange = (novoAcrescimo: number) => {
    const precoBase = config.precoBase || config.preco; // Use precoBase or current price as base
    const novoPreco = precoBase * (1 + novoAcrescimo / 100);

    setConfig(prev => ({
      ...prev,
      acrescimo: novoAcrescimo,
      desconto: 0, // Reset desconto when acrescimo is applied
      preco: Number(novoPreco.toFixed(2))
    }));
  }

  const subtotal = config.preco * config.quantidade
  const total = subtotal * (1 - config.desconto / 100)

  const isPrecoValido = config.preco > 0

  if (!produto) return null

  const tabelaSelecionada = tabelasPrecos.find(t =>
    (config.nutab && t.NUTAB && Number(t.NUTAB) === Number(config.nutab)) ||
    (!config.nutab && t.CODTAB === config.tabelaPreco)
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[700px] w-[95vw] p-0 border-0 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:h-auto max-h-[90vh]">
          <DialogTitle className="hidden">Configuração do Produto</DialogTitle>
          <DialogDescription className="hidden">Ajuste a quantidade e detalhes do produto.</DialogDescription>
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F2F2] bg-white sticky top-0 z-50">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                {imagemUrl ? (
                  <img
                    src={imagemUrl}
                    alt={produto.DESCRPROD}
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <Package className="w-6 h-6 text-slate-300" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight truncate max-w-[200px] sm:max-w-md">
                  {produto.DESCRPROD}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 font-medium">Cód: {produto.CODPROD}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                    Estoque: {parseFloat(produto.ESTOQUE || '0').toFixed(0)} {produto.UNIDADE}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto custom-scrollbar bg-slate-50/20">
            <div className="space-y-6">

              {/* 1. SEÇÃO DE INPUTS (Prioridade) */}
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Quantidade */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quantidade</Label>
                    <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden h-12 bg-white shadow-sm">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setConfig(prev => ({ ...prev, quantidade: Math.max(1, prev.quantidade - 1) }))}
                        className="h-full w-12 rounded-none border-r border-slate-100 hover:bg-slate-50 text-slate-500"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <div className="flex-1 text-center font-black text-lg text-slate-800">
                        {config.quantidade}
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setConfig(prev => ({ ...prev, quantidade: prev.quantidade + 1 }))}
                        className="h-full w-12 rounded-none border-l border-slate-100 hover:bg-slate-50 text-slate-500"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Preço Unitário (Editável) */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preço Unitário (BRL)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={config.preco || ''}
                      onChange={(e) => handlePrecoChange(parseFloat(e.target.value) || 0)}
                      className={`h-12 rounded-xl text-base font-bold shadow-sm border-slate-200 focus:ring-[#76BA1B]/20 focus:border-[#76BA1B] ${maxAcrescimo !== undefined &&
                        config.preco > (config.precoBase || 0) &&
                        ((config.preco - (config.precoBase || 0)) / (config.precoBase || 1)) * 100 > maxAcrescimo
                        ? 'border-red-500 bg-red-50 text-red-700' : 'bg-white text-slate-800'
                        }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Desconto */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Desconto (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={config.desconto}
                      onChange={(e) => handleDescontoChange(Math.max(0, parseFloat(e.target.value) || 0))}
                      className={`h-12 rounded-xl text-base font-medium shadow-sm border-slate-200 focus:ring-[#76BA1B]/20 focus:border-[#76BA1B] ${maxDesconto !== undefined && config.desconto > maxDesconto ? 'border-red-500 bg-red-50' : 'bg-white'}`}
                      placeholder="0"
                    />
                    {maxDesconto !== undefined && (
                      <p className={`text-[9px] mt-1 ${config.desconto > maxDesconto ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                        Limite: {maxDesconto}% {config.desconto > maxDesconto && '(Excedido)'}
                      </p>
                    )}
                  </div>

                  {/* Acréscimo */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Acréscimo (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={config.acrescimo || 0}
                      onChange={(e) => handleAcrescimoChange(Math.max(0, parseFloat(e.target.value) || 0))}
                      className={`h-12 rounded-xl text-base font-medium shadow-sm border-slate-200 focus:ring-[#76BA1B]/20 focus:border-[#76BA1B] ${maxAcrescimo !== undefined && (config.acrescimo || 0) > maxAcrescimo ? 'border-red-500 bg-red-50' : 'bg-white'}`}
                      placeholder="0"
                    />
                    {maxAcrescimo !== undefined && (
                      <p className={`text-[9px] mt-1 ${config.acrescimo !== undefined && config.acrescimo > maxAcrescimo ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                        Limite: {maxAcrescimo}%
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Unidade */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unidade</Label>
                    <Select
                      value={config.unidade}
                      onValueChange={handleUnidadeChange}
                    >
                      <SelectTrigger className="h-12 rounded-xl text-base font-medium shadow-sm border-slate-200 bg-white focus:ring-[#76BA1B]/20">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {unidades && unidades.length > 0 ? (
                          unidades.map((u) => (
                            <SelectItem key={u.CODVOL} value={u.CODVOL}>
                              {u.DESCRICAO}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value={produto.UNIDADE || 'UN'}>
                            {produto.UNIDADE || 'UN'}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Controle */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Controle</Label>
                    <Input
                      type="text"
                      value={config.controle || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, controle: e.target.value }))}
                      placeholder="Lote/Série"
                      className="h-12 rounded-xl text-base shadow-sm border-slate-200 bg-white focus:ring-[#76BA1B]/20"
                    />
                  </div>
                </div>

                {/* Tabela de Preço */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tabela de Preço</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between h-auto py-3 rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-colors"
                    onClick={() => setShowEscolherPreco(true)}
                  >
                    <div className="flex flex-col items-start text-left">
                      <span className="text-[9px] text-[#76BA1B] uppercase font-bold tracking-wider mb-0.5">
                        {config.tabelaPreco === 'PADRAO' ? 'TABELA PADRÃO' : 'TABELA SELECIONADA'}
                      </span>
                      <span className="font-bold text-slate-700 text-sm truncate max-w-[250px]">
                        {tabelaSelecionada ? (tabelaSelecionada.DESCRICAO || `Tabela ${tabelaSelecionada.CODTAB}`) : 'Padrão / Histórico'}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </Button>
                </div>
              </div>

              {/* 2. DADOS DE ANÁLISE (Recolhíveis) */}
              <div className="space-y-3 pt-2">

                {/* Política Comercial (Collapsible) */}
                {politicaAplicada && (
                  <Collapsible open={politicaAberta} onOpenChange={setPoliticaAberta} className="w-full">
                    <Card className="rounded-xl border-emerald-100 bg-white shadow-sm overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-emerald-50/30 transition-colors">
                          <div className="flex items-center gap-2 text-[#1E5128]">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-sm font-bold">Política Comercial</span>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] ml-2 font-bold py-0 h-5">
                              {politicaAplicada.NOME_POLITICA}
                            </Badge>
                          </div>
                          {politicaAberta ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-emerald-400" />}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-1 space-y-3">
                          <ul className="space-y-1.5 border-t border-emerald-50 pt-3">
                            {maxDesconto !== undefined && maxDesconto !== null && maxDesconto > 0 && (
                              <li className="text-xs text-slate-600 flex items-center gap-2">
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="font-semibold text-slate-700">Desconto Máximo:</span> {maxDesconto}%
                              </li>
                            )}
                            {maxAcrescimo !== undefined && maxAcrescimo !== null && maxAcrescimo > 0 && (
                              <li className="text-xs text-slate-600 flex items-center gap-2">
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="font-semibold text-slate-700">Acréscimo Máximo:</span> {maxAcrescimo}%
                              </li>
                            )}
                            {politicaAplicada.RESULT_NUTAB && (
                              <li className="text-xs text-slate-600 flex items-center gap-2">
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="font-semibold text-slate-700">Tabela Fixada:</span> {politicaAplicada.RESULT_NUTAB}
                              </li>
                            )}
                          </ul>
                          {politicaAplicada._evaluationLogs && politicaAplicada._evaluationLogs.length > 0 && (
                            <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                              <p className="text-[9px] font-bold text-emerald-800 uppercase tracking-widest mb-2">Motivos do Match:</p>
                              <ul className="space-y-1">
                                {politicaAplicada._evaluationLogs.filter((log: any) => log.Resultado === '✅ SIM' || log.Score === '+1').map((log: any, idx: number) => (
                                  <li key={idx} className="text-[10px] text-emerald-700 leading-tight flex items-start gap-1">
                                    <span>•</span>
                                    <span><span className="font-bold">{log.Campo}:</span> {log.Motivo}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {/* Estoque Online (Collapsible) */}
                {(loadingEstoque || estoques.length > 0) && (
                  <Collapsible open={estoqueAberto} onOpenChange={setEstoqueAberto} className="w-full">
                    <Card className="rounded-xl border-emerald-100 bg-white shadow-sm overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-emerald-50/30 transition-colors">
                          <div className="flex items-center gap-2 text-[#1E5128]">
                            <Boxes className="w-4 h-4" />
                            <span className="text-sm font-bold">Estoque Online (ERP)</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {loadingEstoque && <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
                            {estoqueAberto ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-emerald-400" />}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-1 space-y-2">
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar border-t border-emerald-50 pt-3">
                            {estoques.map((est, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg gap-3 border border-slate-100">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white text-slate-600 rounded border-slate-200">
                                      Local: {est.codigoLocal}
                                    </Badge>
                                    {est.controle && est.controle.trim() && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500 border-slate-200 rounded">
                                        {est.controle}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <span className={`font-black text-sm whitespace-nowrap px-2.5 py-1 rounded-md ${est.estoque > 0 ? 'text-[#76BA1B]' : 'text-red-500'}`}>
                                  {est.estoque} un
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}
              </div>

              {/* Resumo de Valores */}
              {isPrecoValido ? (
                <div className="border-t border-slate-100 pt-6 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>Subtotal sem impostos</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#1E5128] p-5 rounded-2xl shadow-lg shadow-[#1E5128]/20">
                    <span className="text-sm font-bold text-white/80 uppercase tracking-widest">Valor do Item</span>
                    <span className="text-3xl font-black text-white tracking-tight">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="border-t border-slate-100 pt-6">
                  <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-start gap-3">
                    <Table className="w-5 h-5 text-[#76BA1B] mt-0.5" />
                    <p className="text-sm font-medium text-[#1E5128] leading-snug">
                      Selecione uma <strong>tabela de preço</strong> para calcular o valor e adicionar ao pedido.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#F2F2F2] bg-white flex-shrink-0">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-1/3 h-12 rounded-xl text-sm font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => onConfirmar(config)}
                disabled={disabled || !isPrecoValido}
                className="flex-1 h-12 rounded-xl bg-[#76BA1B] hover:bg-[#1E5128] text-white font-bold transition-all disabled:opacity-50 shadow-sm shadow-[#76BA1B]/20"
              >
                {modo === 'editar' ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Adicionar ao Pedido
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showEscolherPreco && (
        <EscolherPrecoTabelaModal
          open={showEscolherPreco}
          onOpenChange={setShowEscolherPreco}
          produto={produto}
          tabelas={tabelasPrecos}
          onSelect={(tab) => {
            handleTabelaChange(tab.CODTAB)
            handlePrecoChange(tab.PRECO)
            setConfig(prev => ({ ...prev, nutab: tab.NUTAB }))
            setShowEscolherPreco(false)
          }}
        />
      )}
    </>
  )
}
