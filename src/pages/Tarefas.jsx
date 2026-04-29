import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const prioColor = { alta: 'badge-red', media: 'badge-amber', baixa: 'badge-blue' }
const statusColor = { pendente: 'badge-gray', em_andamento: 'badge-amber', concluida: 'badge-teal' }

export default function Tarefas({ obraId }) {
  const { profile } = useAuth()
  const [tarefas, setTarefas] = useState([])
  const [membros, setMembros] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ titulo: '', descricao: '', prioridade: 'media', prazo: '', responsavel_id: '' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { if (obraId) load() }, [obraId])

  async function load() {
    setLoading(true)
    const [{ data: ts }, { data: ms }] = await Promise.all([
      supabase.from('tarefas').select('*, profiles(nome)').eq('obra_id', obraId).order('created_at', { ascending: false }),
      supabase.from('obra_membros').select('profiles(id, nome)').eq('obra_id', obraId),
    ])
    setTarefas(ts || [])
    setMembros(ms?.map(m => m.profiles).filter(Boolean) || [])
    setLoading(false)
  }

  async function criar(e) {
    e.preventDefault()
    const { error } = await supabase.from('tarefas').insert({ ...form, obra_id: obraId })
    if (!error) { setModal(false); setForm({ titulo: '', descricao: '', prioridade: 'media', prazo: '', responsavel_id: '' }); load() }
  }

  async function toggleStatus(tarefa) {
    const next = tarefa.status === 'concluida' ? 'pendente' : tarefa.status === 'pendente' ? 'em_andamento' : 'concluida'
    await supabase.from('tarefas').update({ status: next }).eq('id', tarefa.id)
    load()
  }

  const grupos = {
    pendente: tarefas.filter(t => t.status === 'pendente'),
    em_andamento: tarefas.filter(t => t.status === 'em_andamento'),
    concluida: tarefas.filter(t => t.status === 'concluida'),
  }

  const grupoLabel = { pendente: 'Pendentes', em_andamento: 'Em andamento', concluida: 'Concluídas' }

  if (loading) return <div className="loading">Carregando tarefas...</div>

  return (
    <div className="page-content">
      <div className="section-header">
        <div className="section-title">Tarefas</div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Nova tarefa</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {Object.entries(grupos).map(([status, items]) => (
          <div key={status}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span className={`badge ${statusColor[status]}`}>{grupoLabel[status]}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>({items.length})</span>
            </div>
            <div className="card">
              {items.length === 0
                ? <div className="empty-state" style={{ padding: '20px 10px', fontSize: 12 }}>Nenhuma</div>
                : items.map(t => (
                  <div key={t.id} className="task-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{t.titulo}</div>
                      <span className={`badge ${prioColor[t.prioridade]}`} style={{ fontSize: 10 }}>{t.prioridade}</span>
                    </div>
                    {t.descricao && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{t.descricao}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {t.profiles?.nome}
                        {t.prazo && ` · ${new Date(t.prazo).toLocaleDateString('pt-BR')}`}
                      </div>
                      <button className="btn btn-sm" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => toggleStatus(t)}>
                        {status === 'pendente' ? 'Iniciar' : status === 'em_andamento' ? '✓ Concluir' : 'Reabrir'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Nova tarefa</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={criar}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Título</label>
                  <input className="form-input" required value={form.titulo}
                    onChange={e => set('titulo', e.target.value)} placeholder="Descreva a tarefa..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição (opcional)</label>
                  <textarea className="form-input" value={form.descricao}
                    onChange={e => set('descricao', e.target.value)} placeholder="Detalhes adicionais..." style={{ minHeight: 60 }} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Prioridade</label>
                    <select className="form-input" value={form.prioridade} onChange={e => set('prioridade', e.target.value)}>
                      <option value="alta">Alta</option>
                      <option value="media">Média</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prazo</label>
                    <input type="date" className="form-input" value={form.prazo} onChange={e => set('prazo', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Responsável</label>
                  <select className="form-input" value={form.responsavel_id} onChange={e => set('responsavel_id', e.target.value)}>
                    <option value="">Selecione...</option>
                    {membros.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Criar tarefa</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
