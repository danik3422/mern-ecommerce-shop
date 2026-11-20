import style from './EmptyState.module.css'

/** A centered message with an optional action, e.g. for an empty bag or a missing page. */
const EmptyState = ({ title, children, action }) => (
	<section className={style.empty}>
		<h1 className={style.title}>{title}</h1>
		{children && <p className={style.text}>{children}</p>}
		{action}
	</section>
)

export default EmptyState
