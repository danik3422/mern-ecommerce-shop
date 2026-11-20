import { Navigate, useLocation } from 'react-router'
import { useAuth } from './useAuth'

/**
 * Renders children only for signed-in users (and admins when `admin` is set);
 * others are sent to the sign-in page and come back after signing in.
 */
const RequireAuth = ({ admin = false, children }) => {
	const { user } = useAuth()
	const location = useLocation()

	if (!user) return <Navigate to='/login' replace state={{ from: location.pathname }} />
	if (admin && !user.isAdmin) return <Navigate to='/' replace />
	return children
}

export default RequireAuth
