import { cx } from '../../utils/cx'
import style from './Section.module.css'

/** A page section with a heading row and optional action link. */
const Section = ({ title, action, children }) => (
	<section className={cx('container', style.section)}>
		<div className={style.header}>
			<h2 className={style.title}>{title}</h2>
			{action}
		</div>
		{children}
	</section>
)

export default Section
