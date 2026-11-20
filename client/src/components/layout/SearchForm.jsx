import { Clock, Search, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useI18n } from '../../i18n/useI18n'
import { cx } from '../../utils/cx'
import { addRecentSearch, clearRecentSearches, getRecentSearches } from './recentSearches'
import style from './SearchForm.module.css'
import { useSearchSuggestions } from './useSearchSuggestions'

/**
 * Header search with suggestions (ARIA combobox): recent searches while empty,
 * matching brands and products while typing. ↑/↓ move, Enter opens, Esc closes.
 * @param onSearch called after navigating (e.g. to close the mobile menu)
 */
const SearchForm = ({ onSearch }) => {
	const navigate = useNavigate()
	const { t, formatMoney } = useI18n()
	const [searchParams] = useSearchParams()
	const [query, setQuery] = useState(searchParams.get('q') ?? '')
	const [isOpen, setIsOpen] = useState(false)
	const [activeIndex, setActiveIndex] = useState(-1)
	const [recent, setRecent] = useState(getRecentSearches)
	const inputRef = useRef(null)
	// the header renders two forms (desktop and mobile menu), so ids must be unique
	const id = useId()
	const listboxId = `${id}-listbox`

	const suggestions = useSearchSuggestions(query)
	const trimmed = query.trim()

	const go = (to, searchedText) => {
		if (searchedText) setRecent(addRecentSearch(searchedText))
		setIsOpen(false)
		setActiveIndex(-1)
		inputRef.current?.blur()
		navigate(to)
		onSearch?.()
	}

	const searchFor = (text) =>
		go(text ? `/products?q=${encodeURIComponent(text)}` : '/products', text)

	// one flat list of plain-data options so the keyboard can move through all groups
	const options = suggestions.isActive
		? [
				...suggestions.brands.map((brand) => ({
					kind: 'brand',
					group: t('search.brands'),
					key: `brand-${brand.value}`,
					value: brand.value,
					label: brand.value,
					hint: t('common.items', { count: brand.count }),
					ariaLabel: t('search.brandOption', {
						brand: brand.value,
						items: t('common.items', { count: brand.count }),
					}),
				})),
				...suggestions.products.map((product) => ({
					kind: 'product',
					group: t('search.products'),
					key: product._id,
					value: product.slug,
					product,
					ariaLabel: `${product.brand} ${product.title}, ${formatMoney(product.price)}`,
				})),
				{
					kind: 'search',
					group: 'all',
					key: 'all',
					value: trimmed,
					label: t('search.searchFor', { query: trimmed }),
					hint: suggestions.total ? t('search.results', { count: suggestions.total }) : undefined,
					ariaLabel: [
						t('search.searchFor', { query: trimmed }),
						suggestions.total && t('search.results', { count: suggestions.total }),
					]
						.filter(Boolean)
						.join(', '),
				},
			]
		: recent.map((text) => ({
				kind: 'recent',
				group: t('search.recent'),
				key: `recent-${text}`,
				value: text,
				label: text,
				ariaLabel: text,
			}))

	const selectOption = (option) => {
		if (option.kind === 'brand') go(`/products?brand=${encodeURIComponent(option.value)}`, trimmed)
		if (option.kind === 'product') go(`/product/${option.value}`, trimmed)
		if (option.kind === 'search') searchFor(option.value)
		if (option.kind === 'recent') {
			setQuery(option.value)
			searchFor(option.value)
		}
	}

	// a group title is shown above the first option of each group
	const groups = options.map((option) => option.group)
	const headingAt = (index) =>
		groups[index] !== 'all' && groups[index] !== groups[index - 1] ? groups[index] : null

	const showList = isOpen && options.length > 0
	const optionId = (index) => `${id}-option-${index}`

	const handleKeyDown = (e) => {
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault()
			setIsOpen(true)
			const last = options.length - 1
			// -1 means "back in the text field"; moving past either end wraps around
			setActiveIndex((current) => {
				if (e.key === 'ArrowDown') return current >= last ? -1 : current + 1
				return current <= -1 ? last : current - 1
			})
		}
		if (e.key === 'Escape') {
			setIsOpen(false)
			setActiveIndex(-1)
		}
	}

	const handleSubmit = (e) => {
		e.preventDefault()
		const active = showList && options[activeIndex]
		if (active) selectOption(active)
		else searchFor(trimmed)
	}

	return (
		<form role='search' className={style.form} onSubmit={handleSubmit}>
			<label htmlFor={id} className='visually-hidden'>
				{t('search.label')}
			</label>
			<Search size={16} className={style.icon} aria-hidden />
			<input
				ref={inputRef}
				id={id}
				type='search'
				className={style.input}
				placeholder={t('search.placeholder')}
				value={query}
				onChange={(e) => {
					setQuery(e.target.value)
					setIsOpen(true)
					setActiveIndex(-1)
				}}
				onFocus={() => setIsOpen(true)}
				onBlur={() => setIsOpen(false)}
				onKeyDown={handleKeyDown}
				autoComplete='off'
				role='combobox'
				aria-autocomplete='list'
				aria-expanded={showList}
				aria-controls={listboxId}
				aria-activedescendant={showList && activeIndex >= 0 ? optionId(activeIndex) : undefined}
			/>

			{showList && (
				<div className={style.panel}>
					<ul
						id={listboxId}
						role='listbox'
						aria-label={t('search.suggestions')}
						className={style.list}
					>
						{options.map((option, index) => {
							const heading = headingAt(index)
							return (
								<li key={option.key} role='presentation'>
									{heading && (
										<p className={style.groupTitle} aria-hidden>
											{heading}
										</p>
									)}
									<div
										id={optionId(index)}
										role='option'
										aria-selected={index === activeIndex}
										aria-label={option.ariaLabel}
										className={cx(
											style.option,
											index === activeIndex && style.active,
											option.kind === 'search' && style.allOption,
										)}
										// keep focus in the input so the click is not lost to blur
										onMouseDown={(e) => e.preventDefault()}
										onClick={() => selectOption(option)}
										onMouseEnter={() => setActiveIndex(index)}
									>
										{option.product ? (
											<>
												<img className={style.thumb} src={option.product.images[0]} alt='' />
												<span className={style.text}>
													<span className={style.brand}>{option.product.brand}</span>
													<span>{option.product.title}</span>
												</span>
												<span className={style.price}>{formatMoney(option.product.price)}</span>
											</>
										) : (
											<>
												{option.kind === 'recent' && (
													<Clock size={14} aria-hidden className={style.muted} />
												)}
												<span className={style.text}>{option.label}</span>
												{option.hint && <span className={style.muted}>{option.hint}</span>}
											</>
										)}
									</div>
								</li>
							)
						})}
					</ul>
					{!suggestions.isActive && recent.length > 0 && (
						<button
							type='button'
							className={style.clear}
							onMouseDown={(e) => e.preventDefault()}
							onClick={() => {
								clearRecentSearches()
								setRecent([])
							}}
						>
							<X size={14} aria-hidden /> {t('search.clearRecent')}
						</button>
					)}
				</div>
			)}
		</form>
	)
}

export default SearchForm
