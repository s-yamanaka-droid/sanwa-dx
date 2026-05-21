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
  // OTP コード入力モード
  const [otp, setOtp] = useState('')
  const [verifying, setVerifying] = useState(false)

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

  const sendOtpCode = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          // emailRedirectTo を指定しないと Magic Link ではなく OTP コードのみが届く
          shouldCreateUser: true,
        },
      })
      if (error) throw error
      setSent(true)
    } catch (e) {
      setError(e.message || 'コード送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  const verifyOtpCode = async (e) => {
    e.preventDefault()
    const code = otp.trim()
    if (!code) return
    setVerifying(true)
    setError('')
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: 'email',
      })
      if (error) throw error
      // onAuthStateChange で session が更新される
    } catch (e) {
      setError(e.message || 'コードが正しくありません')
    } finally {
      setVerifying(false)
    }
  }

  const resetFlow = () => {
    setSent(false)
    setOtp('')
    setError('')
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setEmail('')
    setSent(false)
    setOtp('')
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
            <form onSubmit={verifyOtpCode} className={styles.gateForm}>
              <div className={styles.sentIcon}>
                <svg width="36" height="36" viewBox="0 0 44 44" fill="none">
                  <rect x="4" y="10" width="36" height="26" rx="3" stroke="#006bb4" strokeWidth="2"/>
                  <path d="M4 14l18 12 18-12" stroke="#006bb4" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className={styles.sentTitle}>コードを送信しました</div>
              <div className={styles.sentMsg}>
                <strong>{email}</strong><br />
                受信メール内の <strong>6桁コード</strong> を入力してください
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                className={styles.otpInput}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                autoFocus
                disabled={verifying}
              />
              {error && <div className={styles.gateError}>{error}</div>}
              <button
                type="submit"
                className={styles.gateBtn}
                disabled={verifying || otp.length !== 6}
              >
                {verifying ? '確認中…' : 'ログイン'}
              </button>
              <button type="button" className={styles.linkBtn} onClick={resetFlow}>
                別のメールアドレスでやり直す
              </button>
            </form>
          ) : (
            <form onSubmit={sendOtpCode} className={styles.gateForm}>
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
                {sending ? '送信中…' : '6桁コードを受け取る'}
              </button>
              <div className={styles.gateNote}>
                登録メールアドレスに6桁のワンタイムコードが届きます。<br />
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
