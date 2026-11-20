import { getErrorMessage } from '../../api/client'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import style from './QueryState.module.css'

/**
 * Shows loading and error states of a TanStack query; renders `children(data)` once loaded.
 * @param query result of `useQuery`
 */
const QueryState = ({ query, label = 'data', children }) => {
	if (query.isPending) {
		return (
			<p className={style.loading} aria-busy='true'>
				Loading {label}…
			</p>
		)
	}
	if (query.isError) {
		return (
			<Alert tone='error' className={style.error}>
				Could not load {label}: {getErrorMessage(query.error)}
				<Button variant='ghost' size='sm' onClick={() => query.refetch()}>
					Try again
				</Button>
			</Alert>
		)
	}
	return children(query.data)
}

export default QueryState
