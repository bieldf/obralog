import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const Icon = ({ d }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
)

export default function Sidebar({ obra }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'

  return (
    <div className="sidebar">
      <div className="logo">
        <div className="logo-text">ObraLog</div>
        <div className="logo-sub">Gestão de obras</div>
      </div>

      <div className="nav-section">
        <span className="nav-label">Principal</span>
        <NavLink to="/" end className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <Icon d="M2 2h5v5H2V2zm0 7h5v5H2V9zm7-7h5v5H9V2zm0 7h5v5H9V9z" />
          Painel
        </NavLink>
        <NavLink to="/relatorios" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <Icon d="M4 1h8l3 3v10a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1zm7 0v3h3L11 1zM4 8h8v1H4V8zm0 2.5h8v1H4v-1zm0 2.5h5v1H4v-1z" />
          Relatórios
        </NavLink>
        <NavLink to="/pendencias" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <Icon d="M2 1h12a1 1 0 011 1v12a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1zm1 3v2h10V4H3zm0 4v2h7V8H3zm0 4v1h5v-1H3z" />
          Pendências
        </NavLink>
        <NavLink to="/projeto" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <Icon d="M1 1h14v2H1V1zm0 4h14v2H1V5zm0 4h9v2H1V9zm0 4h6v2H1v-2z" />
          Projeto / Plantas
        </NavLink>
        <NavLink to="/tarefas" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <Icon d="M2 1h12a1 1 0 011 1v12a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1zm1 3v2h10V4H3zm0 4v2h7V8H3zm0 4v1h5v-1H3z" />
          Tarefas
        </NavLink>
      </div>

      <div className="nav-section">
        <span className="nav-label">Equipe</span>
        <NavLink to="/equipe" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <Icon d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3z" />
          Empreiteiros
        </NavLink>
        <NavLink to="/relatorios/novo" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <Icon d="M8 1a7 7 0 100 14A7 7 0 008 1zm1 10H7V7h2v4zm0-6H7V3h2v2z" />
          Novo Relatório
        </NavLink>
      </div>

      <div className="obra-selector">
        {obra ? (
          <div className="obra-card">
            <div className="obra-name">{obra.nome}</div>
            <div className="obra-status">
              {obra.status === 'em_andamento' ? 'Em andamento' : obra.status}
            </div>
            <div className="obra-progress">
              <div className="obra-progress-fill" style={{ width: `${obra.progresso || 0}%` }} />
            </div>
          </div>
        ) : (
          <div className="obra-card">
            <div className="obra-name" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
              Nenhuma obra selecionada
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '0 2px' }}>
          <div className="avatar" style={{ background: 'var(--orange-light)', color: 'var(--orange)', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.nome || 'Usuário'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{profile?.role}</div>
          </div>
          <button onClick={handleSignOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: 4 }} title="Sair">
            ⏻
          </button>
        </div>
      </div>
    </div>
  )
}
