import { Link } from 'react-router'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const NotFound = () => {
	useDocumentTitle('Page not found')

	return (
		<EmptyState
			title='Page not found'
			action={
				<Button as={Link} to='/' variant='secondary'>
					Back to home
				</Button>
			}
		>
			The page you are looking for does not exist or has moved.
		</EmptyState>
	)
}

export default NotFound
