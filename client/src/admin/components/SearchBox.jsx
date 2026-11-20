import { Search } from 'lucide-react'
import { useId, useState } from 'react'
import Button from '../../components/ui/Button'
import field from '../../components/ui/Field.module.css'
import table from './Table.module.css'

/**
 * Search field applied with the button or Enter, so typing does not refetch on every key.
 * Render it with `key={value}` so it resets when the URL changes.
 */
const SearchBox = ({ label, value, onSearch }) => {
	const id = useId()
	const [text, setText] = useState(value)

	return (
		<form
			role='search'
			className={`${field.field} ${table.search}`}
			onSubmit={(e) => {
				e.preventDefault()
				onSearch(text.trim())
			}}
		>
			<label htmlFor={id} className={field.label}>
				{label}
			</label>
			<div className={table.searchRow}>
				<input
					id={id}
					type='search'
					className={field.control}
					value={text}
					onChange={(e) => setText(e.target.value)}
				/>
				<Button
					type='submit'
					variant='secondary'
					aria-label='Search'
					className={table.searchButton}
				>
					<Search size={16} aria-hidden />
				</Button>
			</div>
		</form>
	)
}

export default SearchBox
