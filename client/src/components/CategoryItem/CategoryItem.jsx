import { Link } from 'react-router'
import style from './CategoryItem.module.css'

const CategoryItem = ({ item }) => {
	return (
		<div className={style.container}>
			<Link to={`/products/${item.category}`}>
				<img className={style['category__img']} src={item.img} alt={item.title} />
				<div className={style['category__data']}>
					<h1 className={style['category__data-title']}>{item.title}</h1>
					<span className={style['category__data-btn']}>Shop now</span>
				</div>
			</Link>
		</div>
	)
}

export default CategoryItem
