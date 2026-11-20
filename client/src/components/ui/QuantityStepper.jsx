import { Minus, Plus } from 'lucide-react'
import { useI18n } from '../../i18n/useI18n'
import style from './QuantityStepper.module.css'

/**
 * Decrease/increase buttons around a number.
 * @param label what is counted, used in button labels for screen readers
 */
const QuantityStepper = ({ value, onChange, min = 1, max = 99, label: labelProp }) => {
	const { t } = useI18n()
	const label = labelProp ?? t('common.quantity')
	return (
		<div className={style.stepper} role='group' aria-label={label}>
			<button
				type='button'
				className={style.button}
				onClick={() => onChange(value - 1)}
				disabled={value <= min}
				aria-label={t('common.decrease', { label })}
			>
				<Minus size={14} aria-hidden />
			</button>
			<output className={style.value} aria-live='polite'>
				{value}
			</output>
			<button
				type='button'
				className={style.button}
				onClick={() => onChange(value + 1)}
				disabled={value >= max}
				aria-label={t('common.increase', { label })}
			>
				<Plus size={14} aria-hidden />
			</button>
		</div>
	)
}

export default QuantityStepper
