import { LOW_STOCK_THRESHOLD } from '../../data/catalog'
import { cx } from '../../utils/cx'
import style from './OptionPicker.module.css'

/** Size radio group: sold-out sizes are disabled, low stock is announced. */
const SizePicker = ({ sizes, value, onChange }) => {
	const selected = sizes.find((size) => size.label === value)
	const lowStock = selected && selected.stock > 0 && selected.stock <= LOW_STOCK_THRESHOLD

	return (
		<fieldset className={style.fieldset}>
			<legend className={style.legend}>
				Size:{' '}
				{value ? (
					<span className={style.selected}>{value}</span>
				) : (
					<span className={style.placeholder}>choose a size</span>
				)}
			</legend>
			<div className={style.options}>
				{sizes.map((size) => {
					const soldOut = size.stock === 0
					return (
						<label
							key={size.label}
							className={cx(style.option, soldOut && style.disabled)}
							title={soldOut ? `${size.label} — sold out` : size.label}
						>
							<input
								type='radio'
								name='size'
								value={size.label}
								checked={size.label === value}
								onChange={() => onChange(size.label)}
								disabled={soldOut}
								aria-label={soldOut ? `${size.label}, sold out` : size.label}
								className='visually-hidden'
							/>
							<span className={style.pill} aria-hidden>
								{size.label}
							</span>
						</label>
					)
				})}
			</div>
			{lowStock && (
				<p className={style.stockNote} role='status'>
					Only {selected.stock} left in this size
				</p>
			)}
		</fieldset>
	)
}

export default SizePicker
