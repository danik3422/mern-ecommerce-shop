import { Check, ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { swatchColor } from '../../data/catalog'
import Button from '../ui/Button'
import { toggleValue } from './catalogFilters'
import style from './FilterPanel.module.css'
import { colorName } from '../../i18n/catalogText'
import { useI18n } from '../../i18n/useI18n'

/** Collapsible group; <details> keeps it keyboard- and screen-reader-friendly for free. */
const FilterSection = ({ title, count, children, defaultOpen = true }) => (
	<details className={style.section} open={defaultOpen}>
		<summary className={style.summary}>
			<span>
				{title}
				{count > 0 && <span className={style.badge}>{count}</span>}
			</span>
			<ChevronDown size={16} aria-hidden className={style.chevron} />
		</summary>
		<div className={style.content}>{children}</div>
	</details>
)

const CheckboxOption = ({ checked, onChange, label, count }) => (
	<label className={style.checkbox}>
		<input type='checkbox' checked={checked} onChange={onChange} className={style.checkboxInput} />
		<span className={style.checkboxBox} aria-hidden>
			{checked && <Check size={12} />}
		</span>
		<span className={style.checkboxLabel}>{label}</span>
		{count !== undefined && <span className={style.count}>{count}</span>}
	</label>
)

/**
 * Min/max price inputs, applied on submit so the list does not reload on every keystroke.
 * Keyed by the current values in the parent, so it resets when a chip removes the price filter.
 */
const PriceFilter = ({ minPrice, maxPrice, bounds, onApply }) => {
	const id = useId()
	const { t } = useI18n()
	const [min, setMin] = useState(minPrice)
	const [max, setMax] = useState(maxPrice)
	const invalid = min !== '' && max !== '' && Number(min) > Number(max)

	const handleSubmit = (e) => {
		e.preventDefault()
		if (!invalid) onApply({ minPrice: min, maxPrice: max })
	}

	return (
		<form className={style.price} onSubmit={handleSubmit}>
			<div className={style.priceInputs}>
				<label className={style.priceField} htmlFor={`${id}-min`}>
					<span>{t('filters.min')}</span>
					<input
						id={`${id}-min`}
						type='number'
						inputMode='decimal'
						min='0'
						placeholder={bounds ? String(Math.floor(bounds.min)) : '0'}
						value={min}
						onChange={(e) => setMin(e.target.value)}
					/>
				</label>
				<span aria-hidden>–</span>
				<label className={style.priceField} htmlFor={`${id}-max`}>
					<span>{t('filters.max')}</span>
					<input
						id={`${id}-max`}
						type='number'
						inputMode='decimal'
						min='0'
						placeholder={bounds ? String(Math.ceil(bounds.max)) : ''}
						value={max}
						onChange={(e) => setMax(e.target.value)}
						aria-invalid={invalid}
					/>
				</label>
			</div>
			{invalid && <p className={style.error}>{t('filters.minAboveMax')}</p>}
			<Button type='submit' variant='secondary' size='sm' disabled={invalid}>
				{t('filters.applyPrice')}
			</Button>
		</form>
	)
}

/**
 * All catalog filters with option counts from the facets endpoint.
 * @param filters current filters (see readFilters)
 * @param facets `{ brands, colors, sizes, price }` or undefined while loading
 * @param onChange called with URL changes, e.g. `{ brand: ['A', 'B'] }`
 * @param hideSaleToggle on the sale page every product is discounted
 */
const FilterPanel = ({ filters, facets, onChange, hideSaleToggle = false }) => {
	const { t } = useI18n()
	const toggle = (key, value) => onChange({ [key]: toggleValue(filters[key], value) })
	const priceCount = Number(filters.minPrice !== '') + Number(filters.maxPrice !== '')

	return (
		<div className={style.panel}>
			<FilterSection
				title={t('filters.availability')}
				count={Number(filters.inStock) + Number(!hideSaleToggle && filters.onSale)}
			>
				{!hideSaleToggle && (
					<CheckboxOption
						label={t('filters.onSale')}
						checked={filters.onSale}
						onChange={() => onChange({ onSale: !filters.onSale })}
					/>
				)}
				<CheckboxOption
					label={t('filters.inStockOnly')}
					checked={filters.inStock}
					onChange={() => onChange({ inStock: !filters.inStock })}
				/>
			</FilterSection>

			{facets?.brands.length > 0 && (
				<FilterSection title={t('filters.brand')} count={filters.brand.length}>
					{facets.brands.map(({ value, count }) => (
						<CheckboxOption
							key={value}
							label={value}
							count={count}
							checked={filters.brand.includes(value)}
							onChange={() => toggle('brand', value)}
						/>
					))}
				</FilterSection>
			)}

			{facets?.sizes.length > 0 && (
				<FilterSection title={t('filters.size')} count={filters.size.length}>
					<div className={style.pills}>
						{facets.sizes.map(({ value }) => (
							<label key={value} className={style.pill}>
								<input
									type='checkbox'
									checked={filters.size.includes(value)}
									onChange={() => toggle('size', value)}
									className='visually-hidden'
								/>
								<span>{value}</span>
							</label>
						))}
					</div>
				</FilterSection>
			)}

			{facets?.colors.length > 0 && (
				<FilterSection title={t('filters.color')} count={filters.color.length}>
					<div className={style.swatches}>
						{facets.colors.map(({ value, count }) => (
							<label key={value} className={style.swatchOption} title={colorName(t, value)}>
								<input
									type='checkbox'
									checked={filters.color.includes(value)}
									onChange={() => toggle('color', value)}
									className='visually-hidden'
								/>
								<span
									className={style.swatch}
									style={{ backgroundColor: swatchColor(value) }}
									aria-hidden
								/>
								<span className={style.swatchLabel}>
									{colorName(t, value)} <span className={style.count}>{count}</span>
								</span>
							</label>
						))}
					</div>
				</FilterSection>
			)}

			<FilterSection title={t('filters.price')} count={priceCount ? 1 : 0}>
				<PriceFilter
					key={`${filters.minPrice}-${filters.maxPrice}`}
					minPrice={filters.minPrice}
					maxPrice={filters.maxPrice}
					bounds={facets?.price}
					onApply={onChange}
				/>
			</FilterSection>
		</div>
	)
}

export default FilterPanel
