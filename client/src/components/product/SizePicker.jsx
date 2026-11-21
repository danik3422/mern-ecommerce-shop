import { LOW_STOCK_THRESHOLD } from '../../data/catalog'
import { cx } from '../../utils/cx'
import style from './OptionPicker.module.css'
import { useI18n } from '../../i18n/useI18n'

/**
 * Size radio group: sold-out sizes are disabled, low stock is announced.
 * @param suggested size that reviewers suggest instead of `value` (the product runs small or
 *   large, see `suggestedSize`); it is gently highlighted with a hint that selects it
 * @param fitVerdict 'small' | 'large' — why `suggested` is suggested
 */
const SizePicker = ({ sizes, value, onChange, suggested = null, fitVerdict = null }) => {
	const { t } = useI18n()
	const selected = sizes.find((size) => size.label === value)
	const lowStock = selected && selected.stock > 0 && selected.stock <= LOW_STOCK_THRESHOLD

	return (
		<fieldset className={style.fieldset}>
			<legend className={style.legend}>
				{t('product.size')}:{' '}
				{value ? (
					<span className={style.selected}>{value}</span>
				) : (
					<span className={style.placeholder}>{t('product.chooseSize')}</span>
				)}
			</legend>
			<div className={style.options}>
				{sizes.map((size) => {
					const soldOut = size.stock === 0
					const isSuggested = size.label === suggested
					return (
						<label
							key={size.label}
							className={cx(
								style.option,
								soldOut && style.disabled,
								isSuggested && style.suggested,
							)}
							title={
								soldOut
									? t('card.sizeSoldOut', { size: size.label })
									: isSuggested
										? t('fit.recommended', { size: value })
										: size.label
							}
						>
							<input
								type='radio'
								name='size'
								value={size.label}
								checked={size.label === value}
								onChange={() => onChange(size.label)}
								disabled={soldOut}
								aria-label={soldOut ? t('card.sizeSoldOut', { size: size.label }) : size.label}
								className='visually-hidden'
							/>
							<span className={style.pill} aria-hidden>
								{size.label}
							</span>
						</label>
					)
				})}
			</div>
			{suggested && fitVerdict && (
				<button type='button' className={style.suggestion} onClick={() => onChange(suggested)}>
					{t(`fit.consider.${fitVerdict}`, { size: suggested })}
				</button>
			)}
			{lowStock && (
				<p className={style.stockNote} role='status'>
					{t('product.onlyLeft', { count: selected.stock })}
				</p>
			)}
		</fieldset>
	)
}

export default SizePicker
