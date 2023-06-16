import {
	FavoriteBorderOutlined,
	SearchOutlined,
	ShoppingCartOutlined,
} from '@material-ui/icons'

import style from './Product.module.css'

const Product = ({ item }) => {
	return (
		<div className={style.container}>
			<div className={style.circle} />
			<img className={style['product__img']} src={item.img} alt='' />
			<div className={style['product__info']}>
				<div className={style['product__info-icon']}>
					<ShoppingCartOutlined />
				</div>
				<div className={style['product__info-icon']}>
					<SearchOutlined />
				</div>
				<div className={style['product__info-icon']}>
					<FavoriteBorderOutlined />
				</div>
			</div>
		</div>
	)
}

export default Product
