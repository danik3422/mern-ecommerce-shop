import {
	Facebook,
	Instagram,
	Mail,
	Phone,
	Room,
	Twitter,
} from '@material-ui/icons'
import { Link } from 'react-router-dom'
import style from './Footer.module.css'

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
						<a href='https://pl-pl.facebook.com/' target='__blank'>
							<Facebook />
						</a>
						<a href='https://www.instagram.com/' target='__blank'>
							<Instagram />
						</a>
						<a href='https://twitter.com/' target='__blank'>
							<Twitter />
						</a>
					</div>
				</div>
				<div className={style['footer__center']}>
					<ul className={style['footer__center-list']}>
						<li className={style['footer__center-item']}>Home</li>
						<li className={style['footer__center-item']}>Cart</li>
						<li className={style['footer__center-item']}>Man Fashion</li>
						<li className={style['footer__center-item']}>Woman Fashion</li>
						<li className={style['footer__center-item']}>Accessories</li>
						<li className={style['footer__center-item']}>My Account</li>
						<li className={style['footer__center-item']}>Wishlist</li>
						<li className={style['footer__center-item']}>Terms</li>
					</ul>
				</div>
				<div className={style['footer__right']}>
					<div className={style['footer__contacts']}>
						<Room style={{ marginRight: '10px' }} />
						Stokłosy 3, Warszaw
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
						alt=''
					/>
				</div>
			</div>
		</>
	)
}

export default Footer
