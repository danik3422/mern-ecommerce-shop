import { X } from 'lucide-react'
import { useI18n } from '../../i18n/useI18n'
import { describeChip } from './catalogFilters'
import style from './ActiveFilters.module.css'

/**
 * Removable chips for the active filters.
 * @param chips from `activeFilterChips`
 * @param onRemove called with the chip's URL change
 */
const ActiveFilters = ({ chips, onRemove, onClearAll }) => {
	const i18n = useI18n()
	const { t } = i18n
	if (!chips.length) return null

	return (
		<div className={style.bar}>
			<ul role='list' className={style.chips} aria-label={t('list.activeFilters')}>
				{chips.map((chip) => {
					const label = describeChip(chip, i18n)
					return (
						<li key={chip.key}>
							<button
								type='button'
								className={style.chip}
								onClick={() => onRemove(chip.change)}
								aria-label={t('list.removeFilter', { label })}
							>
								{label} <X size={14} aria-hidden />
							</button>
						</li>
					)
				})}
			</ul>
			<button type='button' className={style.clear} onClick={onClearAll}>
				{t('list.clearAll')}
			</button>
		</div>
	)
}

export default ActiveFilters
