import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, uploadFoto } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const statusBadge = { novo: 'badge-blue', em_andamento: 'badge-amber', concluido: 'badge-teal', em_revisao: 'badge-orange' }
const statusLabel = { novo: 'Novo', em_andamento: 'Em andamento', concluido: 'Concluído', em_revisao: 'Em revisão' }

async function gerarPDF(data, relatorios, obraNome) {
  const { data: todasFotos } = await supabase
    .from('relatorio_fotos')
    .select('relatorio_id, url')
    .in('relatorio_id', relatorios.map(r => r.id))

  const fotosPorRelatorio = (todasFotos || []).reduce((acc, f) => {
    if (!acc[f.relatorio_id]) acc[f.relatorio_id] = []
    acc[f.relatorio_id].push(f.url)
    return acc
  }, {})

  const dataFormatada = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const conteudo = relatorios.map((r, idx) => `
    <div class="relatorio">
      <h2>${r.titulo}</h2>
      <p class="meta">${r.setor} · ${r.profiles?.nome || 'Sem autor'} · ${statusLabel[r.status] || r.status}</p>

      <div class="secao">
        <strong>Atividades realizadas:</strong>
        <p>${r.descricao}</p>
      </div>

      ${r.materiais ? `
        <div class="secao cinza">
          <strong>Materiais utilizados:</strong>
          <p>${r.materiais}</p>
        </div>
      ` : ''}

      ${(fotosPorRelatorio[r.id] || []).length > 0 ? `
        <div class="secao">
          <strong>Fotos (${fotosPorRelatorio[r.id].length}):</strong>
          <div class="fotos">
            ${fotosPorRelatorio[r.id].map(url => `
              <img src="${url}" crossorigin="anonymous" />
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${r.observacoes ? `
        <div class="secao alerta">
          <strong>⚠ Observações:</strong>
          <p>${r.observacoes}</p>
        </div>
      ` : ''}
    </div>
  `).join('')

  const janela = window.open('', '_blank')
  janela.document.write(`<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Relatórios ${obraNome} ${data}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; padding: 40px; color: #222; max-width: 800px; margin: 0 auto; }
        .topo { border-bottom: 3px solid #D85A30; padding-bottom: 16px; margin-bottom: 32px; }
        .topo h1 { font-size: 20px; margin-bottom: 6px; }
        .topo p { color: #666; font-size: 13px; margin-top: 3px; }
        .relatorio { margin-bottom: 36px; padding-bottom: 28px; border-bottom: 1.5px solid #ddd; page-break-inside: avoid; }
        .relatorio:last-child { border-bottom: none; }
        .relatorio h2 { color: #D85A30; font-size: 16px; margin-bottom: 4px; }
        .meta { color: #888; font-size: 12px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0; }
        .secao { margin-bottom: 12px; }
        .secao strong { font-size: 13px; display: block; margin-bottom: 4px; }
        .secao p { font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
        .cinza { background: #f9f9f9; padding: 10px; border-radius: 6px; }
        .alerta { background: #FCEBEB; padding: 10px; border-radius: 6px; border-left: 4px solid #A32D2D; }
        .alerta strong { color: #A32D2D; }
        .fotos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
        .fotos img { width: 100%; height: 200px; object-fit: cover; border-radius: 6px; border: 1px solid #eee; }
        .btn-print { position: fixed; top: 16px; right: 16px; background: #D85A30; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; }
        @media print { .btn-print { display: none; } }
      </style>
    </head>
    <body>
      <button class="btn-print" onclick="window.print()">🖨 Imprimir / Salvar PDF</button>
      <div class="topo">
        <h1>Relatório de Serviços Realizados</h1>
        <p>🏗 Obra: <strong>${obraNome}</strong></p>
        <p>📅 <strong style="text-transform:capitalize">${dataFormatada}</strong></p>
        <p>📋 ${relatorios.length} relatório${relatorios.length !== 1 ? 's' : ''}</p>
      </div>
      ${conteudo}
    </body>
    </html>`)
  janela.document.close()
}

  const dataFormatada = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Relatórios - ${obraNome} - ${data}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 40px; color: #2C2C2A; max-width: 820px; margin: 0 auto; font-size: 14px; }
        h1 { color: #2C2C2A; font-size: 22px; margin: 0 0 8px; }
        .topo { border-bottom: 3px solid #D85A30; padding-bottom: 16px; margin-bottom: 32px; }
        .info { color: #666; font-size: 13px; margin-top: 4px; }
        @media print {
          body { padding: 20px; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="topo">
        <h1>Relatório de Serviços Realizados</h1>
        <div class="info">🏗 Obra: <strong>${obraNome}</strong></div>
        <div class="info">📅 Data: <strong style="text-transform:capitalize">${dataFormatada}</strong></div>
        <div class="info">📋 Total de relatórios: <strong>${relatorios.length}</strong></div>
      </div>
      ${conteudo}
      <script>window.onload = () => window.print()</script>
    </body>
    </html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Relatórios - ${obraNome} - ${data}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #2C2C2A; max-width: 800px; margin: 0 auto; }
        h1 { color: #2C2C2A; border-bottom: 3px solid #D85A30; padding-bottom: 12px; }
        .header { margin-bottom: 32px; }
        .info { color: #888; font-size: 14px; margin-top: 4px; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Relatórios de Serviços Realizados</h1>
        <div class="info">🏗 ${obraNome}</div>
        <div class="info">📅 ${new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <div class="info">Total de relatórios: ${relatorios.length}</div>
      </div>
      ${conteudo}
    </body>
    </html>
  `

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  setTimeout(() => win?.print(), 1000)
  URL.revokeObjectURL(url)
}

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Relatórios - ${obraNome} - ${data}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #2C2C2A; max-width: 800px; margin: 0 auto; }
        h1 { color: #2C2C2A; border-bottom: 3px solid #D85A30; padding-bottom: 12px; }
        .header { margin-bottom: 32px; }
        .obra { color: #888; font-size: 14px; margin-top: 4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Relatórios de Serviços Realizados</h1>
        <div class="obra">🏗 ${obraNome}</div>
        <div class="obra">📅 ${new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <div class="obra">Total de relatórios: ${relatorios.length}</div>
      </div>
      ${conteudo}
    </body>
    </html>
  `

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relatorios-${obraNome}-${data}.html`
  a.click()
  URL.revokeObjectURL(url)
}

export function RelatoriosList({ obraId }) {
  const { profile } = useAuth()
  const [obras, setObras] = useState([])
  const [obraSelecionada, setObraSelecionada] = useState(null)
  const [relatorios, setRelatorios] = useState([])
  const [loading, setLoading] = useState(false)
  const [filtroSetor, setFiltroSetor] = useState('')
  const [diasAbertos, setDiasAbertos] = useState({})

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

    // Abre o dia mais recente automaticamente
    if (data && data.length > 0) {
      setDiasAbertos({ [data[0].data_relatorio]: true })
    }
    setLoading(false)
  }

  // Agrupa relatórios por data
  const porDia = relatorios.reduce((acc, r) => {
    const dia = r.data_relatorio
    if (!acc[dia]) acc[dia] = []
    acc[dia].push(r)
    return acc
  }, {})

  const toggleDia = (dia) => setDiasAbertos(prev => ({ ...prev, [dia]: !prev[dia] }))

  const formatDia = (data) => {
    const d = new Date(data + 'T12:00:00')
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
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
            onClick={() => { setObraSelecionada(o); setFiltroSetor(''); setDiasAbertos({}) }}
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
            Nenhuma obra. <Link to="/projeto" style={{ color: 'var(--orange)' }}>Criar obra</Link>
          </div>
        )}
      </div>

      {/* Filtro por setor */}
      {obraSelecionada && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
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

      {/* Relatórios agrupados por dia */}
      {!obraSelecionada ? (
        <div className="card">
          <div className="empty-state">
            <div style={{ fontSize: 28, marginBottom: 10 }}>🏗</div>
            Selecione uma obra acima.
          </div>
        </div>
      ) : loading ? (
        <div className="loading">Carregando...</div>
      ) : Object.keys(porDia).length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
            Nenhum relatório ainda.{' '}
            <Link to="/relatorios/novo" style={{ color: 'var(--orange)' }}>Criar primeiro</Link>
          </div>
        </div>
      ) : Object.entries(porDia).map(([dia, rels]) => (
        <div key={dia} className="card" style={{ marginBottom: 14 }}>
          {/* Cabeçalho do dia */}
          <div onClick={() => toggleDia(dia)}
            style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: diasAbertos[dia] ? 'var(--gray-dark)' : 'var(--surface)', borderRadius: diasAbertos[dia] ? '12px 12px 0 0' : 12, transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>📅</span>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: diasAbertos[dia] ? '#fff' : 'var(--text)', textTransform: 'capitalize' }}>
                  {formatDia(dia)}
                </div>
                <div style={{ fontSize: 12, color: diasAbertos[dia] ? 'rgba(255,255,255,0.5)' : 'var(--muted)', marginTop: 2 }}>
                  {rels.length} relatório{rels.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={e => { e.stopPropagation(); gerarPDF(dia, rels, obraSelecionada.nome) }}
                className="btn btn-sm"
                style={{ background: 'var(--teal)', color: '#fff', border: 'none', fontSize: 12 }}>
                ⬇ Baixar PDF
              </button>
              <span style={{ color: diasAbertos[dia] ? '#fff' : 'var(--muted)', fontSize: 18, transition: 'transform 0.2s', display: 'inline-block', transform: diasAbertos[dia] ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▾
              </span>
            </div>
          </div>

          {/* Relatórios do dia */}
          {diasAbertos[dia] && rels.map(r => (
            <Link key={r.id} to={`/relatorios/${r.id}`} className="report-item" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ width: 58, height: 58, borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, background: 'var(--gray-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {r.relatorio_fotos?.[0]
                  ? <img src={r.relatorio_fotos[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 22 }}>📷</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontWeight: 500, fontSize: 13.5 }}>{r.titulo}</div>
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
      ))}
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
