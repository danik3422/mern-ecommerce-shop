import Button from '../../components/ui/Button'
import style from './Pager.module.css'

/** "Showing 1–20 of 54" with previous/next buttons. */
const Pager = ({ page, pages, total, limit, onChange }) => {
	if (!total) return null
	const from = (page - 1) * limit + 1
	const to = Math.min(page * limit, total)

	return (
		<nav className={style.pager} aria-label='Pagination'>
			<p className={style.status}>
				Showing {from}–{to} of {total}
			</p>
			{pages > 1 && (
				<div className={style.buttons}>
					<Button
						variant='secondary'
						size='sm'
						disabled={page <= 1}
						onClick={() => onChange(page - 1)}
					>
						Previous
					</Button>
					<Button
						variant='secondary'
						size='sm'
						disabled={page >= pages}
						onClick={() => onChange(page + 1)}
					>
						Next
					</Button>
				</div>
			)}
		</nav>
	)
}

export default Pager
