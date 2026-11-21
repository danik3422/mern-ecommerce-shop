import Select from '../../components/ui/Select'
import TextField from '../../components/ui/TextField'
import { CARRIER_OPTIONS } from '../tracking'
import style from './TrackingFields.module.css'

/**
 * Carrier, tracking number and link inputs. `errors` are field errors of the request,
 * e.g. `{ 'tracking.number': '…' }` — `prefix` is the part before the field name.
 */
const TrackingFields = ({ value, onChange, errors = {}, prefix = '' }) => {
	const set = (key) => (e) => onChange({ ...value, [key]: e.target.value })
	const isOther = value.carrier === 'other'
	return (
		<div className={style.fields}>
			<Select
				label='Carrier'
				value={value.carrier}
				options={CARRIER_OPTIONS}
				onChange={set('carrier')}
			/>
			<TextField
				label='Tracking number'
				value={value.number}
				onChange={set('number')}
				autoComplete='off'
				spellCheck={false}
				maxLength={40}
				error={errors[`${prefix}number`]}
			/>
			<TextField
				label={isOther ? 'Tracking link' : 'Tracking link (optional)'}
				type='url'
				value={value.url}
				onChange={set('url')}
				placeholder={isOther ? 'https://…' : 'Generated from the carrier and number'}
				className={style.wide}
				error={errors[`${prefix}url`] ?? errors[`${prefix}carrier`]}
			/>
		</div>
	)
}

export default TrackingFields
