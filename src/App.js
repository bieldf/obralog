import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabase'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { RelatoriosList, RelatorioDetail, NovoRelatorio } from './pages/Relatorios'
import Tarefas from './pages/Tarefas'
import Projeto from './pages/Projeto'
import Equipe from './pages/Equipe'
import Pendencias from './pages/Pendencias'
import './index.css'

const pageTitles = {
  '/': 'Painel Geral',
  '/relatorios': 'Relatórios de serviços realizados',
  '/relatorios/novo': 'Novo relatório',
  '/projeto': 'Projeto & Plantas',
  '/tarefas': 'Tarefas',
  '/equipe': 'Equipe',
  '/pendencias': 'Pendências',
}

function AppShell() {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  const [obra, setObra] = useState(null)
  const [obraId, setObraId] = useState(null)

  useEffect(() => {
    if (user && profile) loadOrCreateObra()
  }, [user, profile])

  async function loadOrCreateObra() {
    const { data: membro } = await supabase
      .from('obra_membros')
      .select('obra_id, obras(*)')
      .eq('user_id', profile.id)
      .limit(1)
      .single()

    if (membro?.obras) {
      setObra(membro.obras)
      setObraId(membro.obras.id)
      return
    }

    if (profile.role === 'engenheiro') {
      const { data: novaObra } = await supabase
        .from('obras')
        .insert({ nome: 'Minha Primeira Obra', criado_por: profile.id, progresso: 0 })
        .select()
        .single()

      if (novaObra) {
        await supabase.from('obra_membros').insert({ obra_id: novaObra.id, user_id: profile.id })
        setObra(novaObra)
        setObraId(novaObra.id)
      }
    }
  }

  async function refreshObra() {
    if (!obraId) return
    const { data } = await supabase.from('obras').select('*').eq('id', obraId).single()
    if (data) setObra(data)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#2C2C2A', color: '#fff', fontFamily: 'sans-serif', fontSize: 18 }}>
      ObraLog…
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  const title = location.pathname.startsWith('/relatorios/') && location.pathname !== '/relatorios/novo'
    ? 'Detalhe do relatório'
    : pageTitles[location.pathname] || 'ObraLog'

  return (
    <div className="app">
      <Sidebar obra={obra} />
      <div className="main">
        <div className="topbar">
          <div className="page-title">{title}</div>
          <div className="topbar-right">
            <a href="/relatorios/novo" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              + Novo Relatório
            </a>
            <div className="avatar" style={{ background: 'var(--orange-light)', color: 'var(--orange)' }}>
              {profile?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
            </div>
          </div>
        </div>
        <Routes>
          <Route path="/" element={<Dashboard obraId={obraId} />} />
          <Route path="/relatorios" element={<RelatoriosList obraId={obraId} />} />
          <Route path="/relatorios/novo" element={<NovoRelatorio obraId={obraId} />} />
          <Route path="/relatorios/:id" element={<RelatorioDetail obraId={obraId} />} />
          <Route path="/projeto" element={<Projeto obraId={obraId} obra={obra} onObraUpdate={refreshObra} onObraChange={(o) => { setObra(o); setObraId(o.id) }} />} />
          <Route path="/tarefas" element={<Tarefas obraId={obraId} />} />
          <Route path="/equipe" element={<Equipe obraId={obraId} />} />
          <Route path="/pendencias" element={<Pendencias obraId={obraId} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

function LoginRoute() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/*" element={<AppShell />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
