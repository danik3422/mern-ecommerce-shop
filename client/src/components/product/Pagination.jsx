import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '../ui/Button'
import style from './Pagination.module.css'
import { useI18n } from '../../i18n/useI18n'

const Pagination = ({ page, pages, onChange }) => {
	const { t } = useI18n()
	if (pages <= 1) return null

	return (
		<nav className={style.pagination} aria-label={t('pagination.label')}>
			<Button variant='secondary' size='sm' onClick={() => onChange(page - 1)} disabled={page <= 1}>
				<ChevronLeft size={16} aria-hidden /> {t('pagination.previous')}
			</Button>
			<span className={style.status} aria-current='page'>
				{t('pagination.page', { page, pages })}
			</span>
			<Button
				variant='secondary'
				size='sm'
				onClick={() => onChange(page + 1)}
				disabled={page >= pages}
			>
				{t('pagination.next')} <ChevronRight size={16} aria-hidden />
			</Button>
		</nav>
	)
}

export default Pagination
