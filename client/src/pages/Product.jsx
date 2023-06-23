import styled from 'styled-components'
import Footer from '../components/Footer/Footer'
import Navbar from '../components/Navbar/Navbar'

import { Add, Remove } from '@material-ui/icons'
import './../styles/main.scss'

const FilterColor = styled.div`
	margin: 0px 5px;
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background-color: ${(props) => props.color};
	cursor: pointer;
`

const Product = () => {
	return (
		<>
			<Navbar />
			<div className='product__wrapper'>
				<div className='product__img-container'>
					<img
						className='product__img'
						src='https://i.ibb.co/S6qMxwr/jean.jpg'
						alt=''
					/>
				</div>

				<div className='product__info'>
					<h1 className='product__title'>Denim</h1>
					<p className='product__description'>
						Lorem ipsum dolor sit amet consectetur adipisicing elit. Commodi
						architecto expedita corrupti voluptate placeat saepe voluptatem id
						iure error iusto?
					</p>
					<span className='product__price'>$ 20</span>
					<div className='product__filter-wrapper'>
						<div className='product__filter-color'>
							<span className='product__filter-title'>Color</span>
							<FilterColor color='black' />
							<FilterColor color='darkblue' />
							<FilterColor color='gray' />
						</div>

						<div className='product__filter-size'>
							<span className='product__filter-title'>Size</span>
							<select className='product__filter-size'>
								<option>XS</option>
								<option>S</option>
								<option>M</option>
								<option>L</option>
								<option>XL</option>
							</select>
						</div>
					</div>
					<div className='product__add-wrapper'>
						<div className='product__amount'>
							<Remove />
							<span className='product__add-price'>1</span>
							<Add />
						</div>
						<button className='product__add-btn'>Add to cart</button>
					</div>
				</div>
			</div>
			<Footer />
		</>
	)
}

export default Product
