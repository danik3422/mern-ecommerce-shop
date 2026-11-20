import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import BrandStrip from '../components/home/BrandStrip'
import CategoryTiles from '../components/home/CategoryTiles'
import Hero from '../components/home/Hero'
import PromoBanner from '../components/home/PromoBanner'
import Section from '../components/home/Section'
import ProductGrid from '../components/product/ProductGrid'
import { SALE_CATEGORY } from '../data/catalog'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useProducts } from '../hooks/useProducts'

const ON_SALE = { onSale: 'true', sort: 'discount', limit: 4 }
const NEW_ARRIVALS = { sort: 'newest', limit: 8 }
const TOP_RATED = { sort: 'rating', limit: 4 }

const ViewAllLink = ({ to, label = 'View all' }) => (
	<Link to={to} className='text-link'>
		{label} <ArrowRight size={14} aria-hidden style={{ display: 'inline' }} />
	</Link>
)

const Home = () => {
	useDocumentTitle()
	const onSale = useProducts(ON_SALE)
	const newArrivals = useProducts(NEW_ARRIVALS)
	const topRated = useProducts(TOP_RATED)

	return (
		<>
			<Hero />
			<PromoBanner />
			<Section title='Shop by category'>
				<CategoryTiles />
			</Section>
			<Section
				title='On sale now'
				action={<ViewAllLink to={`/products/${SALE_CATEGORY}`} label='All deals' />}
			>
				<ProductGrid query={onSale} skeletonCount={ON_SALE.limit} />
			</Section>
			<Section title='New arrivals' action={<ViewAllLink to='/products' />}>
				<ProductGrid query={newArrivals} skeletonCount={NEW_ARRIVALS.limit} />
			</Section>
			<Section title='Shop by brand'>
				<BrandStrip />
			</Section>
			<Section title='Top rated' action={<ViewAllLink to='/products?sort=rating' />}>
				<ProductGrid query={topRated} skeletonCount={TOP_RATED.limit} />
			</Section>
		</>
	)
}

export default Home
