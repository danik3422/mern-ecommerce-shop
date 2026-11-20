import { cx } from '../../utils/cx'
import style from './Price.module.css'
import { useI18n } from '../../i18n/useI18n'

/** Current price; on sale also the crossed-out original price and the discount. */
const Price = ({ product, size = 'md', className }) => {
	const { t, formatMoney } = useI18n()
	return (
		<p className={cx(style.price, style[size], className)}>
			<span className={cx(product.onSale && style.sale)}>{formatMoney(product.price)}</span>
			{product.onSale && (
				<>
					<s className={style.original}>
						<span className='visually-hidden'>{t('price.original')} </span>
						{formatMoney(product.compareAtPrice)}
					</s>
					<span className={style.discount}>−{product.discountPercent}%</span>
				</>
			)}
		</p>
	)
}

export default Price
