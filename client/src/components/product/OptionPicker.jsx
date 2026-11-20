import { swatchColor } from '../../data/catalog'
import style from './OptionPicker.module.css'

/**
 * Accessible radio group rendered as swatches (colors) or pills (sizes).
 * Native radio inputs keep keyboard navigation and screen reader support.
 */
const OptionPicker = ({ legend, name, options, value, onChange, variant = 'pill' }) => (
	<fieldset className={style.fieldset}>
		<legend className={style.legend}>
			{legend}: <span className={style.selected}>{value}</span>
		</legend>
		<div className={style.options}>
			{options.map((option) => (
				<label key={option} className={style.option} title={option}>
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
							<span className='visually-hidden'>{option}</span>
						</span>
					) : (
						<span className={style.pill}>{option}</span>
					)}
				</label>
			))}
		</div>
	</fieldset>
)

export default OptionPicker
