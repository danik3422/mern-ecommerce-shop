import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '../ui/Button'
import style from './Pagination.module.css'

const Pagination = ({ page, pages, onChange }) => {
	if (pages <= 1) return null

	return (
		<nav className={style.pagination} aria-label='Pagination'>
			<Button variant='secondary' size='sm' onClick={() => onChange(page - 1)} disabled={page <= 1}>
				<ChevronLeft size={16} aria-hidden /> Previous
			</Button>
			<span className={style.status} aria-current='page'>
				Page {page} of {pages}
			</span>
			<Button
				variant='secondary'
				size='sm'
				onClick={() => onChange(page + 1)}
				disabled={page >= pages}
			>
				Next <ChevronRight size={16} aria-hidden />
			</Button>
		</nav>
	)
}

export default Pagination
