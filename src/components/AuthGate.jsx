import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import styles from './AuthGate.module.css'

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [allowedCheck, setAllowedCheck] = useState({ checked: false, allowed: false })
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  // Initial session + auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  // After session is ready → check allowlist + log access
  useEffect(() => {
    if (!session?.user?.email) {
      setAllowedCheck({ checked: false, allowed: false })
      return
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from('sanwa_allowed_emails')
          .select('email, role')
          .eq('email', session.user.email.toLowerCase())
          .maybeSingle()
        if (error) throw error
        const allowed = !!data
        setAllowedCheck({ checked: true, allowed })

        if (allowed) {
          // Log access (fire-and-forget)
          supabase.from('sanwa_access_log').insert({
            email: session.user.email,
            user_agent: navigator.userAgent,
            path: window.location.pathname,
          }).then(() => {})
        }
      } catch (e) {
        console.error('allowlist check failed:', e)
        setAllowedCheck({ checked: true, allowed: false })
      }
    })()
  }, [session])

  const sendMagicLink = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) throw error
      setSent(true)
    } catch (e) {
      setError(e.message || 'ログインリンクの送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setEmail('')
    setSent(false)
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    )
  }

  // Not logged in → login screen
  if (!session) {
    return (
      <div className={styles.gateWrap}>
        <div className={styles.gateCard}>
          <div className={styles.gateLogo}>
            <img src="/brand/sanwashouken-logo.png" alt="株式会社三和商研" className={styles.gateLogoImg} />
            <div className={styles.gateTitle}>DX Platform</div>
            <div className={styles.gateSub}>店舗什器レイアウト管理システム</div>
          </div>

          {sent ? (
            <div className={styles.sentBox}>
              <div className={styles.sentIcon}>
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <circle cx="22" cy="22" r="20" stroke="#0a7c4e" strokeWidth="2"/>
                  <path d="M14 22l6 6 12-12" stroke="#0a7c4e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className={styles.sentTitle}>メールを送信しました</div>
              <div className={styles.sentMsg}>
                <strong>{email}</strong> 宛にログインリンクを送信しました。<br />
                受信トレイをご確認ください。
              </div>
              <button className={styles.linkBtn} onClick={() => setSent(false)}>
                別のメールアドレスで送信
              </button>
            </div>
          ) : (
            <form onSubmit={sendMagicLink} className={styles.gateForm}>
              <div className={styles.gateLabel}>登録されたメールアドレスを入力</div>
              <input
                type="email"
                className={styles.gateInput}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                disabled={sending}
              />
              {error && <div className={styles.gateError}>{error}</div>}
              <button
                type="submit"
                className={styles.gateBtn}
                disabled={sending || !email.trim()}
              >
                {sending ? '送信中…' : 'ログインリンクを受け取る'}
              </button>
              <div className={styles.gateNote}>
                登録メールアドレスにワンタイムリンクが届きます。<br />
                アクセスは記録されます。
              </div>
            </form>
          )}
        </div>
        <div className={styles.gateFooter}>
          株式会社トレプロ 制作 · 三和商研 様 専用
        </div>
      </div>
    )
  }

  // Logged in but not yet checked allowlist
  if (!allowedCheck.checked) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <div className={styles.loadingText}>権限を確認中…</div>
      </div>
    )
  }

  // Logged in but not allowed
  if (!allowedCheck.allowed) {
    return (
      <div className={styles.gateWrap}>
        <div className={styles.gateCard}>
          <div className={styles.gateLogo}>
            <div className={styles.gateTitle}>アクセス権限がありません</div>
          </div>
          <div className={styles.denyBox}>
            <strong>{session.user.email}</strong> はこのシステムへのアクセスが許可されていません。
            <br /><br />
            アクセスをご希望の場合は、株式会社トレプロまでお問い合わせください。
          </div>
          <button className={styles.gateBtn} onClick={signOut}>
            ログアウト
          </button>
        </div>
      </div>
    )
  }

  // Logged in + allowed → render app with logout
  return children({ session, signOut })
}
