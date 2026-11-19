import style from './Pagination.module.css'

const Pagination = ({ page, pages, onChange }) => {
	if (pages <= 1) return null

	return (
		<nav className={style.pagination} aria-label='Pagination'>
			<button type='button' onClick={() => onChange(page - 1)} disabled={page <= 1}>
				Previous
			</button>
			<span>
				Page {page} of {pages}
			</span>
			<button type='button' onClick={() => onChange(page + 1)} disabled={page >= pages}>
				Next
			</button>
		</nav>
	)
}

export default Pagination
