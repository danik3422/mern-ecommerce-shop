import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import style from './PageHeader.module.css'

/** Page title row with optional description and actions on the right. */
const PageHeader = ({ title, description, actions, back }) => {
	useDocumentTitle(`${title} · Admin`)

	return (
		<div className={style.header}>
			<div>
				{back}
				<h1 className={style.title}>{title}</h1>
				{description && <p className={style.description}>{description}</p>}
			</div>
			{actions && <div className={style.actions}>{actions}</div>}
		</div>
	)
}

export default PageHeader
