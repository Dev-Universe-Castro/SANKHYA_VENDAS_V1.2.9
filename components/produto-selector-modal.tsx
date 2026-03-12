"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { QuantidadeProdutoModal } from "@/components/quantidade-produto-modal"
import { toast } from "sonner"
import { OfflineDataService } from "@/lib/offline-data-service"; // Import OfflineDataService
import { Eye } from "lucide-react"
import { ProdutoDetalhesModal } from "@/components/produto-detalhes-modal"
import { Button } from "@/components/ui/button"
import { resolveBestPolicy, PolicyContext } from "@/lib/policy-engine"
import { PoliticaComercial } from "@/lib/politicas-comerciais-service"

interface ProdutoSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (produto: any, preco: number, quantidade: number, tabela?: string, desconto?: number, controle?: string, localEstoque?: number, maxDesconto?: number, maxAcrescimo?: number, precoBase?: number, politicaAplicada?: PoliticaComercial) => void
  titulo?: string
  idEmpresa?: string | number
  codParc?: string | number
  codEmp?: number
  codVend?: number
  codTipVenda?: number
  codEquipe?: number
}

interface TabelaPreco {
  NUTAB: number
  CODTAB: number
  DTVIGOR?: string
  PERCENTUAL?: number
  DESCRICAO?: string
  ATIVO?: string
}

interface Produto {
  CODPROD?: string;
  DESCRPROD?: string;
  MARCA?: string;
  CODMARCA?: number;
  CODGRUPOPROD?: number;
  ATIVO?: string;
  AD_VLRUNIT?: number;
  VLRVENDA?: number; // Adicionado para buscar preço base diretamente do produto
  PRECO?: number; // Adicionado para buscar preço base diretamente do produto
}

export function ProdutoSelectorModal({
  isOpen,
  onClose,
  onConfirm,
  titulo = "Adicionar Produto",
  idEmpresa,
  codParc,
  codEmp,
  codVend,
  codTipVenda,
  codEquipe
}: ProdutoSelectorModalProps) {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showEstoqueModal, setShowEstoqueModal] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [produtoEstoque, setProdutoEstoque] = useState<number>(0)
  const [produtoPreco, setProdutoPreco] = useState<number>(0)
  const [tabelasPreco, setTabelasPreco] = useState<TabelaPreco[]>([])
  const [tabelaSelecionada, setTabelaSelecionada] = useState<string>('0')
  const [loadingPreco, setLoadingPreco] = useState(false); // State to track price loading
  const [showDetalhesModal, setShowDetalhesModal] = useState(false)
  const [produtoDetalhes, setProdutoDetalhes] = useState<Produto | null>(null)
  const [maxDescontoPolitica, setMaxDescontoPolitica] = useState<number | undefined>(undefined)
  const [maxAcrescimoPolitica, setMaxAcrescimoPolitica] = useState<number | undefined>(undefined)
  const [politicaAplicada, setPoliticaAplicada] = useState<PoliticaComercial | undefined>(undefined)


  // Função para normalizar texto (remover acentos)
  const normalizarTexto = (texto: string) => {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  }

  const buscarProdutos = async (termo: string) => {
    console.log('🔍 buscarProdutos chamado com:', termo);

    // Validar se tabela de preço foi selecionada
    if (!tabelaSelecionada || tabelaSelecionada === '') {
      toast.error("Selecione uma tabela de preço antes de buscar produtos")
      return
    }

    if (termo.length < 2) {
      console.log('⚠️ Termo muito curto, limpando lista');
      setProdutos([])
      return
    }

    try {
      setIsLoading(true)
      console.log('⏳ Iniciando busca no cache...');

      // Modo offline - buscar do IndexedDB
      // SEMPRE buscar do IndexedDB (online ou offline)
      console.log('💾 Buscando produtos do IndexedDB...');
      const produtosOffline = await OfflineDataService.getProdutos({ ativo: 'S', search: termo });

      if (produtosOffline.length > 0) {
        const filtered = produtosOffline.slice(0, 20);
        console.log('✅ Produtos encontrados no IndexedDB:', filtered.length);
        setProdutos(filtered);
      } else {
        // Modo online - buscar do cache local (sessionStorage)
        const cachedProdutos = sessionStorage.getItem('cached_produtos')
        if (cachedProdutos) {
          try {
            const parsedData = JSON.parse(cachedProdutos)
            console.log('📦 Tipo de dados do cache:', typeof parsedData, Array.isArray(parsedData))

            const allProdutos = Array.isArray(parsedData) ? parsedData : (parsedData.produtos || [])
            console.log('📊 Total de produtos no cache:', allProdutos.length)

            const termoNormalizado = normalizarTexto(termo)

            const filtered = allProdutos.filter((p: Produto) => {
              const descricaoNormalizada = normalizarTexto(p.DESCRPROD || '')
              const matchDescr = descricaoNormalizada.includes(termoNormalizado)
              const matchCod = p.CODPROD?.toString().includes(termo)
              return matchDescr || matchCod
            }).slice(0, 20)

            console.log('✅ Produtos filtrados:', filtered.length)
            setProdutos(filtered)
          } catch (e) {
            console.error('❌ Erro ao processar cache:', e);
            setProdutos([])
          }
        } else {
          console.warn('⚠️ Cache de produtos não encontrado. Tente novamente.');
          setProdutos([])
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar produtos:', error)
      setProdutos([])
    } finally {
      setIsLoading(false)
      console.log('🏁 Busca finalizada');
    }
  }

  const buscarProdutosComDebounce = (() => {
    let timer: NodeJS.Timeout
    return (termo: string) => {
      console.log('⏱️ Debounce chamado com:', termo);
      clearTimeout(timer)
      timer = setTimeout(() => {
        console.log('✅ Debounce executando busca para:', termo);
        buscarProdutos(termo)
      }, 500)
    }
  })()

  const handleSelecionarProduto = async (produto: Produto) => {
    console.log('🔍 Selecionando produto:', produto.CODPROD, 'Tabela:', tabelaSelecionada)
    setProdutoSelecionado(produto)
    setIsLoading(true)

    try {
      // Validar se tabela de preço foi selecionada
      if (!tabelaSelecionada || tabelaSelecionada === '' || tabelaSelecionada === '0') {
        toast.error("Selecione uma tabela de preço antes de adicionar produtos")
        setIsLoading(false)
        return
      }

      // === MOTOR DE POLÍTICAS ===
      if (codEmp && codParc) {
        try {
          const politicas = await OfflineDataService.getPoliticas(Number(codEmp));
          if (politicas && politicas.length > 0) {
            const parceiros = await OfflineDataService.getClientesByIds([Number(codParc)]);
            const parceiro = parceiros.length > 0 ? parceiros[0] : null;

            if (parceiro) {
              const context: PolicyContext = {
                codEmp: Number(codEmp), // STRICTLY use codEmp prop as requested
                codParc: Number(codParc),
                uf: parceiro.UF,
                codCid: parceiro.CODCID,
                codBai: parceiro.CODBAIRRO || parceiro.CODBAI,
                codReg: parceiro.CODREG,
                codProd: Number(produto.CODPROD),
                marca: produto.CODMARCA || produto.MARCA,
                codVend: codVend ? Number(codVend) : Number(parceiro.CODVEND || 0),
                codEquipe: codEquipe ? Number(codEquipe) : undefined,
                grupo: Number(produto.CODGRUPOPROD || 0),
                codTipVenda: codTipVenda ? Number(codTipVenda) : undefined
              };

              const melhorPolitica = resolveBestPolicy(politicas, context);
              if (melhorPolitica) {
                console.log('🏆 [PolicyEngine] Melhor política:', melhorPolitica.NOME_POLITICA);
                setPoliticaAplicada(melhorPolitica);

                if (melhorPolitica.RESULT_NUTAB) {
                  setTabelaSelecionada(String(melhorPolitica.RESULT_NUTAB));
                  console.log('📉 [PolicyEngine] Forçando tabela:', melhorPolitica.RESULT_NUTAB);
                }
                // else {
                //   Não usar fallback de parceiro. Se a política não tiver tabela, user deve selecionar ou não tem preço.
                // }

                if (melhorPolitica.RESULT_PERCDESCONTO_MAX !== undefined && melhorPolitica.RESULT_PERCDESCONTO_MAX !== null) {
                  setMaxDescontoPolitica(melhorPolitica.RESULT_PERCDESCONTO_MAX);
                } else {
                  setMaxDescontoPolitica(undefined);
                }

                if (melhorPolitica.RESULT_PERCACIMA_MAX !== undefined && melhorPolitica.RESULT_PERCACIMA_MAX !== null) {
                  setMaxAcrescimoPolitica(melhorPolitica.RESULT_PERCACIMA_MAX);
                } else {
                  setMaxAcrescimoPolitica(undefined);
                }
              } else {
                console.warn('⚠️ Nenhuma política encontrada. A tabela deve ser selecionada manualmente ou via prop.');
                // Não reverter para defaults do parceiro aqui.
                setMaxDescontoPolitica(undefined);
                setMaxAcrescimoPolitica(undefined);
                setPoliticaAplicada(undefined);
              }
            } else {
              // Sem parceiro para resolver contexto
            }
          }
        } catch (e) {
          console.error('Erro política:', e);
        }
      }

      let estoqueTotal = 0;
      let preco = 0;

      console.log('💾 Buscando dados do IndexedDB...');
      console.log('🔍 Parâmetros: CODPROD =', produto.CODPROD, '(tipo:', typeof produto.CODPROD, ')');
      console.log('🔍 Parâmetros: NUTAB =', tabelaSelecionada, '(tipo:', typeof tabelaSelecionada, ')');



      // Buscar preço do IndexedDB com a tabela selecionada
      const codProdNumber = Number(produto.CODPROD);
      const nutabNumber = Number(tabelaSelecionada);
      console.log('💰 Iniciando busca de preço...');
      console.log('💰 CODPROD:', codProdNumber, '(tipo:', typeof codProdNumber, ')');
      console.log('💰 NUTAB:', nutabNumber, '(tipo:', typeof nutabNumber, ')');
      console.log('💰 Tabela selecionada (original):', tabelaSelecionada);

      // Validar se os valores são válidos
      if (!codProdNumber || codProdNumber <= 0) {
        console.error('❌ CODPROD inválido:', codProdNumber);
        preco = 0;
      } else if (!nutabNumber || nutabNumber <= 0) {
        console.error('❌ NUTAB inválido:', nutabNumber);
        preco = 0;
      } else {
        console.log('✅ Valores válidos, buscando preço...');

        const excecoesPreco = await OfflineDataService.getPrecos(codProdNumber, nutabNumber);

        console.log('📊 Total de exceções encontradas:', excecoesPreco.length);

        if (excecoesPreco.length > 0) {
          const excecao = excecoesPreco[0];
          console.log('📋 Exceção completa:', JSON.stringify(excecao, null, 2));
          console.log('💵 VLRVENDA bruto:', excecao.VLRVENDA, '(tipo:', typeof excecao.VLRVENDA, ')');

          if (excecao.VLRVENDA !== null && excecao.VLRVENDA !== undefined) {
            // Converter o valor para string, remover vírgulas e converter para número
            let vlrVendaStr = String(excecao.VLRVENDA).trim();
            console.log('🔧 VLRVENDA string original:', vlrVendaStr);

            // Substituir vírgula por ponto
            vlrVendaStr = vlrVendaStr.replace(/,/g, '.');
            console.log('🔧 VLRVENDA após replace:', vlrVendaStr);

            preco = parseFloat(vlrVendaStr);
            console.log('🔧 VLRVENDA parseado:', preco);

            if (isNaN(preco) || preco < 0) {
              console.warn('⚠️ Preço inválido após conversão:', excecao.VLRVENDA);
              preco = 0;
            } else {
              console.log('✅ Preço encontrado no IndexedDB: R$', preco.toFixed(2));
            }
          } else {
            console.warn('⚠️ VLRVENDA é null ou undefined');
            preco = 0;
          }
        } else {
          console.warn('⚠️ Nenhuma exceção encontrada no IndexedDB');
          preco = 0;
        }
      }

      // Fallback: buscar da API se online e não encontrou no IndexedDB
      if (navigator.onLine && preco === 0) {
        console.log('🌐 Buscando preço da API como fallback...');
        try {
          const response = await fetch(`/api/oracle/preco?codProd=${produto.CODPROD}&nutab=${tabelaSelecionada}`);
          if (response.ok) {
            const data = await response.json();
            const precoApi = parseFloat(data.preco || '0');
            if (precoApi > 0) {
              preco = precoApi;
              console.log('💰 Preço obtido da API: R$', preco.toFixed(2));
            }
          }
        } catch (apiError) {
          console.error('❌ Erro ao buscar preço da API:', apiError);
        }
      }

      // Se ainda não encontrou preço, mostrar aviso
      if (preco === 0) {
        console.warn('⚠️ Nenhum preço disponível para este produto/tabela');
        toast.error('Preço não encontrado para este produto na tabela selecionada', {
          description: `Produto: ${produto.CODPROD} - Tabela: ${tabelaSelecionada}`
        })
      }


      setProdutoPreco(preco)
      setShowEstoqueModal(true)

      console.log('✅ Dados carregados - Estoque:', estoqueTotal, 'Preço: R$', preco.toFixed(2));

    } catch (error: any) {
      console.error('❌ Erro ao carregar dados do produto:', error)
      console.error('❌ Stack trace:', error.stack);

      setProdutoPreco(0)
      setShowEstoqueModal(true)
      toast.error('Erro ao carregar dados do produto')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmarEstoque = (produto: any, preco: number, quantidade: number, tabela?: string, desconto?: number, controle?: string, localEstoque?: number, maxDesconto?: number, maxAcrescimo?: number, precoBase?: number) => {
    setShowEstoqueModal(false)
    setProdutoSelecionado(null)

    setProdutoPreco(0)
    // Pass table and other details to parent including precoBase and politicaAplicada
    onConfirm(produto, preco, quantidade, tabelaSelecionada, desconto, controle, localEstoque, maxDesconto || maxDescontoPolitica, maxAcrescimo || maxAcrescimoPolitica, precoBase, politicaAplicada)
    setProdutos([])
    onClose()
  }

  const abrirDetalhes = (e: React.MouseEvent, produto: Produto) => {
    e.stopPropagation()
    setProdutoDetalhes(produto)
    setShowDetalhesModal(true)
  }

  const handleCancelarEstoque = () => {
    setShowEstoqueModal(false)
    setProdutoSelecionado(null)

    setProdutoPreco(0)
  }

  const carregarTabelasPrecos = async () => {
    try {
      if (!navigator.onLine) {
        console.log('📱 Modo offline - carregando tabelas de preço do cache local');
        const tabelasOffline = await OfflineDataService.getTabelasPrecosConfig();

        const tabelasFormatadas = tabelasOffline.map((config: any) => ({
          NUTAB: config.NUTAB,
          CODTAB: config.CODTAB,
          DESCRICAO: config.DESCRICAO,
          ATIVO: config.ATIVO
        }));

        setTabelasPreco(tabelasFormatadas);
        console.log('✅ Tabelas de preço carregadas do cache (offline):', tabelasFormatadas.length);

        if (tabelasFormatadas.length > 0 && !tabelaSelecionada) {
          setTabelaSelecionada(String(tabelasFormatadas[0].NUTAB));
        }
        return;
      }

      // Buscar do cache primeiro (sessionStorage)
      const cached = sessionStorage.getItem('cached_tabelasPrecosConfig')
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached)
          const configs = Array.isArray(parsedCache) ? parsedCache : (parsedCache.configs || parsedCache.data || [])

          const tabelasFormatadas = configs.map((config: any) => ({
            NUTAB: config.NUTAB,
            CODTAB: config.CODTAB,
            DESCRICAO: config.DESCRICAO,
            ATIVO: config.ATIVO
          }))

          setTabelasPreco(tabelasFormatadas)
          console.log('✅ Tabelas de preço configuradas carregadas do cache:', tabelasFormatadas.length)

          if (tabelasFormatadas.length > 0 && !tabelaSelecionada) {
            setTabelaSelecionada(String(tabelasFormatadas[0].NUTAB))
          }
          return
        } catch (e) {
          console.warn('⚠️ Erro ao processar cache de tabelas de preços configuradas')
          sessionStorage.removeItem('cached_tabelasPrecosConfig')
        }
      }

      // Se não houver cache, buscar da API
      const response = await fetch('/api/tabelas-precos-config')
      if (!response.ok) throw new Error('Erro ao carregar tabelas de preços configuradas')
      const data = await response.json()
      const tabelas = data.configs || []

      const tabelasFormatadas = tabelas.map((config: any) => ({
        NUTAB: config.NUTAB,
        CODTAB: config.CODTAB,
        DESCRICAO: config.DESCRICAO,
        ATIVO: config.ATIVO
      }))

      setTabelasPreco(tabelasFormatadas)
      console.log('✅ Tabelas de preço configuradas carregadas:', tabelasFormatadas.length)

      if (tabelasFormatadas.length > 0 && !tabelaSelecionada) {
        setTabelaSelecionada(String(tabelasFormatadas[0].NUTAB))
      }
    } catch (error) {
      console.error('❌ Erro ao carregar tabelas de preços configuradas:', error)
      toast.error("Falha ao carregar tabelas de preços. Verifique as configurações.")
      setTabelasPreco([])
    }
  }

  useEffect(() => {
    if (isOpen) {
      carregarTabelasPrecos()
    } else {
      setProdutos([])
      setProdutoSelecionado(null)
      setProdutoEstoque(0)
      setProdutoPreco(0)
      setTabelaSelecionada('')
    }
  }, [isOpen])

  const buscarPrecoProduto = async (codProd: string | undefined, nutab: string | undefined) => {
    if (!codProd || !nutab || nutab === '0') {
      // Se não houver produto ou tabela selecionada, tenta usar o preço base do produto
      if (produtoSelecionado) {
        console.warn('⚠️ Sem tabela de preço válida, usando preço base do produto');
        const precoBase = Number(produtoSelecionado.VLRVENDA || produtoSelecionado.PRECO || 0);
        setProdutoPreco(precoBase);
      } else {
        setProdutoPreco(0); // Ou algum valor padrão, dependendo da lógica de negócio
      }
      setLoadingPreco(false);
      return;
    }

    setLoadingPreco(true);
    try {
      // Prioriza busca offline no IndexedDB
      if (!navigator.onLine) {
        console.log('📱 Modo offline - buscando preço do cache local');
        const excecoesPrecoOffline = await OfflineDataService.getPrecos(Number(codProd), Number(nutab));
        if (excecoesPrecoOffline.length > 0 && excecoesPrecoOffline[0].VLRVENDA !== null && excecoesPrecoOffline[0].VLRVENDA !== undefined) {
          let vlrVendaStr = String(excecoesPrecoOffline[0].VLRVENDA).trim();
          vlrVendaStr = vlrVendaStr.replace(/,/g, '.');
          const preco = parseFloat(vlrVendaStr);
          if (!isNaN(preco) && preco >= 0) {
            setProdutoPreco(preco);
            console.log('💰 Preço encontrado no IndexedDB (exceção):', preco.toFixed(2));
            setLoadingPreco(false);
            return;
          }
        }

        // Fallback para preço base do produto no IndexedDB se não houver exceção válida
        const produtosOffline = await OfflineDataService.getProdutos({ codProd: codProd });
        if (produtosOffline.length > 0) {
          const precoBase = Number(produtosOffline[0].AD_VLRUNIT || produtosOffline[0].VLRVENDA || produtosOffline[0].PRECO || 0);
          if (precoBase > 0) {
            setProdutoPreco(precoBase);
            console.log('💰 Preço base do produto (offline):', precoBase.toFixed(2));
          } else {
            setProdutoPreco(0);
          }
        } else {
          setProdutoPreco(0);
        }
        setLoadingPreco(false);
        return;
      }

      // Modo Online
      // 1. Tenta buscar do cache (sessionStorage) de exceções de preço
      const cachedExcecoes = sessionStorage.getItem('cached_excecoes_precos');
      if (cachedExcecoes) {
        const excecoesData = JSON.parse(cachedExcecoes);
        const excecoes = Array.isArray(excecoesData) ? excecoesData : (excecoesData.data || []);
        const excecao = excecoes.find((e: any) =>
          String(e.CODPROD) === String(codProd) &&
          String(e.NUTAB) === String(nutab)
        );
        if (excecao && excecao.VLRVENDA !== null && excecao.VLRVENDA !== undefined) {
          let vlrVendaStr = String(excecao.VLRVENDA).trim();
          vlrVendaStr = vlrVendaStr.replace(/,/g, '.');
          const preco = parseFloat(vlrVendaStr);
          if (!isNaN(preco) && preco >= 0) {
            setProdutoPreco(preco);
            console.log('💰 Preço encontrado no cache (sessionStorage - exceção):', preco.toFixed(2));
            setLoadingPreco(false);
            return;
          }
        }
      }

      // 2. Se não encontrou no cache, busca da API
      console.log(`🌐 Buscando preço da API para CODPROD: ${codProd}, NUTAB: ${nutab}`);
      const response = await fetch(`/api/oracle/preco?codProd=${codProd}&nutab=${nutab}`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }
      const data = await response.json();
      const precoApi = parseFloat(data.preco || '0');

      if (precoApi > 0) {
        setProdutoPreco(precoApi);
        console.log('💰 Preço obtido da API:', precoApi.toFixed(2));
      } else {
        // 3. Se a API retornar 0 ou erro, tenta buscar o preço base do produto
        console.warn('⚠️ Preço da API é 0 ou inválido. Tentando preço base do produto.');
        // Tenta buscar o preço base do produto diretamente (pode vir de outra chamada ou estar no `produtoSelecionado`)
        const precoBase = Number(produtoSelecionado?.VLRVENDA || produtoSelecionado?.PRECO || 0);
        if (precoBase > 0) {
          setProdutoPreco(precoBase);
          console.log('💰 Preço base do produto (fallback):', precoBase.toFixed(2));
        } else {
          setProdutoPreco(0);
          console.warn('⚠️ Preço base do produto também não encontrado.');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao buscar preço:', error);
      setProdutoPreco(0); // Garante que o preço seja 0 em caso de erro
      // Se o erro for na API, tenta o preço base como fallback
      if (navigator.onLine && produtoSelecionado) {
        console.warn('🌐 Erro na API, tentando preço base do produto como último recurso.');
        const precoBase = Number(produtoSelecionado.VLRVENDA || produtoSelecionado.PRECO || 0);
        if (precoBase > 0) {
          setProdutoPreco(precoBase);
          console.log('💰 Preço base do produto (fallback após erro API):', precoBase.toFixed(2));
        } else {
          setProdutoPreco(0);
        }
      }
    } finally {
      setLoadingPreco(false);
    }
  }

  return (
    <>
      <Dialog open={isOpen && !showEstoqueModal} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]" data-produto-selector style={{ zIndex: 50 }}>
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription className="hidden">
              Pesquise e selecione um produto para adicionar ao pedido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {tabelasPreco.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Tabela de Preço</Label>
                <Select
                  value={tabelaSelecionada}
                  onValueChange={(value) => {
                    setTabelaSelecionada(value);
                    // Chama buscarPrecoProduto com os dados corretos quando a tabela muda
                    if (produtoSelecionado?.CODPROD) {
                      buscarPrecoProduto(produtoSelecionado.CODPROD, value);
                    } else {
                      // Se nenhum produto estiver selecionado, mas a tabela mudar, resetar preço
                      setProdutoPreco(0);
                    }
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione a tabela de preço" />
                  </SelectTrigger>
                  <SelectContent>
                    {tabelasPreco.map((tabela) => (
                      <SelectItem key={tabela.NUTAB} value={String(tabela.NUTAB)}>
                        {tabela.CODTAB} - NUTAB {tabela.NUTAB}
                        {tabela.DESCRICAO && ` - ${tabela.DESCRICAO}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-orange-600 font-medium">
                ⚠️ Não há tabelas de preço configuradas.
              </div>
            )}
            <Input
              placeholder={!tabelaSelecionada || tabelaSelecionada === '' || tabelaSelecionada === '0' ? "Selecione uma tabela de preço válida primeiro" : "Digite pelo menos 2 caracteres para buscar..."}
              onChange={(e) => buscarProdutosComDebounce(e.target.value)}
              className="text-sm"
              disabled={!tabelaSelecionada || tabelaSelecionada === '' || tabelaSelecionada === '0'}
              autoFocus={tabelaSelecionada !== '' && tabelaSelecionada !== '0'}
            />
            <div className="max-h-96 overflow-y-auto space-y-2">
              {!tabelaSelecionada || tabelaSelecionada === '' || tabelaSelecionada === '0' ? (
                <div className="text-center py-8 text-sm text-orange-600 font-medium">
                  ⚠️ Selecione uma tabela de preço válida para buscar produtos
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center gap-2 py-8">
                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Buscando produtos...</span>
                </div>
              ) : produtos.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Digite pelo menos 2 caracteres para buscar produtos
                </div>
              ) : (
                produtos.map((produto) => (
                  <Card
                    key={produto.CODPROD}
                    className="cursor-pointer hover:bg-green-50 transition-colors"
                    onClick={() => handleSelecionarProduto(produto)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex-1 min-w-0" onClick={() => handleSelecionarProduto(produto)}>
                          <p className="font-medium text-sm truncate">{produto.CODPROD} - {produto.DESCRPROD}</p>
                          {produto.MARCA && (
                            <p className="text-xs text-muted-foreground mt-1">Marca: {produto.MARCA}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0"
                          onClick={(e) => abrirDetalhes(e, produto)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {produtoDetalhes && (
        <ProdutoDetalhesModal
          isOpen={showDetalhesModal}
          onClose={() => {
            setShowDetalhesModal(false)
            setProdutoDetalhes(null)
          }}
          produto={produtoDetalhes}
        />
      )}

      {showEstoqueModal && produtoSelecionado && (
        <QuantidadeProdutoModal
          isOpen={showEstoqueModal}
          onClose={handleCancelarEstoque}
          product={produtoSelecionado}
          onConfirm={handleConfirmarEstoque}
          preco={produtoPreco}
          maxDesconto={maxDescontoPolitica}
          maxAcrescimo={maxAcrescimoPolitica}
          politicaAplicada={politicaAplicada}
        />
      )}
    </>
  )
}