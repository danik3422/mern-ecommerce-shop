import {
	Logout as LogoutIcon,
	Person as PersonIcon,
	ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material'
import { Badge } from '@mui/material'
import { Link } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { useCart } from '../../cart/useCart'
import style from './Navbar.module.css'

const Navbar = () => {
	const { user, logout } = useAuth()
	const { count } = useCart()

	return (
		<nav className={style['navbar__wrapper']}>
			<div className={style['navbar__logo']}>
				<Link to='/'>
					<span className={style.logo}>Clothe Shop</span>
				</Link>
			</div>
			<div className={style['navbar__panel']}>
				{user ? (
					<>
						<span className={style['navbar__user']}>Hi, {user.username}</span>
						<button
							type='button'
							className={style['navbar__btn']}
							onClick={logout}
							aria-label='Log out'
						>
							<LogoutIcon />
						</button>
					</>
				) : (
					<Link to='/login' className={style['navbar__btn']} aria-label='Sign in'>
						<PersonIcon />
					</Link>
				)}
				<Link to='/cart' className={style['navbar__btn']} aria-label={`Cart, ${count} items`}>
					<Badge badgeContent={count} color='primary'>
						<ShoppingCartIcon />
					</Badge>
				</Link>
			</div>
		</nav>
	)
}

export default Navbar
