import {
	Facebook,
	Instagram,
	LocationOn,
	Mail,
	Phone,
	Twitter,
} from '@mui/icons-material'

import { Link } from 'react-router-dom'
import style from './Footer.module.css'

const footerLinks = [
	['Home', '/'],
	['Cart', '/cart'],
	['All products', '/products'],
	['Women', '/products/women'],
	['Coats', '/products/coats'],
	['Accessories', '/products/accessories'],
	['My Account', '/login'],
]

const Footer = () => {
	return (
		<>
			<div className={style['footer__wrapper']}>
				<div className={style['footer__left']}>
					<Link to='/'>
						<h1 className={style['footer__logo']}>CLOTHE SHOP</h1>
					</Link>

					<p className={style['footer__description']}>
						Here you can find our social links
					</p>
					<div className={style['footer__social']}>
						<a href='https://pl-pl.facebook.com/' target='_blank' rel='noreferrer'>
							<Facebook />
						</a>
						<a href='https://www.instagram.com/' target='_blank' rel='noreferrer'>
							<Instagram />
						</a>
						<a href='https://twitter.com/' target='_blank' rel='noreferrer'>
							<Twitter />
						</a>
					</div>
				</div>
				<div className={style['footer__center']}>
					<ul className={style['footer__center-list']}>
						{footerLinks.map(([title, to]) => (
							<li className={style['footer__center-item']} key={title}>
								<Link to={to}>{title}</Link>
							</li>
						))}
					</ul>
				</div>
				<div className={style['footer__right']}>
					<div className={style['footer__contacts']}>
						<LocationOn style={{ marginRight: '10px' }} />
						Stokłosy 3, Warsaw
					</div>
					<div className={style['footer__contacts']}>
						<Phone style={{ marginRight: '10px' }} />
						<a href='tel:+123 456 789'>+123 456 789</a>
					</div>
					<div className={style['footer__contacts']}>
						<Mail style={{ marginRight: '10px' }} />
						<a href='mailto:contact@gmail.com'>contact@gmail.com</a>
					</div>
					<img
						className={style['footer__payments']}
						src='https://i.ibb.co/Qfvn4z6/payment.png'
						alt='Accepted payment methods'
					/>
				</div>
			</div>
		</>
	)
}

export default Footer
