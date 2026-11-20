import { Link } from 'react-router'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useI18n } from '../i18n/useI18n'

const NotFound = () => {
	const { t } = useI18n()
	useDocumentTitle(t('notFound.title'))

	return (
		<EmptyState
			title={t('notFound.title')}
			action={
				<Button as={Link} to='/' variant='secondary'>
					{t('notFound.back')}
				</Button>
			}
		>
			{t('notFound.text')}
		</EmptyState>
	)
}

export default NotFound
