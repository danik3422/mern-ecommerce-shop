import { useState } from 'react'
import Button from '../../../components/ui/Button'
import { cx } from '../../../utils/cx'
import { PERIOD_PRESETS, rangeError } from './period'
import style from './PeriodPicker.module.css'

/** Start and end dates of a custom period; applied together, so the report loads once. */
const CustomRange = ({ from, to, today, onApply }) => {
	const [draft, setDraft] = useState({ from, to })
	const [touched, setTouched] = useState(false)
	const error = rangeError(draft.from, draft.to)

	const submit = (event) => {
		event.preventDefault()
		setTouched(true)
		if (!error) onApply(draft)
	}

	return (
		<form className={style.custom} onSubmit={submit} noValidate>
			<label className={style.date}>
				<span>From</span>
				<input
					type='date'
					value={draft.from}
					max={today}
					onChange={(event) => setDraft({ ...draft, from: event.target.value })}
				/>
			</label>
			<label className={style.date}>
				<span>To</span>
				<input
					type='date'
					value={draft.to}
					max={today}
					onChange={(event) => setDraft({ ...draft, to: event.target.value })}
				/>
			</label>
			<Button type='submit' size='sm'>
				Apply
			</Button>
			{touched && error && (
				<p className={style.error} role='alert'>
					{error}
				</p>
			)}
		</form>
	)
}

/**
 * Period presets as a segmented control, date inputs for a custom range and the
 * "compare with the previous period" switch.
 * @param value `{ period, from, to }` (resolved days of the current choice)
 */
const PeriodPicker = ({ value, today, compare, onPreset, onCustom, onCompareChange }) => (
	<div className={style.picker}>
		<div className={style.presets} role='group' aria-label='Period'>
			{PERIOD_PRESETS.map((preset) => (
				<button
					key={preset.id}
					type='button'
					className={cx(style.preset, value.period === preset.id && style.selected)}
					aria-pressed={value.period === preset.id}
					onClick={() => onPreset(preset.id)}
				>
					{preset.label}
				</button>
			))}
		</div>
		<div className={style.row}>
			{value.period === 'custom' && (
				<CustomRange
					key={`${value.from}-${value.to}`}
					{...value}
					today={today}
					onApply={onCustom}
				/>
			)}
			<label className={style.compare}>
				<input
					type='checkbox'
					checked={compare}
					onChange={(event) => onCompareChange(event.target.checked)}
				/>
				Compare with previous period
			</label>
		</div>
	</div>
)

export default PeriodPicker
