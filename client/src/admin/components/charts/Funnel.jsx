import { formatCount, formatPercent } from './chartFormat'
import style from './Funnel.module.css'

/**
 * Funnel steps as bars relative to the first step, with the share that made it from one
 * step to the next.
 * @param steps `[{ id, label, count, fromPrevious, fromFirst, hint? }]`
 */
const Funnel = ({ steps, label }) => (
	<ol className={style.funnel} aria-label={label}>
		{steps.map((step, i) => (
			<li key={step.id} className={style.step}>
				{i > 0 && (
					<p className={style.conversion}>
						<span aria-hidden>↓ </span>
						{formatPercent(step.fromPrevious)}
						<span className='visually-hidden'> of the previous step</span>
					</p>
				)}
				<div className={style.text}>
					<span className={style.label}>
						{step.label}
						{step.hint && <span className={style.hint}>{step.hint}</span>}
					</span>
					<span className={style.count}>
						{formatCount(step.count)}
						{i > 0 && (
							<span className={style.ofFirst}>
								{formatPercent(step.fromFirst)}
								<span className='visually-hidden'> of {steps[0].label.toLowerCase()}</span>
							</span>
						)}
					</span>
				</div>
				<span className={style.track} aria-hidden>
					<span className={style.bar} style={{ width: `${step.fromFirst * 100}%` }} />
				</span>
			</li>
		))}
	</ol>
)

export default Funnel
