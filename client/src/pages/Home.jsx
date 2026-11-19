import Categories from '../components/Categories/Categories'
import Footer from '../components/Footer/Footer'
import Navbar from '../components/Navbar/Navbar'
import NewsLetter from '../components/NewsLetter/Newsletter'
import ProductGrid from '../components/ProductGrid/ProductGrid'
import Slider from '../components/Slider/Slider'

const NEWEST_PRODUCTS = { sort: 'newest', limit: 8 }

const Home = () => (
	<>
		<Navbar />
		<Slider />
		<Categories />
		<ProductGrid query={NEWEST_PRODUCTS} />
		<NewsLetter />
		<Footer />
	</>
)

export default Home
