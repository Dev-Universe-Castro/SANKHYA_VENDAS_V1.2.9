"use client"

import { useState, useEffect } from "react"
import { Plus, ShoppingCart, BarChart3, MessageSquare, Clock, X, Calendar, User, Package } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import PedidoVendaRapido from "@/components/pedido-venda-rapido"
import { DashboardAnaliseClienteModal } from "@/components/dashboard-analise-cliente-modal"
import { DashboardAnaliseProdutoModal } from "@/components/dashboard-analise-produto-modal"

export default function FloatingActionMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [showPedidoModal, setShowPedidoModal] = useState(false)
  const [showAnaliseCliente, setShowAnaliseCliente] = useState(false)
  const [showAnaliseProduto, setShowAnaliseProduto] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Visita Ativa tracker
  const [visitaAtiva, setVisitaAtiva] = useState<{ NOMEPARC?: string } | null>(null)

  const fetchVisitaAtiva = async () => {
    try {
      const res = await fetch('/api/rotas/visitas?status=CHECKIN')
      if (res.ok) {
        const data = await res.json()
        if (data && data.length > 0) {
          setVisitaAtiva(data[0])
        } else {
          const res2 = await fetch('/api/rotas/visitas?status=EM_ANDAMENTO')
          if (res2.ok) {
            const data2 = await res2.json()
            setVisitaAtiva(data2 && data2.length > 0 ? data2[0] : null)
          } else {
            setVisitaAtiva(null)
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar visita ativa:', error)
    }
  }

  useEffect(() => {
    fetchVisitaAtiva()
    const interval = setInterval(fetchVisitaAtiva, 30000)
    return () => clearInterval(interval)
  }, [pathname])

  const handleAction = (action: () => void) => {
    setIsOpen(false)
    action()
  }

  // Visita em andamento (abre modais de checkout usando URL pra tela de rotas)
  const handleVisitaAction = () => {
    setIsOpen(false)
    router.push('/dashboard/rotas?openAction=checkout')
  }

  return (
    <>
      {/* Overlay Backdrop - opcional para escurecer o fundo, mas pode conflitar se o usuário quiser clicar fora.
          Como WhatsApp não usa, vamos deixar sem. Ou com um blur suave.
      */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-sm transition-all"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className="fixed bottom-24 right-6 z-[100] flex flex-col items-end gap-3">
        {/* Menu de Opções */}
        <div
          className={cn(
            "flex flex-col gap-3 transition-all duration-300 ease-out items-end origin-bottom",
            isOpen
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : "opacity-0 translate-y-8 scale-90 pointer-events-none"
          )}
        >
          {/* 1. Visita Ativa (se existir) - Desenhado como banner diferente para chamar atenção */}
          {visitaAtiva && (
            <div className="flex items-center gap-3">
              <span className="bg-white px-3 py-1.5 rounded-lg shadow-md border border-slate-100 text-xs font-bold text-slate-700 whitespace-nowrap hidden sm:block">
                Visita em Curso: {visitaAtiva.NOMEPARC}
              </span>
              <Button
                onClick={handleVisitaAction}
                className="h-[52px] w-[52px] rounded-full shadow-lg hover:shadow-xl transition-all bg-green-600 hover:bg-green-700 text-white rounded-full p-0 flex items-center justify-center border-2 border-white"
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  <Clock className="w-6 h-6 animate-pulse" />
                  <div className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border border-white animate-bounce" />
                </div>
              </Button>
            </div>
          )}

          {/* 2. Novo Pedido */}
          <div className="flex items-center gap-3 group translate-y-0 translate-x-0" style={{ transitionDelay: isOpen ? "150ms" : "0ms" }}>
            <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-xs font-semibold text-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
              Novo Pedido Rápido
            </span>
            <Button
              onClick={() => handleAction(() => setShowPedidoModal(true))}
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all bg-[#1E5128] hover:bg-[#153a1c] text-white p-0"
            >
              <ShoppingCart className="h-5 w-5" />
            </Button>
          </div>

          {/* 3. Nova Tarefa */}
          <div className="flex items-center gap-3 group" style={{ transitionDelay: isOpen ? "120ms" : "0ms" }}>
            <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-xs font-semibold text-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
              Nova Tarefa
            </span>
            <Button
              onClick={() => handleAction(() => router.push('/dashboard/calendario?novaTarefa=true'))}
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all bg-[#0d9488] hover:bg-[#0f766e] text-white p-0"
            >
              <Calendar className="h-5 w-5" />
            </Button>
          </div>

          {/* 4. IA Assistente */}
          <div className="flex items-center gap-3 group" style={{ transitionDelay: isOpen ? "90ms" : "0ms" }}>
            <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-xs font-semibold text-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
              IA Assistente (Chat)
            </span>
            <Button
              onClick={() => handleAction(() => router.push('/dashboard/chat'))}
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all bg-[#6366f1] hover:bg-[#4f46e5] text-white p-0"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          </div>

          {/* 5. IA Análise de Dados */}
          <div className="flex items-center gap-3 group" style={{ transitionDelay: isOpen ? "60ms" : "0ms" }}>
            <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-xs font-semibold text-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
              IA Análise de Dados
            </span>
            <Button
              onClick={() => handleAction(() => router.push('/dashboard/analise'))}
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all bg-[#8b5cf6] hover:bg-[#7c3aed] text-white p-0"
            >
              <BarChart3 className="h-5 w-5" />
            </Button>
          </div>

          {/* 6. IA Clientes */}
          <div className="flex items-center gap-3 group" style={{ transitionDelay: isOpen ? "30ms" : "0ms" }}>
            <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-xs font-semibold text-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
              Análise de Giro de Cliente
            </span>
            <Button
              onClick={() => handleAction(() => setShowAnaliseCliente(true))}
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all bg-emerald-500 hover:bg-emerald-600 text-white p-0"
            >
              <User className="h-5 w-5" />
            </Button>
          </div>

          {/* 7. IA Produtos */}
          <div className="flex items-center gap-3 group" style={{ transitionDelay: isOpen ? "0ms" : "0ms" }}>
            <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-100 text-xs font-semibold text-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
              Análise de Giro de Produto
            </span>
            <Button
              onClick={() => handleAction(() => setShowAnaliseProduto(true))}
              className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all bg-emerald-500 hover:bg-emerald-600 text-white p-0"
            >
              <Package className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Botão Principal FAB */}
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-[60px] w-[60px] rounded-full shadow-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 transform",
            isOpen ? "rotate-135 bg-slate-800 hover:bg-slate-900" : "bg-[#76BA1B] hover:bg-[#6CA81A]"
          )}
          size="icon"
        >
          {isOpen ? <X className="h-7 w-7 text-white" /> : <Plus className="h-7 w-7 text-white" />}
        </Button>
      </div>

      {/* Modais Globais do FAB */}
      <PedidoVendaRapido
        isOpen={showPedidoModal}
        onClose={() => setShowPedidoModal(false)}
      />
      <DashboardAnaliseClienteModal
        isOpen={showAnaliseCliente}
        onClose={() => setShowAnaliseCliente(false)}
      />
      <DashboardAnaliseProdutoModal
        isOpen={showAnaliseProduto}
        onClose={() => setShowAnaliseProduto(false)}
      />
    </>
  )
}