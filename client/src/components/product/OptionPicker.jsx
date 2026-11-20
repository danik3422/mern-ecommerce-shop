import { swatchColor } from '../../data/catalog'
import style from './OptionPicker.module.css'

/**
 * Accessible radio group rendered as swatches (colors) or pills (sizes).
 * Native radio inputs keep keyboard navigation and screen reader support.
 */
const OptionPicker = ({
	legend,
	name,
	options,
	value,
	onChange,
	variant = 'pill',
	// shows an option, e.g. a translated color name
	formatOption = (option) => option,
}) => (
	<fieldset className={style.fieldset}>
		<legend className={style.legend}>
			{legend}: <span className={style.selected}>{formatOption(value)}</span>
		</legend>
		<div className={style.options}>
			{options.map((option) => (
				<label key={option} className={style.option} title={formatOption(option)}>
					<input
						type='radio'
						name={name}
						value={option}
						checked={option === value}
						onChange={() => onChange(option)}
						className='visually-hidden'
					/>
					{variant === 'swatch' ? (
						<span className={style.swatch} style={{ backgroundColor: swatchColor(option) }}>
							<span className='visually-hidden'>{formatOption(option)}</span>
						</span>
					) : (
						<span className={style.pill}>{formatOption(option)}</span>
					)}
				</label>
			))}
		</div>
	</fieldset>
)

export default OptionPicker
