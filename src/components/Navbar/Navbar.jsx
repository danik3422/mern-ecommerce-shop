import PersonIcon from '@mui/icons-material/Person'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'

import { Badge } from '@mui/material'
import React from 'react'
import { Link } from 'react-router-dom'
import style from './Navbar.module.css'

const Navbar = () => {
	return (
		<>
			<div className={style['navbar__wrapper']}>
				<div className={style['navbar__logo']}>
					<Link to='/'>
						<h1 className={style.logo}>Clothe Shop</h1>
					</Link>
				</div>
				<div className={style['navbar__panel']}>
					<button className={style['navbar__btn']}>
						<Link to='/login'>
							<PersonIcon />
						</Link>
					</button>
					<button className={style['navbar__btn']}>
						<Badge badgeContent={4} color='primary'>
							<Link to='/cart'>
								<ShoppingCartIcon />
							</Link>
						</Badge>
					</button>
				</div>
			</div>
		</>
	)
}

export default Navbar
