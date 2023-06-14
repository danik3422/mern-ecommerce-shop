import { categories } from '../../data'
import CategoryItem from '../CategoryItem/CategoryItem'
import style from './Categories.module.css'

const Categories = () => {
	return (
		<div className={style.container}>
			{categories.map((item) => (
				<CategoryItem item={item} key={item.id} />
			))}
		</div>
	)
}

export default Categories
