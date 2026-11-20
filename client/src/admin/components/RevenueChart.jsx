import { useId } from 'react'
import { formatMoney } from '../../utils/money'
import { formatDate } from '../format'
import style from './RevenueChart.module.css'

const WIDTH = 600
const HEIGHT = 180
const AXIS = 20 // space for the date labels
const GAP = 2

/**
 * Bar chart of revenue per day. Screen readers get the same data as a table.
 * @param days `[{ date: 'YYYY-MM-DD', total, orders }]`
 */
const RevenueChart = ({ days }) => {
	const titleId = useId()
	const max = Math.max(...days.map((day) => day.total), 1)
	const total = days.reduce((sum, day) => sum + day.total, 0)
	const barWidth = WIDTH / days.length - GAP
	const chartHeight = HEIGHT - AXIS

	return (
		<figure className={style.figure}>
			<figcaption id={titleId} className={style.caption}>
				<span>Revenue, last {days.length} days</span>
				<strong>{formatMoney(total)}</strong>
			</figcaption>

			<svg
				className={style.chart}
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				preserveAspectRatio='none'
				role='img'
				aria-labelledby={titleId}
			>
				<line className={style.baseline} x1='0' x2={WIDTH} y1={chartHeight} y2={chartHeight} />
				{days.map((day, i) => {
					const height = (day.total / max) * (chartHeight - 4)
					return (
						<rect
							key={day.date}
							className={day.total ? style.bar : style.emptyBar}
							x={i * (barWidth + GAP)}
							y={chartHeight - Math.max(height, 1)}
							width={barWidth}
							height={Math.max(height, 1)}
						>
							<title>
								{formatDate(day.date)}: {formatMoney(day.total)} ({day.orders} orders)
							</title>
						</rect>
					)
				})}
			</svg>
			<div className={style.axis} aria-hidden>
				<span>{formatDate(days[0].date)}</span>
				<span>Peak {formatMoney(max === 1 && !total ? 0 : max)}</span>
				<span>{formatDate(days.at(-1).date)}</span>
			</div>

			<table className='visually-hidden'>
				<caption>Revenue per day</caption>
				<thead>
					<tr>
						<th scope='col'>Date</th>
						<th scope='col'>Revenue</th>
						<th scope='col'>Orders</th>
					</tr>
				</thead>
				<tbody>
					{days.map((day) => (
						<tr key={day.date}>
							<td>{formatDate(day.date)}</td>
							<td>{formatMoney(day.total)}</td>
							<td>{day.orders}</td>
						</tr>
					))}
				</tbody>
			</table>
		</figure>
	)
}

export default RevenueChart
