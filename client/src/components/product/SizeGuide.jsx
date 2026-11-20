import { Ruler } from 'lucide-react'
import { useState } from 'react'
import { CLOTHING_SIZES, JEANS_SIZES } from '../../data/sizeGuide'
import Modal from '../ui/Modal'
import style from './SizeGuide.module.css'
import { useI18n } from '../../i18n/useI18n'

/**
 * "Size guide" button that opens a table of body measurements.
 * @param sizes product size labels; numeric labels show the jeans table
 */
const SizeGuide = ({ sizes }) => {
	const { t } = useI18n()
	const [isOpen, setIsOpen] = useState(false)
	const isJeans = sizes.some((label) => /^\d+$/.test(label))

	return (
		<>
			<button type='button' className={style.trigger} onClick={() => setIsOpen(true)}>
				<Ruler size={16} aria-hidden /> {t('sizeGuide.button')}
			</button>
			{isOpen && (
				<Modal title={t('sizeGuide.button')} onClose={() => setIsOpen(false)}>
					<p className={style.lead}>{t('sizeGuide.lead')}</p>
					<table className={style.table}>
						<caption className='visually-hidden'>
							{isJeans ? t('sizeGuide.jeans') : t('sizeGuide.clothing')}
						</caption>
						<thead>
							<tr>
								<th scope='col'>{t('sizeGuide.size')}</th>
								{isJeans ? (
									<th scope='col'>{t('sizeGuide.waist')}</th>
								) : (
									<>
										<th scope='col'>{t('sizeGuide.chest')}</th>
										<th scope='col'>{t('sizeGuide.waist')}</th>
										<th scope='col'>{t('sizeGuide.hips')}</th>
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
