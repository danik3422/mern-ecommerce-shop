import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Monitor, Smartphone } from 'lucide-react'
import { fetchSessions, revokeOtherSessions, revokeSession, sessionKeys } from '../../api/auth'
import { getErrorMessage } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import shared from '../../components/account/Account.module.css'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/confirm/useConfirm'
import { useToast } from '../../components/ui/toast/useToast'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useI18n } from '../../i18n/useI18n'
import style from './SecurityPage.module.css'

const MINUTE = 60_000
const UNITS = [
	['day', 24 * 60 * MINUTE],
	['hour', 60 * MINUTE],
	['minute', MINUTE],
]

/** "5 minutes ago" / "5 minut temu"; null for the last two minutes ("active now"). */
const timeAgo = (date, locale) => {
	const elapsed = Date.now() - new Date(date).getTime()
	if (elapsed < 2 * MINUTE) return null
	const [unit, size] = UNITS.find(([, ms]) => elapsed >= ms)
	const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
	return format.format(-Math.floor(elapsed / size), unit)
}

/**
 * /account/security — the devices signed in to the account ("Active sessions"):
 * sign out one of them, or all but this one. A signed-out device loses access on its next
 * request (the server checks the session on every request).
 */
const SecurityPage = () => {
	const { t, locale, formatDate } = useI18n()
	useDocumentTitle(t('security.title'))
	const { user } = useAuth()
	const queryClient = useQueryClient()
	const toast = useToast()
	const confirm = useConfirm()

	const sessions = useQuery({ queryKey: [...sessionKeys.all, user._id], queryFn: fetchSessions })
	const refresh = () => queryClient.invalidateQueries({ queryKey: sessionKeys.all })
	const showError = (error) => toast.show({ tone: 'error', message: getErrorMessage(error) })

	const revoke = useMutation({
		mutationFn: (id) => revokeSession(id),
		onSuccess: () => {
			toast.show({ tone: 'success', message: t('security.signedOut') })
			return refresh()
		},
		onError: showError,
	})
	const revokeOthers = useMutation({
		mutationFn: () => revokeOtherSessions(),
		onSuccess: ({ revoked }) => {
			toast.show({ tone: 'success', message: t('security.othersSignedOut', { count: revoked }) })
			return refresh()
		},
		onError: showError,
	})

	const deviceName = (session) =>
		t('security.device', {
			browser: session.browser ?? t('security.unknownBrowser'),
			os: session.os ?? t('security.unknownOs'),
		})

	const handleRevoke = async (session) => {
		const device = deviceName(session)
		const confirmed = await confirm({
			title: t('security.confirmSignOutTitle'),
			message: t('security.confirmSignOut', { device }),
			confirmLabel: t('security.signOut'),
			tone: 'danger',
		})
		if (confirmed) revoke.mutate(session.id)
	}

	const handleRevokeOthers = async () => {
		const confirmed = await confirm({
			title: t('security.confirmOthersTitle'),
			message: t('security.confirmOthers'),
			confirmLabel: t('security.signOutOthers'),
			tone: 'danger',
		})
		if (confirmed) revokeOthers.mutate()
	}

	const list = sessions.data ?? []
	const hasOthers = list.some((session) => !session.current)
	// shared demo accounts: the server lists and lets a visitor end only their own session
	const canManage = !user.isDemo

	return (
		<section className={shared.section} aria-labelledby='security-title'>
			<div>
				<h1 id='security-title' className={shared.title}>
					{t('security.title')}
				</h1>
				<p className={`${shared.muted} ${style.intro}`}>{t('security.intro')}</p>
			</div>

			{user.isDemo && <Alert title={t('security.demoTitle')}>{t('security.demoText')}</Alert>}

			{sessions.isPending && <p className={shared.muted}>{t('common.loading')}</p>}
			{sessions.isError && (
				<Alert tone='error'>
					{t('security.loadError', { error: getErrorMessage(sessions.error) })}
				</Alert>
			)}

			{list.length > 0 && (
				<ul role='list' className={style.list}>
					{list.map((session) => {
						const Icon = session.mobile ? Smartphone : Monitor
						const ago = timeAgo(session.lastUsedAt, locale)
						const name = deviceName(session)
						return (
							<li key={session.id} className={style.session}>
								<span className={style.icon} aria-hidden>
									<Icon size={20} strokeWidth={1.5} />
								</span>
								<div className={style.details}>
									<p className={style.name}>
										{name}
										{session.current && (
											<span className={`${shared.badge} ${style.current}`}>
												{t('security.thisDevice')}
											</span>
										)}
									</p>
									<p className={style.meta}>
										{session.ip && <span>{t('security.ip', { ip: session.ip })}</span>}
										<span>
											{session.current || !ago
												? t('security.activeNow')
												: t('security.lastActive', { time: ago })}
										</span>
										<span>{t('security.signedIn', { date: formatDate(session.createdAt) })}</span>
									</p>
								</div>
								{!session.current && canManage && (
									<Button
										variant='ghost'
										size='sm'
										className={style.action}
										onClick={() => handleRevoke(session)}
										disabled={revoke.isPending}
										aria-label={t('security.signOutDevice', { device: name })}
									>
										{t('security.signOut')}
									</Button>
								)}
							</li>
						)
					})}
				</ul>
			)}

			{sessions.isSuccess && canManage && (
				<div className={style.footer}>
					{hasOthers ? (
						<Button
							variant='secondary'
							size='sm'
							onClick={handleRevokeOthers}
							disabled={revokeOthers.isPending}
						>
							{revokeOthers.isPending ? t('security.signingOut') : t('security.signOutOthers')}
						</Button>
					) : (
						<p className={shared.muted}>{t('security.onlyThisDevice')}</p>
					)}
					<p className={shared.muted}>{t('security.passwordNote')}</p>
				</div>
			)}
		</section>
	)
}

export default SecurityPage
