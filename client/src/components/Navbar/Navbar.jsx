import { Badge } from '@material-ui/core'
import { ShoppingCartOutlined } from '@material-ui/icons'
import React from 'react'
import { Link } from 'react-router-dom'
import style from './Navbar.module.css'

const Navbar = () => {
	return (
		<>
			<div className={style['navbar__wrapper']}>
				<div className={style['navbar__left']}>
					<span className={style['navbar__language']}>EN</span>
				</div>
				<div className={style['navbar__center']}>
					<Link to='/'>
						<h1 className={style.logo}>Clothe Shop</h1>
					</Link>
				</div>
				<div className={style['navbar__right']}>
					<button className={style['navbar__btn']}>
						<Link to='/register'>Register</Link>
					</button>
					<button className={style['navbar__btn']}>
						<Link to='/login'>Sign in</Link>
					</button>
					<button className={style['navbar__btn']}>
						<Badge badgeContent={4} color='primary'>
							<Link to='/cart'>
								<ShoppingCartOutlined />
							</Link>
						</Badge>
					</button>
				</div>
			</div>
		</>
	)
}

export default Navbar
