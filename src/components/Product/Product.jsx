import {
	FavoriteBorder,
	SearchOutlined,
	ShoppingBagOutlined,
} from '@mui/icons-material'
import style from './Product.module.css'

const Product = ({ item }) => {
	return (
		<div className={style.container}>
			<div className={style.circle} />
			<img className={style['product__img']} src={item.img} alt='' />
			<div className={style['product__info']}>
				<div className={style['product__info-icon']}>
					<ShoppingBagOutlined />
				</div>
				<div className={style['product__info-icon']}>
					<SearchOutlined />
				</div>
				<div className={style['product__info-icon']}>
					<FavoriteBorder />
				</div>
			</div>
		</div>
	)
}

export default Product
