import LogoutIcon from '@mui/icons-material/Logout'
import PersonIcon from '@mui/icons-material/Person'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import { Badge } from '@mui/material'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
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
				<Link to='/cart' className={style['navbar__btn']} aria-label='Cart'>
					<Badge badgeContent={count} color='primary'>
						<ShoppingCartIcon />
					</Badge>
				</Link>
			</div>
		</nav>
	)
}

export default Navbar
