import { Outlet } from 'react-router'
import { useI18n } from '../../i18n/useI18n'
import Footer from './Footer'
import Header from './Header'
import style from './Layout.module.css'
import ScrollToTop from './ScrollToTop'

/** Shared page frame: header, page content and footer. */
const Layout = () => {
	const { t } = useI18n()
	return (
		<div className={style.layout}>
			<a href='#main' className={style.skipLink}>
				{t('layout.skip')}
			</a>
			<ScrollToTop />
			<Header />
			<main id='main' className={style.main} tabIndex={-1}>
				<Outlet />
			</main>
			<Footer />
		</div>
	)
}

export default Layout
