import { Search } from 'lucide-react'
import { useId, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import style from './SearchForm.module.css'

/** Header search: submits to the catalog as /products?q=... */
const SearchForm = ({ onSearch }) => {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const [query, setQuery] = useState(searchParams.get('q') ?? '')
	// the header renders two forms (desktop and mobile menu), so ids must be unique
	const inputId = useId()

	const handleSubmit = (e) => {
		e.preventDefault()
		const q = query.trim()
		navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products')
		onSearch?.()
	}

	return (
		<form role='search' className={style.form} onSubmit={handleSubmit}>
			<label htmlFor={inputId} className='visually-hidden'>
				Search products and brands
			</label>
			<Search size={16} className={style.icon} aria-hidden />
			<input
				id={inputId}
				type='search'
				className={style.input}
				placeholder='Search products and brands'
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				autoComplete='off'
			/>
		</form>
	)
}

export default SearchForm
