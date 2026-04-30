import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, uploadFoto } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const statusBadge = { novo: 'badge-blue', em_andamento: 'badge-amber', concluido: 'badge-teal', em_revisao: 'badge-orange' }
const statusLabel = { novo: 'Novo', em_andamento: 'Em andamento', concluido: 'Concluído', em_revisao: 'Em revisão' }

export function RelatoriosList({ obraId }) {
  const { profile } = useAuth()
  const [obras, setObras] = useState([])
  const [obraSelecionada, setObraSelecionada] = useState(null)
  const [relatorios, setRelatorios] = useState([])
  const [loading, setLoading] = useState(false)
  const [filtroSetor, setFiltroSetor] = useState('')

  useEffect(() => { loadObras() }, [])
  useEffect(() => { if (obraSelecionada) loadRelatorios() }, [obraSelecionada, filtroSetor])

  async function loadObras() {
    const { data } = await supabase
      .from('obra_membros')
      .select('obra_id, obras(*)')
      .eq('user_id', profile.id)
    const lista = data?.map(d => d.obras).filter(Boolean) || []
    setObras(lista)
    if (lista.length > 0) setObraSelecionada(lista[0])
  }

  async function loadRelatorios() {
    setLoading(true)
    let q = supabase.from('relatorios')
      .select('*, profiles(nome), relatorio_fotos(url)')
      .eq('obra_id', obraSelecionada.id)
      .order('data_relatorio', { ascending: false })
    if (filtroSetor) q = q.eq('setor', filtroSetor)
    const { data } = await q
    setRelatorios(data || [])
    setLoading(false)
  }

  return (
    <div className="page-content">
      <div className="section-header">
        <div className="section-title">Relatórios de serviços realizados</div>
        <Link to="/relatorios/novo" className="btn btn-primary">+ Novo relatório</Link>
      </div>

      {/* Abas de obras */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {obras.map(o => (
          <button key={o.id}
            onClick={() => { setObraSelecionada(o); setFiltroSetor('') }}
            style={{
              padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
              background: obraSelecionada?.id === o.id ? 'var(--orange)' : 'var(--surface)',
              color: obraSelecionada?.id === o.id ? '#fff' : 'var(--muted)',
              border: obraSelecionada?.id === o.id ? '0.5px solid var(--orange)' : '0.5px solid var(--border)',
            }}>
            🏗 {o.nome}
          </button>
        ))}
        {obras.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            Nenhuma obra encontrada. <Link to="/projeto" style={{ color: 'var(--orange)' }}>Criar obra</Link>
          </div>
        )}
      </div>

      {/* Filtro por setor */}
      {obraSelecionada && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            📁 <strong style={{ color: 'var(--text)' }}>{obraSelecionada.nome}</strong>
            {obraSelecionada.endereco && ` · ${obraSelecionada.endereco}`}
          </div>
          <select className="form-input" style={{ width: 170, padding: '7px 10px', marginLeft: 'auto' }}
            value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)}>
            <option value="">Todos os setores</option>
            {['Fundações','Estrutura','Alvenaria','Elétrica','Hidráulica','Acabamento','Outros'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {/* Lista de relatórios */}
      <div className="card">
        {!obraSelecionada ? (
          <div className="empty-state">
            <div style={{ fontSize: 28, marginBottom: 10 }}>🏗</div>
            Selecione uma obra acima para ver os relatórios.
          </div>
        ) : loading ? (
          <div className="loading">Carregando...</div>
        ) : relatorios.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
            Nenhum relatório para esta obra ainda.{' '}
            <Link to="/relatorios/novo" style={{ color: 'var(--orange)' }}>Criar primeiro</Link>
          </div>
        ) : relatorios.map(r => (
          <Link key={r.id} to={`/relatorios/${r.id}`} className="report-item" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ width: 58, height: 58, borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, background: 'var(--gray-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {r.relatorio_fotos?.[0]
                ? <img src={r.relatorio_fotos[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 22 }}>📷</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontWeight: 500, fontSize: 13.5 }}>{r.titulo}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', marginLeft: 8 }}>
                  {new Date(r.data_relatorio).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{r.profiles?.nome} · {r.setor}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.descricao}</div>
            </div>
            <span className={`badge ${statusBadge[r.status] || 'badge-gray'}`} style={{ marginLeft: 8, flexShrink: 0 }}>
              {statusLabel[r.status] || r.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function RelatorioDetail({ obraId }) {
  const { id } = useParams()
  const [rel, setRel] = useState(null)
  const [fotos, setFotos] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { load() }, [id])

  async function load() {
    const [{ data: r }, { data: f }] = await Promise.all([
      supabase.from('relatorios').select('*, profiles(nome, role), obras(nome)').eq('id', id).single(),
      supabase.from('relatorio_fotos').select('*').eq('relatorio_id', id),
    ])
    setRel(r)
    setFotos(f || [])
    setLoading(false)
  }

  if (loading) return <div className="loading">Carregando relatório...</div>
  if (!rel) return <div className="loading">Relatório não encontrado.</div>

  const initials = rel.profiles?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'

  return (
    <div className="page-content">
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-sm" onClick={() => navigate('/relatorios')}>← Voltar</button>
        <span className={`badge ${statusBadge[rel.status] || 'badge-gray'}`}>{statusLabel[rel.status] || rel.status}</span>
        <span className="badge badge-blue">{rel.setor}</span>
        {rel.obras?.nome && <span className="badge badge-gray">🏗 {rel.obras.nome}</span>}
        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>
          {new Date(rel.data_relatorio).toLocaleDateString('pt-BR')}
        </span>
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">{rel.titulo}</span></div>
        <div style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'var(--gray-light)', borderRadius: 'var(--radius-sm)', marginBottom: 18 }}>
            <div className="avatar" style={{ background: 'var(--orange-light)', color: 'var(--orange)', width: 40, height: 40, fontSize: 14 }}>{initials}</div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{rel.profiles?.nome}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{rel.profiles?.role} · {rel.setor}</div>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div className="form-label">Atividades realizadas</div>
            <p style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{rel.descricao}</p>
          </div>
          {rel.materiais && (
            <div style={{ marginBottom: 16 }}>
              <div className="form-label">Materiais utilizados</div>
              <p style={{ fontSize: 14 }}>{rel.materiais}</p>
            </div>
          )}
          {rel.observacoes && (
            <div style={{ marginBottom: 16 }}>
              <div className="form-label" style={{ color: 'var(--red)' }}>Observações</div>
              <p style={{ fontSize: 14, background: 'var(--red-light)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>{rel.observacoes}</p>
            </div>
          )}
        </div>
      </div>
      {fotos.length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-title">Fotos ({fotos.length})</span></div>
          <div style={{ padding: 16 }}>
            <div className="photo-grid">
              {fotos.map(f => (
                <a key={f.id} href={f.url} target="_blank" rel="noreferrer">
                  <img src={f.url} alt={f.nome_arquivo} className="photo-thumb" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function NovoRelatorio({ obraId }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fotos, setFotos] = useState([])
  const [previews, setPreviews] = useState([])
  const [form, setForm] = useState({
    titulo: '', setor: '', descricao: '', materiais: '',
    observacoes: '', status: 'novo', obra_id: '',
    data_relatorio: new Date().toISOString().split('T')[0],
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { loadObras() }, [])

  async function loadObras() {
    const { data } = await supabase
      .from('obra_membros')
      .select('obra_id, obras(*)')
      .eq('user_id', profile.id)
    const lista = data?.map(d => d.obras).filter(Boolean) || []
    setObras(lista)
    if (lista.length > 0) set('obra_id', lista[0].id)
  }

  function handleFotos(e) {
    const files = Array.from(e.target.files)
    setFotos(files)
    setPreviews(files.map(f => URL.createObjectURL(f)))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.obra_id) { setError('Selecione uma obra.'); return }
    setLoading(true)
    setError('')
    try {
      const { data: rel, error: relErr } = await supabase.from('relatorios').insert({
        titulo: form.titulo, setor: form.setor, descricao: form.descricao,
        materiais: form.materiais, observacoes: form.observacoes,
        status: form.status, data_relatorio: form.data_relatorio,
        obra_id: form.obra_id, autor_id: profile.id
      }).select().single()
      if (relErr) throw relErr
      for (const foto of fotos) {
        const url = await uploadFoto(foto)
        await supabase.from('relatorio_fotos').insert({ relatorio_id: rel.id, url, nome_arquivo: foto.name })
      }
      navigate(`/relatorios/${rel.id}`)
    } catch (err) {
      setError(err.message || 'Erro ao salvar.')
      setLoading(false)
    }
  }

  return (
    <div className="page-content">
      <div style={{ maxWidth: 680 }}>
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-sm" onClick={() => navigate('/relatorios')}>← Voltar</button>
          <div className="section-title">Novo relatório de serviço</div>
        </div>
        {error && <div className="error-box">{error}</div>}
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div style={{ padding: '20px 22px' }}>
              <div className="form-group">
                <label className="form-label">Obra *</label>
                <select className="form-input" required value={form.obra_id} onChange={e => set('obra_id', e.target.value)}>
                  <option value="">Selecione a obra...</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Data</label>
                  <input type="date" className="form-input" required value={form.data_relatorio}
                    onChange={e => set('data_relatorio', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Setor / Etapa</label>
                  <select className="form-input" required value={form.setor} onChange={e => set('setor', e.target.value)}>
                    <option value="">Selecione...</option>
                    {['Fundações','Estrutura','Alvenaria','Elétrica','Hidráulica','Acabamento','Outros'].map(s => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Título</label>
                <input type="text" className="form-input" required value={form.titulo}
                  onChange={e => set('titulo', e.target.value)}
                  placeholder="Ex: Concretagem da laje 3º pavimento" />
              </div>
              <div className="form-group">
                <label className="form-label">O que foi realizado</label>
                <textarea className="form-input" required value={form.descricao}
                  onChange={e => set('descricao', e.target.value)}
                  placeholder="Descreva detalhadamente as atividades realizadas..."
                  style={{ minHeight: 120 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Materiais utilizados</label>
                <input type="text" className="form-input" value={form.materiais}
                  onChange={e => set('materiais', e.target.value)}
                  placeholder="Ex: 20 sacos de cimento, 100 blocos..." />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="novo">Novo</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="em_revisao">Em revisão</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fotos da atividade</label>
                <label className="upload-area" style={{ display: 'block' }}>
                  <input type="file" accept="image/*" multiple onChange={handleFotos} style={{ display: 'none' }} />
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Clique para adicionar fotos</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>PNG, JPG até 10MB cada</div>
                </label>
                {previews.length > 0 && (
                  <div className="preview-photos">
                    {previews.map((src, i) => <img key={i} src={src} alt="" className="preview-photo" />)}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Observações / Problemas</label>
                <textarea className="form-input" value={form.observacoes}
                  onChange={e => set('observacoes', e.target.value)}
                  placeholder="Algum imprevisto ou observação?" style={{ minHeight: 60 }} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => navigate('/relatorios')}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar relatório'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
