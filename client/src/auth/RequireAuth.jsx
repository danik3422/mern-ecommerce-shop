import { Navigate, useLocation } from 'react-router'
import { useI18n } from '../i18n/useI18n'
import { useAuth } from './useAuth'

/**
 * Renders children only for signed-in users (and admins when `admin` is set);
 * others are sent to the sign-in page and come back after signing in.
 * While the session is being restored from the cookie (a moment after a reload) it shows an
 * empty, busy area instead of bouncing a signed-in user to the sign-in page.
 */
const RequireAuth = ({ admin = false, children }) => {
	const { user, isRestoring } = useAuth()
	const location = useLocation()
	const { t } = useI18n()

	if (isRestoring) {
		return (
			<div className='container' aria-busy='true' style={{ minHeight: '50vh' }}>
				<span className='visually-hidden' role='status'>
					{t('common.loading')}
				</span>
			</div>
		)
	}
	if (!user) return <Navigate to='/login' replace state={{ from: location.pathname }} />
	if (admin && !user.isAdmin) return <Navigate to='/' replace />
	return children
}

export default RequireAuth
