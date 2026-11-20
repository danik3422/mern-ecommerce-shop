import { Ruler } from 'lucide-react'
import { useState } from 'react'
import { CLOTHING_SIZES, JEANS_SIZES } from '../../data/sizeGuide'
import Modal from '../ui/Modal'
import style from './SizeGuide.module.css'

/**
 * "Size guide" button that opens a table of body measurements.
 * @param sizes product size labels; numeric labels show the jeans table
 */
const SizeGuide = ({ sizes }) => {
	const [isOpen, setIsOpen] = useState(false)
	const isJeans = sizes.some((label) => /^\d+$/.test(label))

	return (
		<>
			<button type='button' className={style.trigger} onClick={() => setIsOpen(true)}>
				<Ruler size={16} aria-hidden /> Size guide
			</button>
			{isOpen && (
				<Modal title='Size guide' onClose={() => setIsOpen(false)}>
					<p className={style.lead}>
						Measurements of the body in centimetres. Between two sizes? Choose the larger one for a
						relaxed fit.
					</p>
					<table className={style.table}>
						<caption className='visually-hidden'>
							{isJeans ? 'Jeans sizes by waist' : 'Clothing sizes'}
						</caption>
						<thead>
							<tr>
								<th scope='col'>Size</th>
								{isJeans ? (
									<th scope='col'>Waist, cm</th>
								) : (
									<>
										<th scope='col'>Chest, cm</th>
										<th scope='col'>Waist, cm</th>
										<th scope='col'>Hips, cm</th>
									</>
								)}
							</tr>
						</thead>
						<tbody>
							{(isJeans ? JEANS_SIZES : CLOTHING_SIZES).map((row) => (
								<tr key={row.size}>
									<th scope='row'>{row.size}</th>
									{isJeans ? (
										<td>{row.waist}</td>
									) : (
										<>
											<td>{row.chest}</td>
											<td>{row.waist}</td>
											<td>{row.hips}</td>
										</>
									)}
								</tr>
							))}
						</tbody>
					</table>
				</Modal>
			)}
		</>
	)
}

export default SizeGuide
