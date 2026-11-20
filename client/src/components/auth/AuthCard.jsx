import style from './AuthCard.module.css'

/** Centered card used by the sign-in and registration pages. */
const AuthCard = ({ title, subtitle, children, footer }) => (
	<div className={style.page}>
		<section className={style.card} aria-labelledby='auth-title'>
			<div className={style.header}>
				<h1 id='auth-title' className={style.title}>
					{title}
				</h1>
				{subtitle && <p className={style.subtitle}>{subtitle}</p>}
			</div>
			{children}
			{footer && <p className={style.footer}>{footer}</p>}
		</section>
	</div>
)

export default AuthCard
