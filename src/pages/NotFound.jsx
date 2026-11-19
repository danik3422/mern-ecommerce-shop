import { Link } from 'react-router-dom'
import Footer from '../components/Footer/Footer'
import Navbar from '../components/Navbar/Navbar'

const NotFound = () => (
	<>
		<Navbar />
		<div className='status-page'>
			<h1>Page not found</h1>
			<Link to='/' className='status-page__link'>
				Back to home
			</Link>
		</div>
		<Footer />
	</>
)

export default NotFound
