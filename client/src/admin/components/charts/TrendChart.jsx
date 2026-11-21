import { useId, useState } from 'react'
import { cx } from '../../../utils/cx'
import { formatDayRange, formatPercent, niceScale } from './chartFormat'
import style from './TrendChart.module.css'

// drawing space of the SVG; it stretches to the container, strokes keep their width
const WIDTH = 1000
const HEIGHT = 300
const MAX_X_LABELS = 6

const pointsOf = (values, max) =>
	values.map((value, i) => [
		values.length > 1 ? (i / (values.length - 1)) * WIDTH : WIDTH / 2,
		HEIGHT - (value / max) * HEIGHT,
	])
const linePath = (points) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join('')

/** Indexes of the x-axis labels: first, last and evenly spaced ones between. */
const labelIndexes = (count) => {
	if (count <= MAX_X_LABELS) return [...Array(count).keys()]
	const step = (count - 1) / (MAX_X_LABELS - 1)
	return Array.from({ length: MAX_X_LABELS }, (_, i) => Math.round(i * step))
}

/** Change of `value` vs `before` as "+12%"; null when there is nothing to compare with. */
const changeText = (value, before) => {
	if (before === undefined || before === null) return null
	if (!before) return value ? 'new' : null
	const change = (value - before) / before
	return `${change >= 0 ? '+' : '−'}${formatPercent(Math.abs(change))}`
}

/**
 * Line and area chart of one measure over time, with the previous period as a faint dashed line.
 * Hover (or focus and use the arrow keys) to see the values of a day or week; screen readers
 * get the same numbers as a table.
 *
 * @param buckets `[{ from, to, [valueKey]: number }]`
 * @param previous buckets of the previous period (same length), or null
 * @param format formats a value, e.g. as money
 * @param integer whole-number axis steps (for counts)
 */
const TrendChart = ({
	title,
	buckets,
	previous,
	valueKey,
	format,
	formatAxis = format,
	integer = false,
	currentLabel,
	previousLabel,
}) => {
	const titleId = useId()
	const [active, setActive] = useState(null)

	const values = buckets.map((bucket) => bucket[valueKey])
	const previousValues = previous?.map((bucket) => bucket[valueKey]) ?? []
	const { max, ticks } = niceScale(Math.max(...values, ...previousValues, 0), 4, { integer })
	const points = pointsOf(values, max)
	const previousPoints = pointsOf(previousValues, max)
	const isEmpty = values.every((value) => !value) && previousValues.every((value) => !value)
	const n = buckets.length

	const at = (index) => (n > 1 ? (index / (n - 1)) * 100 : 50)
	const pickFromPointer = (event) => {
		const rect = event.currentTarget.getBoundingClientRect()
		const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
		setActive(Math.round(ratio * (n - 1)))
	}
	const onKeyDown = (event) => {
		const moves = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity }
		if (!(event.key in moves)) return
		event.preventDefault()
		const next = (active ?? (moves[event.key] > 0 ? -1 : n)) + moves[event.key]
		setActive(Math.min(Math.max(next, 0), n - 1))
	}

	const tooltip = active !== null && buckets[active]
	const tooltipBefore = tooltip && previous?.[active]

	return (
		<figure className={style.figure}>
			<figcaption id={titleId} className='visually-hidden'>
				{title}
			</figcaption>

			{previous && (
				<ul role='list' className={style.legend} aria-hidden>
					<li>
						<span className={style.swatch} />
						{currentLabel}
					</li>
					<li>
						<span className={cx(style.swatch, style.swatchPrevious)} />
						{previousLabel}
					</li>
				</ul>
			)}

			<div className={style.frame}>
				<div className={style.yAxis} aria-hidden>
					{ticks.toReversed().map((tick) => (
						<span key={tick} style={{ top: `${(1 - tick / max) * 100}%` }}>
							{formatAxis(tick)}
						</span>
					))}
				</div>

				<div
					className={style.plot}
					role='img'
					aria-labelledby={titleId}
					tabIndex={0}
					onPointerMove={pickFromPointer}
					onPointerDown={pickFromPointer}
					onPointerLeave={() => setActive(null)}
					onKeyDown={onKeyDown}
					onBlur={() => setActive(null)}
				>
					<svg
						className={style.svg}
						viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
						preserveAspectRatio='none'
						aria-hidden
					>
						{ticks.map((tick) => (
							<line
								key={tick}
								className={tick ? style.grid : style.baseline}
								x1='0'
								x2={WIDTH}
								y1={HEIGHT - (tick / max) * HEIGHT}
								y2={HEIGHT - (tick / max) * HEIGHT}
							/>
						))}
						{previous && <path className={style.previous} d={linePath(previousPoints)} />}
						{n > 1 && (
							<path
								className={style.area}
								d={`${linePath(points)}L${WIDTH},${HEIGHT}L0,${HEIGHT}Z`}
							/>
						)}
						<path className={style.line} d={linePath(points)} />
						{tooltip && (
							<line
								className={style.crosshair}
								x1={points[active][0]}
								x2={points[active][0]}
								y1='0'
								y2={HEIGHT}
							/>
						)}
					</svg>

					{/* dots are HTML, so they stay round when the SVG stretches */}
					{tooltip && (
						<>
							{tooltipBefore && (
								<span
									className={cx(style.dot, style.dotPrevious)}
									style={{
										left: `${at(active)}%`,
										top: `${(previousPoints[active][1] / HEIGHT) * 100}%`,
									}}
								/>
							)}
							<span
								className={style.dot}
								style={{ left: `${at(active)}%`, top: `${(points[active][1] / HEIGHT) * 100}%` }}
							/>
							<div
								className={cx(style.tooltip, at(active) > 60 && style.tooltipLeft)}
								style={{ left: `${at(active)}%` }}
								aria-hidden
							>
								<p className={style.tooltipDate}>{formatDayRange(tooltip.from, tooltip.to)}</p>
								<p className={style.tooltipValue}>
									{format(tooltip[valueKey])}
									{tooltipBefore && changeText(tooltip[valueKey], tooltipBefore[valueKey]) && (
										<span className={style.tooltipChange}>
											{changeText(tooltip[valueKey], tooltipBefore[valueKey])}
										</span>
									)}
								</p>
								{tooltipBefore && (
									<p className={style.tooltipPrevious}>
										{formatDayRange(tooltipBefore.from, tooltipBefore.to)}:{' '}
										{format(tooltipBefore[valueKey])}
									</p>
								)}
							</div>
						</>
					)}

					{isEmpty && <p className={style.empty}>No sales in this period</p>}
				</div>

				<div className={style.xAxis} aria-hidden>
					{labelIndexes(n).map((i) => (
						<span
							key={i}
							className={cx(i === 0 && style.first, i === n - 1 && n > 1 && style.last)}
							style={{ left: `${at(i)}%` }}
						>
							{formatDayRange(buckets[i].from, buckets[i].to)}
						</span>
					))}
				</div>
			</div>

			<table className='visually-hidden'>
				<caption>{title}</caption>
				<thead>
					<tr>
						<th scope='col'>Period</th>
						<th scope='col'>{currentLabel ?? 'Value'}</th>
						{previous && <th scope='col'>{previousLabel}</th>}
					</tr>
				</thead>
				<tbody>
					{buckets.map((bucket, i) => (
						<tr key={bucket.from}>
							<th scope='row'>{formatDayRange(bucket.from, bucket.to, { year: true })}</th>
							<td>{format(bucket[valueKey])}</td>
							{previous && (
								<td>
									{previous[i]
										? `${format(previous[i][valueKey])} (${formatDayRange(previous[i].from, previous[i].to, { year: true })})`
										: '—'}
								</td>
							)}
						</tr>
					))}
				</tbody>
			</table>
		</figure>
	)
}

export default TrendChart
