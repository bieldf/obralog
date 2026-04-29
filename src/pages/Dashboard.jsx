import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'

const statusBadge = { novo: 'badge-blue', em_andamento: 'badge-amber', concluido: 'badge-teal', em_revisao: 'badge-orange' }
const statusLabel = { novo: 'Novo', em_andamento: 'Em andamento', concluido: 'Concluído', em_revisao: 'Em revisão' }
const prioLabel = { alta: 'badge-red', media: 'badge-amber', baixa: 'badge-blue' }

export default function Dashboard({ obraId }) {
  const [stats, setStats] = useState({ relatorios: 0, tarefas: 0, membros: 0 })
  const [relatorios, setRelatorios] = useState([])
  const [tarefas, setTarefas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!obraId) return
    loadData()
  }, [obraId])

  async function loadData() {
    setLoading(true)
    const [{ data: rels }, { data: tasks }, { data: membros }] = await Promise.all([
      supabase.from('relatorios').select('*, profiles(nome, role)').eq('obra_id', obraId).order('created_at', { ascending: false }).limit(5),
      supabase.from('tarefas').select('*, profiles(nome)').eq('obra_id', obraId).neq('status', 'concluida').limit(5),
      supabase.from('obra_membros').select('id').eq('obra_id', obraId),
    ])
    setRelatorios(rels || [])
    setTarefas(tasks || [])
    setStats({ relatorios: rels?.length || 0, tarefas: tasks?.length || 0, membros: membros?.length || 0 })
    setLoading(false)
  }

  if (!obraId) return (
    <div className="page-content">
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🏗</div>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Nenhuma obra encontrada</div>
        <div style={{ marginBottom: 20 }}>Crie ou entre em uma obra para começar.</div>
        <Link to="/projeto" className="btn btn-primary">Criar obra</Link>
      </div>
    </div>
  )

  if (loading) return <div className="loading">Carregando painel...</div>

  return (
    <div className="page-content">
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Relatórios recentes</div>
          <div className="stat-value">{relatorios.length}</div>
          <div className="stat-sub">Últimos 5 registros</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tarefas pendentes</div>
          <div className="stat-value">{tarefas.length}</div>
          <div className="stat-sub" style={{ color: tarefas.filter(t => t.prioridade === 'alta').length > 0 ? 'var(--red)' : 'var(--muted)' }}>
            {tarefas.filter(t => t.prioridade === 'alta').length} de alta prioridade
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Membros na obra</div>
          <div className="stat-value">{stats.membros}</div>
          <div className="stat-sub">Equipe ativa</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Acesso rápido</div>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Link to="/relatorios/novo" className="btn btn-primary btn-sm">+ Novo relatório</Link>
            <Link to="/tarefas" className="btn btn-sm">Ver tarefas</Link>
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Últimos relatórios</span>
              <Link to="/relatorios" className="btn btn-sm">Ver todos</Link>
            </div>
            {relatorios.length === 0 ? (
              <div className="empty-state">Nenhum relatório ainda. <Link to="/relatorios/novo" style={{ color: 'var(--orange)' }}>Criar primeiro</Link></div>
            ) : relatorios.map(r => (
              <Link key={r.id} to={`/relatorios/${r.id}`} className="report-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontWeight: 500, fontSize: 13.5 }}>{r.titulo}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', marginLeft: 8 }}>
                      {new Date(r.data_relatorio).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                    {r.profiles?.nome} · {r.setor}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.descricao}
                  </div>
                </div>
                <span className={`badge ${statusBadge[r.status] || 'badge-gray'}`} style={{ marginLeft: 8, flexShrink: 0 }}>
                  {statusLabel[r.status] || r.status}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Tarefas pendentes</span>
              <Link to="/tarefas" className="btn btn-sm">Ver todas</Link>
            </div>
            {tarefas.length === 0 ? (
              <div className="empty-state">Nenhuma tarefa pendente 🎉</div>
            ) : tarefas.map(t => (
              <div key={t.id} className="task-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{t.titulo}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.profiles?.nome}</div>
                </div>
                <span className={`badge ${prioLabel[t.prioridade] || 'badge-gray'}`}>
                  {t.prioridade}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
