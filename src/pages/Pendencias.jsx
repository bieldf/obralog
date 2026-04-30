import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, Routes, Route } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { jsPDF } from 'jspdf'

const categorias = ['Pintura', 'Marcenaria', 'Alvenaria', 'Estrutura', 'Elétrica', 'Hidráulica', 'Acabamento', 'Limpeza', 'Outros']
const prioColor = { alta: 'badge-red', media: 'badge-amber', baixa: 'badge-blue' }
const statusColor = { pendente: 'badge-red', em_andamento: 'badge-amber', concluida: 'badge-teal' }
const statusLabel = { pendente: 'Pendente', em_andamento: 'Em andamento', concluida: 'Concluída' }

async function gerarPDFCategoria(categoria, pendencias, obraNome) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 15
  const maxW = W - margin * 2
  let y = 20

  const addText = (text, x, size, bold, color) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(...(color || [34, 34, 34]))
    doc.text(String(text || ''), x, y)
  }

  const checkPage = (needed) => {
    if (y + needed > 280) { doc.addPage(); y = 20 }
  }

  doc.setFillColor(216, 90, 48)
  doc.rect(0, 0, W, 18, 'F')
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(`Pendências — ${categoria}`, margin, 12)
  y = 28

  addText(`Obra: ${obraNome}`, margin, 11, false, [80, 80, 80])
  y += 6
  addText(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, margin, 11, false, [80, 80, 80])
  y += 6
  addText(`Total: ${pendencias.length} pendência${pendencias.length !== 1 ? 's' : ''}`, margin, 11, false, [80, 80, 80])
  y += 10

  doc.setDrawColor(216, 90, 48)
  doc.setLineWidth(0.8)
  doc.line(margin, y, W - margin, y)
  y += 10

  const { data: todasFotos } = await supabase
    .from('pendencia_fotos')
    .select('pendencia_id, url')
    .in('pendencia_id', pendencias.map(p => p.id))

  const fotosPorPendencia = {}
  for (const foto of (todasFotos || [])) {
    if (!fotosPorPendencia[foto.pendencia_id]) fotosPorPendencia[foto.pendencia_id] = []
    try {
      const urlObj = new URL(foto.url)
      const path = urlObj.pathname.split('/fotos-pendencias/')[1]
      const { data: fileData } = await supabase.storage.from('fotos-pendencias').download(path)
      if (fileData) {
        const base64 = await new Promise(resolve => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.readAsDataURL(fileData)
        })
        fotosPorPendencia[foto.pendencia_id].push(base64)
      }
    } catch { }
  }

  for (let i = 0; i < pendencias.length; i++) {
    const p = pendencias[i]
    const fotos = fotosPorPendencia[p.id] || []
    checkPage(20)
    const concluida = p.status === 'concluida'
    doc.setFillColor(concluida ? 225 : 250, concluida ? 245 : 236, concluida ? 238 : 231)
    doc.roundedRect(margin, y - 5, maxW, 12, 2, 2, 'F')
    addText(`${concluida ? '✓' : '○'} ${p.titulo}`, margin + 3, 13, true, concluida ? [29, 158, 117] : [216, 90, 48])
    y += 10
    addText(`${p.prioridade} · ${statusLabel[p.status]} · ${new Date(p.data_criacao + 'T12:00:00').toLocaleDateString('pt-BR')}`, margin, 10, false, [130, 130, 130])
    y += 8
    if (p.descricao) {
      checkPage(10)
      addText('Descrição:', margin, 11, true, [34, 34, 34])
      y += 6
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      const linhas = doc.splitTextToSize(p.descricao, maxW)
      for (const linha of linhas) { checkPage(6); doc.text(linha, margin, y); y += 5.5 }
      y += 4
    }
    if (fotos.length > 0) {
      checkPage(10)
      addText(`Fotos (${fotos.length}):`, margin, 11, true, [34, 34, 34])
      y += 6
      const fotoW = (maxW - 5) / 2
      const fotoH = 55
      for (let f = 0; f < fotos.length; f += 2) {
        checkPage(fotoH + 5)
        try { doc.addImage(fotos[f], 'JPEG', margin, y, fotoW, fotoH) } catch { }
        if (fotos[f + 1]) { try { doc.addImage(fotos[f + 1], 'JPEG', margin + fotoW + 5, y, fotoW, fotoH) } catch { } }
        y += fotoH + 5
      }
      y += 4
    }
    if (i < pendencias.length - 1) {
      checkPage(10)
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.3)
      doc.line(margin, y, W - margin, y)
      y += 10
    }
  }
  doc.save(`pendencias-${categoria}-${obraNome}.pdf`)
}

// ─── Detalhe da pendência ────────────────────────────────────────────────
export function PendenciaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pend, setPend] = useState(null)
  const [fotos, setFotos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    const [{ data: p }, { data: f }] = await Promise.all([
      supabase.from('pendencias').select('*, profiles(nome, role), obras(nome)').eq('id', id).single(),
      supabase.from('pendencia_fotos').select('*').eq('pendencia_id', id),
    ])
    setPend(p)
    setFotos(f || [])
    setLoading(false)
  }

  async function toggleStatus() {
    const next = pend.status === 'concluida' ? 'pendente'
      : pend.status === 'pendente' ? 'em_andamento' : 'concluida'
    const update = { status: next }
    if (next === 'concluida') update.data_conclusao = new Date().toISOString().split('T')[0]
    await supabase.from('pendencias').update(update).eq('id', id)
    load()
  }

  if (loading) return <div className="loading">Carregando...</div>
  if (!pend) return <div className="loading">Pendência não encontrada.</div>

  const initials = pend.profiles?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'

  return (
    <div className="page-content">
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-sm" onClick={() => navigate('/pendencias')}>← Voltar</button>
        <span className={`badge ${statusColor[pend.status]}`}>{statusLabel[pend.status]}</span>
        <span className={`badge ${prioColor[pend.prioridade]}`}>{pend.prioridade}</span>
        <span className="badge badge-blue">{pend.categoria}</span>
        {pend.obras?.nome && <span className="badge badge-gray">🏗 {pend.obras.nome}</span>}
        <button onClick={toggleStatus} className="btn btn-sm" style={{ marginLeft: 'auto', background: pend.status === 'concluida' ? 'var(--teal)' : 'var(--orange)', color: '#fff', border: 'none' }}>
          {pend.status === 'concluida' ? '↩ Reabrir' : pend.status === 'pendente' ? '▶ Iniciar' : '✓ Concluir'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title" style={{ textDecoration: pend.status === 'concluida' ? 'line-through' : 'none', color: pend.status === 'concluida' ? 'var(--muted)' : 'var(--text)' }}>
            {pend.titulo}
          </span>
        </div>
        <div style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'var(--gray-light)', borderRadius: 'var(--radius-sm)', marginBottom: 18 }}>
            <div className="avatar" style={{ background: 'var(--orange-light)', color: 'var(--orange)', width: 40, height: 40, fontSize: 14 }}>{initials}</div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{pend.profiles?.nome}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Criado em {new Date(pend.data_criacao + 'T12:00:00').toLocaleDateString('pt-BR')}
                {pend.data_conclusao && ` · Concluído em ${new Date(pend.data_conclusao + 'T12:00:00').toLocaleDateString('pt-BR')}`}
              </div>
            </div>
          </div>

          {pend.descricao && (
            <div style={{ marginBottom: 16 }}>
              <div className="form-label">Descrição</div>
              <p style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{pend.descricao}</p>
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
                  <img src={f.url} alt="" className="photo-thumb" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Lista de pendências ─────────────────────────────────────────────────
export default function Pendencias({ obraId }) {
  const { profile } = useAuth()
  const [obras, setObras] = useState([])
  const [obraSelecionada, setObraSelecionada] = useState(null)
  const [pendencias, setPendencias] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [gerandoPDF, setGerandoPDF] = useState(null)
  const [visualizacao, setVisualizacao] = useState('categoria')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [fotos, setFotos] = useState([])
  const [previews, setPreviews] = useState([])
  const [form, setForm] = useState({
    titulo: '', descricao: '', categoria: 'Outros',
    prioridade: 'media', data_criacao: new Date().toISOString().split('T')[0]
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { loadObras() }, [])
  useEffect(() => { if (obraSelecionada) loadPendencias() }, [obraSelecionada, filtroCategoria, filtroStatus])

  async function loadObras() {
    const { data } = await supabase
      .from('obra_membros')
      .select('obra_id, obras(*)')
      .eq('user_id', profile.id)
    const lista = data?.map(d => d.obras).filter(Boolean) || []
    setObras(lista)
    if (lista.length > 0) setObraSelecionada(lista[0])
  }

  async function loadPendencias() {
    setLoading(true)
    let q = supabase.from('pendencias')
      .select('*, profiles(nome), pendencia_fotos(url)')
      .eq('obra_id', obraSelecionada.id)
      .order('created_at', { ascending: false })
    if (filtroCategoria) q = q.eq('categoria', filtroCategoria)
    if (filtroStatus) q = q.eq('status', filtroStatus)
    const { data } = await q
    setPendencias(data || [])
    setLoading(false)
  }

  function handleFotos(e) {
    const files = Array.from(e.target.files)
    setFotos(files)
    setPreviews(files.map(f => URL.createObjectURL(f)))
  }

  async function criarPendencia(e) {
    e.preventDefault()
    try {
      const { data: pend, error } = await supabase.from('pendencias').insert({
        ...form, obra_id: obraSelecionada.id, autor_id: profile.id
      }).select().single()
      if (error) throw error
      for (const foto of fotos) {
        const ext = foto.name.split('.').pop()
        const nome = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('fotos-pendencias').upload(nome, foto)
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('fotos-pendencias').getPublicUrl(nome)
          await supabase.from('pendencia_fotos').insert({ pendencia_id: pend.id, url: urlData.publicUrl, nome_arquivo: foto.name })
        }
      }
      setModal(false)
      setForm({ titulo: '', descricao: '', categoria: 'Outros', prioridade: 'media', data_criacao: new Date().toISOString().split('T')[0] })
      setFotos([])
      setPreviews([])
      loadPendencias()
    } catch (err) {
      alert('Erro ao criar pendência: ' + err.message)
    }
  }

  async function toggleStatus(pend) {
    const next = pend.status === 'concluida' ? 'pendente'
      : pend.status === 'pendente' ? 'em_andamento' : 'concluida'
    const update = { status: next }
    if (next === 'concluida') update.data_conclusao = new Date().toISOString().split('T')[0]
    await supabase.from('pendencias').update(update).eq('id', pend.id)
    loadPendencias()
  }

  async function handleGerarPDF(categoria, items) {
    setGerandoPDF(categoria)
    try { await gerarPDFCategoria(categoria, items, obraSelecionada.nome) }
    finally { setGerandoPDF(null) }
  }

  const porCategoria = pendencias.reduce((acc, p) => {
    if (!acc[p.categoria]) acc[p.categoria] = []
    acc[p.categoria].push(p)
    return acc
  }, {})

  const porData = pendencias.reduce((acc, p) => {
    const dia = p.data_criacao
    if (!acc[dia]) acc[dia] = []
    acc[dia].push(p)
    return acc
  }, {})

  const formatDia = (data) => new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  })

  const PendenciaCard = ({ p }) => (
    <div style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--border)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <button onClick={(e) => { e.stopPropagation(); toggleStatus(p) }}
        style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${p.status === 'concluida' ? 'var(--teal)' : p.status === 'em_andamento' ? 'var(--amber)' : 'var(--border)'}`, background: p.status === 'concluida' ? 'var(--teal)' : p.status === 'em_andamento' ? 'var(--amber-light)' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
        {p.status === 'concluida' && <span style={{ color: '#fff', fontSize: 14, lineHeight: 1 }}>✓</span>}
        {p.status === 'em_andamento' && <span style={{ color: 'var(--amber)', fontSize: 10 }}>●</span>}
      </button>

      <Link to={`/pendencias/${p.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 500, fontSize: 13.5, textDecoration: p.status === 'concluida' ? 'line-through' : 'none', color: p.status === 'concluida' ? 'var(--muted)' : 'var(--text)' }}>
            {p.titulo}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <span className={`badge ${prioColor[p.prioridade]}`}>{p.prioridade}</span>
            <span className={`badge ${statusColor[p.status]}`}>{statusLabel[p.status]}</span>
          </div>
        </div>

        {p.descricao && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.descricao}
          </div>
        )}

        {p.pendencia_fotos?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            {p.pendencia_fotos.slice(0, 4).map((f, i) => (
              <img key={i} src={f.url} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, border: '0.5px solid var(--border)' }} />
            ))}
            {p.pendencia_fotos.length > 4 && (
              <div style={{ width: 52, height: 52, borderRadius: 6, background: 'var(--gray-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--muted)' }}>
                +{p.pendencia_fotos.length - 4}
              </div>
            )}
          </div>
        )}

        <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span>📅 {new Date(p.data_criacao + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
          <span>👤 {p.profiles?.nome}</span>
          {p.data_conclusao && <span style={{ color: 'var(--teal)' }}>✓ Concluída em {new Date(p.data_conclusao + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
        </div>
      </Link>
    </div>
  )

  return (
    <div className="page-content">
      <div className="section-header">
        <div className="section-title">Pendências</div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Nova pendência</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {obras.map(o => (
          <button key={o.id} onClick={() => setObraSelecionada(o)}
            style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s', background: obraSelecionada?.id === o.id ? 'var(--orange)' : 'var(--surface)', color: obraSelecionada?.id === o.id ? '#fff' : 'var(--muted)', border: obraSelecionada?.id === o.id ? '0.5px solid var(--orange)' : '0.5px solid var(--border)' }}>
            🏗 {o.nome}
          </button>
        ))}
      </div>

      {obraSelecionada && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--gray-light)', borderRadius: 8, padding: 3 }}>
            <button onClick={() => setVisualizacao('categoria')}
              style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'var(--font-body)', background: visualizacao === 'categoria' ? 'var(--surface)' : 'transparent', color: visualizacao === 'categoria' ? 'var(--text)' : 'var(--muted)' }}>
              Por categoria
            </button>
            <button onClick={() => setVisualizacao('data')}
              style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', fontFamily: 'var(--font-body)', background: visualizacao === 'data' ? 'var(--surface)' : 'transparent', color: visualizacao === 'data' ? 'var(--text)' : 'var(--muted)' }}>
              Por data
            </button>
          </div>

          <select className="form-input" style={{ width: 160, padding: '6px 10px' }}
            value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
            <option value="">Todas categorias</option>
            {categorias.map(c => <option key={c}>{c}</option>)}
          </select>

          <select className="form-input" style={{ width: 150, padding: '6px 10px' }}
            value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="pendente">Pendentes</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluida">Concluídas</option>
          </select>

          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
            {pendencias.filter(p => p.status !== 'concluida').length} pendente{pendencias.filter(p => p.status !== 'concluida').length !== 1 ? 's' : ''} · {pendencias.filter(p => p.status === 'concluida').length} concluída{pendencias.filter(p => p.status === 'concluida').length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {!obraSelecionada ? (
        <div className="card"><div className="empty-state"><div style={{ fontSize: 28, marginBottom: 10 }}>🏗</div>Selecione uma obra.</div></div>
      ) : loading ? (
        <div className="loading">Carregando...</div>
      ) : pendencias.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div style={{ fontSize: 28, marginBottom: 10 }}>✅</div>
            Nenhuma pendência.{' '}
            <span style={{ color: 'var(--orange)', cursor: 'pointer' }} onClick={() => setModal(true)}>Criar primeira</span>
          </div>
        </div>
      ) : visualizacao === 'categoria' ? (
        Object.entries(porCategoria).map(([cat, items]) => (
          <div key={cat} className="card" style={{ marginBottom: 14 }}>
            <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{cat}</div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {items.filter(p => p.status !== 'concluida').length} pendente{items.filter(p => p.status !== 'concluida').length !== 1 ? 's' : ''} · {items.filter(p => p.status === 'concluida').length} concluída{items.filter(p => p.status === 'concluida').length !== 1 ? 's' : ''}
                </span>
              </div>
              <button onClick={() => handleGerarPDF(cat, items)} disabled={gerandoPDF === cat}
                className="btn btn-sm" style={{ background: gerandoPDF === cat ? 'var(--muted)' : 'var(--teal)', color: '#fff', border: 'none' }}>
                {gerandoPDF === cat ? '⏳ Gerando...' : '⬇ Baixar PDF'}
              </button>
            </div>
            {items.map(p => <PendenciaCard key={p.id} p={p} />)}
          </div>
        ))
      ) : (
        Object.entries(porData).map(([dia, items]) => (
          <div key={dia} className="card" style={{ marginBottom: 14 }}>
            <div style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, textTransform: 'capitalize' }}>{formatDia(dia)}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{items.length} pendência{items.length !== 1 ? 's' : ''}</div>
            </div>
            {items.map(p => <PendenciaCard key={p.id} p={p} />)}
          </div>
        ))
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Nova pendência</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={criarPendencia}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Título *</label>
                  <input className="form-input" required value={form.titulo}
                    onChange={e => set('titulo', e.target.value)}
                    placeholder="Ex: Pintura da parede do corredor" />
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição</label>
                  <textarea className="form-input" value={form.descricao}
                    onChange={e => set('descricao', e.target.value)}
                    placeholder="Descreva o serviço que precisa ser feito..."
                    style={{ minHeight: 80 }} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Categoria</label>
                    <select className="form-input" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                      {categorias.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prioridade</label>
                    <select className="form-input" value={form.prioridade} onChange={e => set('prioridade', e.target.value)}>
                      <option value="alta">Alta</option>
                      <option value="media">Média</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Data</label>
                  <input type="date" className="form-input" value={form.data_criacao}
                    onChange={e => set('data_criacao', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fotos</label>
                  <label className="upload-area" style={{ display: 'block' }}>
                    <input type="file" accept="image/*" multiple capture="environment"
                      onChange={handleFotos} style={{ display: 'none' }} />
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>Clique para adicionar ou tirar foto</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>No celular abre a câmera diretamente</div>
                  </label>
                  {previews.length > 0 && (
                    <div className="preview-photos">
                      {previews.map((src, i) => <img key={i} src={src} alt="" className="preview-photo" />)}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Criar pendência</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
