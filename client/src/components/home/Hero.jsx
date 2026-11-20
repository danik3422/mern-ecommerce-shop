import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { cx } from '../../utils/cx'
import Button from '../ui/Button'
import style from './Hero.module.css'
import { useI18n } from '../../i18n/useI18n'

const HERO_IMAGE = '/images/site/hero.jpg'

const Hero = () => {
	const { t } = useI18n()
	return (
		<section className={cx('container', style.hero)}>
			<div className={style.text}>
				<p className='eyebrow'>{t('home.newSeason')}</p>
				<h1 className={style.title}>{t('home.heroTitle')}</h1>
				<p className={style.lead}>{t('home.heroLead')}</p>
				<Button as={Link} to='/products'>
					{t('home.shopCollection')} <ArrowRight size={16} aria-hidden />
				</Button>
			</div>
			<div className={style.media}>
				<img className={style.image} src={HERO_IMAGE} alt='' fetchpriority='high' />
			</div>
		</section>
	)
}

export default Hero
