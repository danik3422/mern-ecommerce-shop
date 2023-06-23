import { Link } from 'react-router-dom'
import style from './CategoryItem.module.css'

const CategoryItem = ({ item }) => {
	return (
		<div className={style.container}>
			<Link to={`products/${item.category}`}>
				<img className={style['category__img']} src={item.img} alt='' />
				<div className={style['category__data']}>
					<h1 className={style['category__data-title']}>{item.title}</h1>
					<button className={style['category__data-btn']}>Shop now</button>
				</div>
			</Link>
		</div>
	)
}

export default CategoryItem
