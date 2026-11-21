import { Link } from 'react-router'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../auth/useAuth'
import { can } from '../permissions'

/** Shown instead of a page the signed-in staff member has no permission for. */
export const NoAccess = ({ area }) => (
	<EmptyState
		title="You don't have access"
		action={
			<Button as={Link} to='/admin' variant='secondary'>
				Back to the admin home
			</Button>
		}
	>
		Your account cannot open {area}. Ask an owner to add the permission under Team.
	</EmptyState>
)

/** Renders `children` only with `permission`, otherwise the no-access page. */
const RequirePermission = ({ permission, area, children }) => {
	const { user } = useAuth()
	return can(user, permission) ? children : <NoAccess area={area} />
}

export default RequirePermission
