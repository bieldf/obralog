import { useEffect, useState } from 'react'
import { supabase, uploadFoto } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Projeto({ obraId, obra, onObraUpdate, onObraChange }) {
  const { profile } = useAuth()
  const [plantas, setPlantas] = useState([])
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [modalObra, setModalObra] = useState(false)
  const [modalNovaObra, setModalNovaObra] = useState(false)
  const [form, setForm] = useState({ nome: '', endereco: '', descricao: '', data_inicio: '', data_fim_prevista: '', progresso: 0 })
  const [novaObraForm, setNovaObraForm] = useState({ nome: '', endereco: '', descricao: '', data_inicio: '', data_fim_prevista: '' })

  useEffect(() => { loadObras() }, [])
  useEffect(() => { if (obraId) loadPlantas() }, [obraId])
  useEffect(() => {
    if (obra) setForm({
      nome: obra.nome || '', endereco: obra.endereco || '',
      descricao: obra.descricao || '', data_inicio: obra.data_inicio || '',
      data_fim_prevista: obra.data_fim_prevista || '', progresso: obra.progresso || 0
    })
  }, [obra])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setNova = (k, v) => setNovaObraForm(f => ({ ...f, [k]: v }))

  async function loadObras() {
    const { data } = await supabase
      .from('obra_membros')
      .select('obra_id, obras(*)')
      .eq('user_id', profile.id)
    setObras(data?.map(d => d.obras).filter(Boolean) || [])
  }

  async function loadPlantas() {
    setLoading(true)
    const { data } = await supabase.from('plantas')
      .select('*, profiles(nome)').eq('obra_id', obraId).order('created_at', { ascending: false })
    setPlantas(data || [])
    setLoading(false)
  }

  async function criarObra(e) {
    e.preventDefault()
    const { data: novaObra, error } = await supabase
      .from('obras')
      .insert({ ...novaObraForm, criado_por: profile.id, progresso: 0 })
      .select().single()
    if (error) { alert('Erro ao criar obra: ' + error.message); return }
    await supabase.from('obra_membros').insert({ obra_id: novaObra.id, user_id: profile.id })
    setModalNovaObra(false)
    setNovaObraForm({ nome: '', endereco: '', descricao: '', data_inicio: '', data_fim_prevista: '' })
    loadObras()
    onObraChange?.(novaObra)
  }

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFoto(file, 'plantas')
      const ext = file.name.split('.').pop().toLowerCase()
      const tipo = ['pdf','dwg','dxf'].includes(ext) ? 'documento' : 'planta'
      await supabase.from('plantas').insert({
        obra_id: obraId, nome: file.name, url, tipo,
        tamanho_bytes: file.size, enviado_por: profile.id
      })
      loadPlantas()
    } finally { setUploading(false) }
  }

  async function salvarObra(e) {
    e.preventDefault()
    await supabase.from('obras').update(form).eq('id', obraId)
    setModalObra(false)
    onObraUpdate?.()
  }

  const formatSize = bytes => bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`

  return (
    <div className="page-content">

      {/* Lista de obras */}
      <div style={{ marginBottom: 24 }}>
        <div className="section-header">
          <div className="section-title">Minhas obras</div>
          {profile?.role === 'engenheiro' && (
            <button className="btn btn-primary" onClick={() => setModalNovaObra(true)}>+ Nova obra</button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {obras.map(o => (
            <div key={o.id} onClick={() => onObraChange?.(o)}
              style={{ background: obraId === o.id ? 'var(--gray-dark)' : 'var(--surface)', border: obraId === o.id ? '2px solid var(--orange)' : '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, cursor: 'pointer', transition: 'all 0.15s' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: obraId === o.id ? '#fff' : 'var(--text)', marginBottom: 4 }}>{o.nome}</div>
              {o.endereco && <div style={{ fontSize: 12, color: obraId === o.id ? 'rgba(255,255,255,0.5)' : 'var(--muted)', marginBottom: 8 }}>📍 {o.endereco}</div>}
              <div style={{ height: 4, background: obraId === o.id ? 'rgba(255,255,255,0.1)' : 'var(--gray-light)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--orange-mid)', borderRadius: 2, width: `${o.progresso || 0}%` }} />
              </div>
              <div style={{ fontSize: 11, color: obraId === o.id ? 'rgba(255,255,255,0.4)' : 'var(--muted)', marginTop: 6 }}>{o.progresso || 0}% concluído</div>
            </div>
          ))}

          {obras.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🏗</div>
              Nenhuma obra ainda.{' '}
              {profile?.role === 'engenheiro' && (
                <span style={{ color: 'var(--orange)', cursor: 'pointer' }} onClick={() => setModalNovaObra(true)}>Criar primeira obra</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detalhes da obra selecionada */}
      {obra && (
        <>
          <div style={{ background: 'var(--gray-dark)', padding: 28, borderRadius: 'var(--radius)', marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{obra.nome}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                {obra.endereco && <span>📍 {obra.endereco} · </span>}
                {obra.data_inicio && <span>Início: <span style={{ color: 'rgba(255,255,255,0.8)' }}>{new Date(obra.data_inicio).toLocaleDateString('pt-BR')}</span> · </span>}
                {obra.data_fim_prevista && <span>Entrega: <span style={{ color: 'rgba(255,255,255,0.8)' }}>{new Date(obra.data_fim_prevista).toLocaleDateString('pt-BR')}</span></span>}
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                  <span>Progresso geral</span>
                  <span style={{ color: 'var(--orange-mid)', fontWeight: 500 }}>{obra.progresso || 0}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--orange-mid)', borderRadius: 3, width: `${obra.progresso || 0}%`, transition: 'width 0.5s' }} />
                </div>
              </div>
            </div>
            {profile?.role === 'engenheiro' && (
              <button className="btn" onClick={() => setModalObra(true)}
                style={{ marginLeft: 20, color: '#fff', borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}>
                ✏️ Editar
              </button>
            )}
          </div>

          {/* Plantas */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Plantas e documentos</span>
              <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                <input type="file" style={{ display: 'none' }} onChange={handleUpload} accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf" />
                {uploading ? 'Enviando...' : '+ Upload'}
              </label>
            </div>
            {loading ? (
              <div className="loading">Carregando...</div>
            ) : plantas.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: 28, marginBottom: 10 }}>📐</div>
                Nenhuma planta ainda. Faça upload de PDFs, imagens ou arquivos DWG.
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
        </>
      )}

      {/* Modal nova obra */}
      {modalNovaObra && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalNovaObra(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Nova obra</span>
              <button className="modal-close" onClick={() => setModalNovaObra(false)}>×</button>
            </div>
            <form onSubmit={criarObra}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome da obra *</label>
                  <input className="form-input" required value={novaObraForm.nome}
                    onChange={e => setNova('nome', e.target.value)}
                    placeholder="Ex: Edifício Solar Norte" />
                </div>
                <div className="form-group">
                  <label className="form-label">Endereço</label>
                  <input className="form-input" value={novaObraForm.endereco}
                    onChange={e => setNova('endereco', e.target.value)}
                    placeholder="Ex: Av. Brasil, 1200" />
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição</label>
                  <textarea className="form-input" value={novaObraForm.descricao}
                    onChange={e => setNova('descricao', e.target.value)}
                    placeholder="Descreva a obra..." style={{ minHeight: 60 }} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Data de início</label>
                    <input type="date" className="form-input" value={novaObraForm.data_inicio}
                      onChange={e => setNova('data_inicio', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Previsão de entrega</label>
                    <input type="date" className="form-input" value={novaObraForm.data_fim_prevista}
                      onChange={e => setNova('data_fim_prevista', e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setModalNovaObra(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Criar obra</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal editar obra */}
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
                  <label className="form-label">Progresso ({form.progresso}%)</label>
                  <input type="range" min="0" max="100" value={form.progresso}
                    onChange={e => set('progresso', parseInt(e.target.value))} style={{ width: '100%', marginTop: 4 }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setModalObra(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
