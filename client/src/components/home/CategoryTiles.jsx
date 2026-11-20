import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { CATEGORIES } from '../../data/catalog'
import style from './CategoryTiles.module.css'
import { useI18n } from '../../i18n/useI18n'

const CategoryTiles = () => {
	const { t } = useI18n()
	return (
		<ul role='list' className={style.tiles}>
			{CATEGORIES.map((category) => (
				<li key={category.slug}>
					<Link to={`/products/${category.slug}`} className={style.tile}>
						<div className={style.media}>
							<img className={style.image} src={category.img} alt='' loading='lazy' />
						</div>
						<h3 className={style.title}>
							{t(`categories.${category.slug}.title`)} <ArrowRight size={16} aria-hidden />
						</h3>
						<p className={style.description}>{t(`categories.${category.slug}.description`)}</p>
					</Link>
				</li>
			))}
		</ul>
	)
}

export default CategoryTiles
