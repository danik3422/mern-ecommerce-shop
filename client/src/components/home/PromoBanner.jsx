import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { SALE_CATEGORY } from '../../data/catalog'
import { cx } from '../../utils/cx'
import style from './PromoBanner.module.css'
import { useI18n } from '../../i18n/useI18n'

/** Full-width sale announcement. */
const PromoBanner = () => {
	const { t } = useI18n()
	return (
		<section className={style.banner} aria-label={t('nav.sale')}>
			<div className={cx('container', style.inner)}>
				<div>
					<p className={style.eyebrow}>{t('home.saleEyebrow')}</p>
					<p className={style.title}>{t('home.saleTitle')}</p>
				</div>
				<Link to={`/products/${SALE_CATEGORY}`} className={style.link}>
					{t('home.shopSale')} <ArrowRight size={16} aria-hidden />
				</Link>
			</div>
		</section>
	)
}

export default PromoBanner
