import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, uploadFoto } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const statusBadge = { novo: 'badge-blue', em_andamento: 'badge-amber', concluido: 'badge-teal', em_revisao: 'badge-orange' }
const statusLabel = { novo: 'Novo', em_andamento: 'Em andamento', concluido: 'Concluído', em_revisao: 'Em revisão' }

// Gera PDF de todos os relatórios de um dia
async function gerarPDF(data, relatorios, obraNome) {
  const conteudo = relatorios.map(r => `
    <div style="margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #eee">
      <h2 style="color:#D85A30;margin:0 0 8px">${r.titulo}</h2>
      <p style="color:#888;font-size:13px;margin:0 0 12px">${r.setor} · ${r.profiles?.nome || 'Sem autor'}</p>
      <div style="margin-bottom:10px">
        <strong>Atividades realizadas:</strong>
        <p style="margin:6px 0;line-height:1.6">${r.descricao}</p>
      </div>
      ${r.materiais ? `<div style="margin-bottom:10px"><strong>Materiais:</strong><p style="margin:6px 0">${r.materiais}</p></div>` : ''}
      ${r.observacoes ? `<div style="background:#FCEBEB;padding:10px;border-radius:6px"><strong style="color:#A32D2D">Observações:</strong><p style="margin:6px 0">${r.observacoes}</p></div>` : ''}
      <p style="margin-top:10px;font-size:12px;color:#888">Status: ${statusLabel[r.status] || r.status}</p>
    </div>
  `).join('')

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
                <div style={{ display: 'flex', jus
