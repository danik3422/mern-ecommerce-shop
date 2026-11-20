import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import CategoryTiles from '../components/home/CategoryTiles'
import Hero from '../components/home/Hero'
import Section from '../components/home/Section'
import ProductGrid from '../components/product/ProductGrid'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useProducts } from '../hooks/useProducts'

const NEW_ARRIVALS = { sort: 'newest', limit: 8 }

const ViewAllLink = () => (
	<Link to='/products' className='text-link'>
		View all <ArrowRight size={14} aria-hidden style={{ display: 'inline' }} />
	</Link>
)

const Home = () => {
	useDocumentTitle()
	const newArrivals = useProducts(NEW_ARRIVALS)

	return (
		<>
			<Hero />
			<Section title='Shop by category'>
				<CategoryTiles />
			</Section>
			<Section title='New arrivals' action={<ViewAllLink />}>
				<ProductGrid query={newArrivals} skeletonCount={NEW_ARRIVALS.limit} />
			</Section>
		</>
	)
}

export default Home
