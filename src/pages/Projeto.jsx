import { useEffect, useState } from 'react'
import { supabase, uploadFoto } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Projeto({ obraId, obra, onObraUpdate }) {
  const { profile } = useAuth()
  const [plantas, setPlantas] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [modalObra, setModalObra] = useState(false)
  const [form, setForm] = useState({ nome: '', endereco: '', descricao: '', data_inicio: '', data_fim_prevista: '', progresso: 0 })

  useEffect(() => { if (obraId) load() }, [obraId])
  useEffect(() => { if (obra) setForm({ nome: obra.nome || '', endereco: obra.endereco || '', descricao: obra.descricao || '', data_inicio: obra.data_inicio || '', data_fim_prevista: obra.data_fim_prevista || '', progresso: obra.progresso || 0 }) }, [obra])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('plantas').select('*, profiles(nome)').eq('obra_id', obraId).order('created_at', { ascending: false })
    setPlantas(data || [])
    setLoading(false)
  }

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFoto(file, 'plantas')
      const ext = file.name.split('.').pop().toLowerCase()
      const tipo = ['pdf','dwg','dxf'].includes(ext) ? 'documento' : 'planta'
      await supabase.from('plantas').insert({ obra_id: obraId, nome: file.name, url, tipo, tamanho_bytes: file.size, enviado_por: profile.id })
      load()
    } finally { setUploading(false) }
  }

  async function salvarObra(e) {
    e.preventDefault()
    await supabase.from('obras').update(form).eq('id', obraId)
    setModalObra(false)
    onObraUpdate?.()
  }

  const formatSize = bytes => bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

  return (
    <div className="page-content">
      {/* Cabeçalho do projeto */}
      <div style={{ background: 'var(--gray-dark)', padding: 28, borderRadius: 'var(--radius)', marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
            {obra?.nome || 'Sem obra selecionada'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            {obra?.endereco && <span>📍 {obra.endereco} · </span>}
            {obra?.data_inicio && <span>Início: <span style={{ color: 'rgba(255,255,255,0.8)' }}>{new Date(obra.data_inicio).toLocaleDateString('pt-BR')}</span> · </span>}
            {obra?.data_fim_prevista && <span>Entrega: <span style={{ color: 'rgba(255,255,255,0.8)' }}>{new Date(obra.data_fim_prevista).toLocaleDateString('pt-BR')}</span></span>}
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
              <span>Progresso geral</span>
              <span style={{ color: 'var(--orange-mid)', fontWeight: 500 }}>{obra?.progresso || 0}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--orange-mid)', borderRadius: 3, width: `${obra?.progresso || 0}%`, transition: 'width 0.5s' }} />
            </div>
          </div>
        </div>
        {profile?.role === 'engenheiro' && (
          <button className="btn" style={{ marginLeft: 20, color: '#fff', borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}
            onClick={() => setModalObra(true)}>
            ✏️ Editar
          </button>
        )}
      </div>

      {/* Plantas e documentos */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Plantas e documentos</span>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            <input type="file" style={{ display: 'none' }} onChange={handleUpload} accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf" />
            {uploading ? 'Enviando...' : '+ Upload'}
          </label>
        </div>

        {loading ? (
          <div className="loading">Carregando documentos...</div>
        ) : plantas.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 28, marginBottom: 10 }}>📐</div>
            Nenhuma planta ou documento ainda.
            <div style={{ marginTop: 8, fontSize: 12 }}>Faça upload de PDFs, imagens ou arquivos DWG.</div>
          </div>
        ) : (
          <div style={{ padding: '0 18px' }}>
            {plantas.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '0.5px solid var(--border)' }}>
                <div style={{ fontSize: 24, flexShrink: 0 }}>
                  {p.nome.endsWith('.pdf') ? '📄' : p.nome.match(/\.(png|jpg|jpeg)$/i) ? '🖼' : '📐'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {p.profiles?.nome} · {new Date(p.created_at).toLocaleDateString('pt-BR')}
                    {p.tamanho_bytes ? ` · ${formatSize(p.tamanho_bytes)}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={p.url} target="_blank" rel="noreferrer" className="btn btn-sm">Abrir</a>
                  <a href={p.url} download={p.nome} className="btn btn-sm">⬇</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editar obra modal */}
      {modalObra && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalObra(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Editar obra</span>
              <button className="modal-close" onClick={() => setModalObra(false)}>×</button>
            </div>
            <form onSubmit={salvarObra}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome da obra</label>
                  <input className="form-input" required value={form.nome} onChange={e => set('nome', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Endereço</label>
                  <input className="form-input" value={form.endereco} onChange={e => set('endereco', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição</label>
                  <textarea className="form-input" value={form.descricao} onChange={e => set('descricao', e.target.value)} style={{ minHeight: 60 }} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Data de início</label>
                    <input type="date" className="form-input" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Previsão de entrega</label>
                    <input type="date" className="form-input" value={form.data_fim_prevista} onChange={e => set('data_fim_prevista', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Progresso geral ({form.progresso}%)</label>
                  <input type="range" className="form-input" min="0" max="100" value={form.progresso}
                    onChange={e => set('progresso', parseInt(e.target.value))} style={{ padding: '8px 0' }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setModalObra(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
