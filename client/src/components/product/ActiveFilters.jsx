import { X } from 'lucide-react'
import { capitalize } from '../../utils/text'
import style from './ActiveFilters.module.css'

/**
 * Removable chips for the active filters.
 * @param chips from `activeFilterChips`
 * @param onRemove called with the chip's URL change
 */
const ActiveFilters = ({ chips, onRemove, onClearAll }) => {
	if (!chips.length) return null

	return (
		<div className={style.bar}>
			<ul role='list' className={style.chips} aria-label='Active filters'>
				{chips.map((chip) => (
					<li key={chip.key}>
						<button
							type='button'
							className={style.chip}
							onClick={() => onRemove(chip.change)}
							aria-label={`Remove filter ${chip.label}`}
						>
							{capitalize(chip.label)} <X size={14} aria-hidden />
						</button>
					</li>
				))}
			</ul>
			<button type='button' className={style.clear} onClick={onClearAll}>
				Clear all
			</button>
		</div>
	)
}

export default ActiveFilters
