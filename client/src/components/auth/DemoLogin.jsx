import { ShieldCheck, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { getErrorMessage } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import { useShopConfig } from '../../hooks/useShopConfig'
import { useI18n } from '../../i18n/useI18n'
import { useToast } from '../ui/toast/useToast'
import style from './DemoLogin.module.css'

const ACCOUNTS = [
	{ id: 'customer', icon: ShoppingBag, title: 'auth.demoCustomer', text: 'auth.demoCustomerText' },
	{ id: 'admin', icon: ShieldCheck, title: 'auth.demoAdmin', text: 'auth.demoAdminText' },
]

/**
 * One-click sign-in to the shared demo accounts on the sign-in page.
 * Shown only when the server runs in demo mode (`demo.enabled` in the shop config).
 * @param redirectTo where a demo customer goes afterwards; the demo admin goes to the admin panel
 */
const DemoLogin = ({ redirectTo = '/' }) => {
	const config = useShopConfig()
	const { loginAsDemo } = useAuth()
	const { t } = useI18n()
	const toast = useToast()
	const navigate = useNavigate()
	const [pending, setPending] = useState(null)

	if (!config?.demo?.enabled) return null

	const signIn = async (account) => {
		setPending(account)
		try {
			const { user } = await loginAsDemo(account)
			toast.show({ tone: 'success', message: t('auth.demoWelcome', { name: user.username }) })
			navigate(account === 'admin' ? '/admin' : redirectTo, { replace: true })
		} catch (error) {
			toast.show({ tone: 'error', message: getErrorMessage(error) })
			setPending(null)
		}
	}

	return (
		<section className={style.demo} aria-labelledby='demo-title'>
			<h2 id='demo-title' className={style.title}>
				{t('auth.demoTitle')}
			</h2>
			<p className={style.text}>{t('auth.demoText')}</p>
			<div className={style.accounts}>
				{ACCOUNTS.map(({ id, icon: Icon, title, text }) => (
					<button
						key={id}
						type='button'
						className={style.account}
						onClick={() => signIn(id)}
						disabled={Boolean(pending)}
						aria-busy={pending === id}
					>
						<Icon size={20} aria-hidden className={style.icon} />
						<span className={style.accountText}>
							<span className={style.accountTitle}>
								{pending === id ? t('auth.demoSigningIn') : t(title)}
							</span>
							<span className={style.accountHint}>{t(text)}</span>
						</span>
					</button>
				))}
			</div>
			<p className={style.divider}>
				<span>{t('auth.or')}</span>
			</p>
		</section>
	)
}

export default DemoLogin
