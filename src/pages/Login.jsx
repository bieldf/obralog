import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '', nome: '', role: 'trabalhador' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(form.email, form.password)
      } else {
        await signUp(form.email, form.password, form.nome, form.role)
      }
      navigate('/')
    } catch (err) {
      setError(err.message || 'Erro ao autenticar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">ObraLog</div>
        <div className="auth-sub">
          {mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label">Nome completo</label>
                <input className="form-input" type="text" required value={form.nome}
                  onChange={e => set('nome', e.target.value)} placeholder="Seu nome" />
              </div>
              <div className="form-group">
                <label className="form-label">Função</label>
                <select className="form-input" value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="engenheiro">Engenheiro / Fiscal</option>
                  <option value="empreiteiro">Empreiteiro</option>
                  <option value="trabalhador">Trabalhador</option>
                </select>
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input className="form-input" type="email" required value={form.email}
              onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <input className="form-input" type="password" required value={form.password}
              onChange={e => set('password', e.target.value)} placeholder="••••••••" minLength={6} />
          </div>

          <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center', padding: '11px' }} disabled={loading}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
          {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
          <button style={{ background: 'none', border: 'none', color: 'var(--orange)', cursor: 'pointer', fontWeight: 500, fontSize: 13, fontFamily: 'var(--font-body)' }}
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
            {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
