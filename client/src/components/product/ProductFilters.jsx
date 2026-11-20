import { COLOR_FILTERS, SIZE_FILTERS, SORT_OPTIONS } from '../../data/catalog'
import { capitalize } from '../../utils/text'
import Select from '../ui/Select'
import style from './ProductFilters.module.css'

const colorOptions = [
	{ value: '', label: 'All colors' },
	...COLOR_FILTERS.map((color) => ({ value: color, label: capitalize(color) })),
]
const sizeOptions = [
	{ value: '', label: 'All sizes' },
	...SIZE_FILTERS.map((size) => ({ value: size, label: size })),
]

/**
 * @param values `{ color, size, sort }`
 * @param onChange called with `(name, value)`
 */
const ProductFilters = ({ values, onChange }) => {
	const handleChange = (e) => onChange(e.target.name, e.target.value)

	return (
		<div className={style.filters} role='group' aria-label='Filter and sort products'>
			<Select
				label='Color'
				hideLabel
				name='color'
				value={values.color}
				options={colorOptions}
				onChange={handleChange}
			/>
			<Select
				label='Size'
				hideLabel
				name='size'
				value={values.size}
				options={sizeOptions}
				onChange={handleChange}
			/>
			<Select
				label='Sort by'
				hideLabel
				name='sort'
				value={values.sort}
				options={SORT_OPTIONS}
				onChange={handleChange}
				className={style.sort}
			/>
		</div>
	)
}

export default ProductFilters
