import { Outlet } from 'react-router'
import Footer from './Footer'
import Header from './Header'
import style from './Layout.module.css'
import ScrollToTop from './ScrollToTop'

/** Shared page frame: header, page content and footer. */
const Layout = () => (
	<div className={style.layout}>
		<a href='#main' className={style.skipLink}>
			Skip to content
		</a>
		<ScrollToTop />
		<Header />
		<main id='main' className={style.main} tabIndex={-1}>
			<Outlet />
		</main>
		<Footer />
	</div>
)

export default Layout
