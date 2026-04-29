import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Equipe({ obraId }) {
  const { profile } = useAuth()
  const [membros, setMembros] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => { if (obraId) load() }, [obraId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('obra_membros')
      .select('*, profiles(id, nome, role, especialidade, created_at)')
      .eq('obra_id', obraId)
    setMembros(data || [])
    setLoading(false)
  }

  async function convidar(e) {
    e.preventDefault()
    setError('')
    setMsg('')
    // Busca o profile pelo email (via auth.users não é acessível diretamente no client,
    // então buscamos pelo nome/email na tabela profiles usando um workaround)
    // Na prática, o engenheiro adiciona o UUID do membro ou o sistema usa convites por email
    // Aqui simplificamos: o usuário deve já ter se cadastrado
    const { data: user } = await supabase
      .from('profiles')
      .select('id, nome')
      .ilike('nome', `%${email}%`)
      .limit(1)
      .single()

    if (!user) { setError('Usuário não encontrado. Peça para ele se cadastrar primeiro.'); return }

    const { error: err } = await supabase.from('obra_membros').insert({ obra_id: obraId, user_id: user.id })
    if (err) { setError('Erro ao adicionar membro.'); return }

    setMsg(`${user.nome} adicionado com sucesso!`)
    setEmail('')
    load()
  }

  const roleLabel = { engenheiro: 'Engenheiro', empreiteiro: 'Empreiteiro', trabalhador: 'Trabalhador' }
  const roleColor = { engenheiro: 'badge-blue', empreiteiro: 'badge-orange', trabalhador: 'badge-teal' }
  const avatarColors = [
    { bg: 'var(--orange-light)', color: 'var(--orange)' },
    { bg: 'var(--blue-light)', color: 'var(--blue)' },
    { bg: 'var(--teal-light)', color: 'var(--teal)' },
    { bg: 'var(--amber-light)', color: 'var(--amber)' },
    { bg: 'var(--green-light)', color: 'var(--green)' },
  ]

  if (loading) return <div className="loading">Carregando equipe...</div>

  return (
    <div className="page-content">
      <div className="section-header">
        <div className="section-title">Equipe e empreiteiros</div>
        {profile?.role === 'engenheiro' && (
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ Adicionar membro</button>
        )}
      </div>

      <div className="worker-grid">
        {membros.map((m, i) => {
          const p = m.profiles
          if (!p) return null
          const initials = p.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'
          const colors = avatarColors[i % avatarColors.length]
          return (
            <div key={m.id} className="worker-card">
              <div className="avatar" style={{ width: 52, height: 52, fontSize: 17, fontFamily: 'var(--font-display)', fontWeight: 700, background: colors.bg, color: colors.color, marginBottom: 10 }}>
                {initials}
              </div>
              <div style={{ fontWeight: 500, fontSize: 13.5, marginBottom: 4 }}>{p.nome}</div>
              <span className={`badge ${roleColor[p.role] || 'badge-gray'}`} style={{ marginBottom: 10 }}>
                {roleLabel[p.role] || p.role}
              </span>
              {p.especialidade && (
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.especialidade}</div>
              )}
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                Desde {new Date(p.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
              </div>
            </div>
          )
        })}

        {membros.length === 0 && (
          <div style={{ gridColumn: '1/-1' }}>
            <div className="empty-state">
              <div style={{ fontSize: 28, marginBottom: 10 }}>👷</div>
              Nenhum membro ainda. Adicione a equipe da obra.
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Adicionar membro</span>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={convidar}>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
                  O membro precisa já ter se cadastrado no ObraLog. Busque pelo nome completo ou parte dele.
                </p>
                {error && <div className="error-box">{error}</div>}
                {msg && <div style={{ background: 'var(--teal-light)', color: 'var(--teal)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 12 }}>{msg}</div>}
                <div className="form-group">
                  <label className="form-label">Nome do usuário</label>
                  <input className="form-input" required value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Ex: Carlos Mendes" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setModal(false)}>Fechar</button>
                <button type="submit" className="btn btn-primary">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
