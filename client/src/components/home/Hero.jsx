import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { cx } from '../../utils/cx'
import Button from '../ui/Button'
import style from './Hero.module.css'

const HERO_IMAGE = '/images/site/hero.jpg'

const Hero = () => (
	<section className={cx('container', style.hero)}>
		<div className={style.text}>
			<p className='eyebrow'>New season</p>
			<h1 className={style.title}>Quiet essentials for every day.</h1>
			<p className={style.lead}>
				Considered basics, soft layers and denim that lasts — made to be worn on repeat.
			</p>
			<Button as={Link} to='/products'>
				Shop the collection <ArrowRight size={16} aria-hidden />
			</Button>
		</div>
		<div className={style.media}>
			<img className={style.image} src={HERO_IMAGE} alt='' fetchpriority='high' />
		</div>
	</section>
)

export default Hero
