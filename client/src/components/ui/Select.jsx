import { ChevronDown } from 'lucide-react'
import { useId } from 'react'
import { cx } from '../../utils/cx'
import style from './Field.module.css'

/**
 * @param options `[{ value, label }]`
 * @param hideLabel keep the label for screen readers only (e.g. in compact filter bars)
 */
const Select = ({ label, options, hideLabel = false, className, id, ...selectProps }) => {
	const generatedId = useId()
	const selectId = id ?? generatedId

	return (
		<div className={cx(style.field, className)}>
			<label className={cx(style.label, hideLabel && 'visually-hidden')} htmlFor={selectId}>
				{label}
			</label>
			<div className={style.selectWrapper}>
				<select id={selectId} className={cx(style.control, style.select)} {...selectProps}>
					{options.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
				<ChevronDown className={style.chevron} size={16} aria-hidden />
			</div>
		</div>
	)
}

export default Select
