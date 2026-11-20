import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import BrandStrip from '../components/home/BrandStrip'
import CategoryTiles from '../components/home/CategoryTiles'
import Hero from '../components/home/Hero'
import PromoBanner from '../components/home/PromoBanner'
import Section from '../components/home/Section'
import RecentlyViewed from '../components/product/RecentlyViewed'
import ProductGrid from '../components/product/ProductGrid'
import { SALE_CATEGORY } from '../data/catalog'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useProducts } from '../hooks/useProducts'
import { useI18n } from '../i18n/useI18n'

const ON_SALE = { onSale: 'true', sort: 'discount', limit: 4 }
const NEW_ARRIVALS = { sort: 'newest', limit: 8 }
const TOP_RATED = { sort: 'rating', limit: 4 }

const ViewAllLink = ({ to, label }) => {
	const { t } = useI18n()
	return (
		<Link to={to} className='text-link'>
			{label ?? t('home.viewAll')}{' '}
			<ArrowRight size={14} aria-hidden style={{ display: 'inline' }} />
		</Link>
	)
}

const Home = () => {
	useDocumentTitle()
	const { t } = useI18n()
	const onSale = useProducts(ON_SALE)
	const newArrivals = useProducts(NEW_ARRIVALS)
	const topRated = useProducts(TOP_RATED)

	return (
		<>
			<Hero />
			<PromoBanner />
			<div className='container'>
				<RecentlyViewed />
			</div>
			<Section title={t('home.byCategory')}>
				<CategoryTiles />
			</Section>
			<Section
				title={t('home.onSale')}
				action={<ViewAllLink to={`/products/${SALE_CATEGORY}`} label={t('home.allDeals')} />}
			>
				<ProductGrid query={onSale} skeletonCount={ON_SALE.limit} />
			</Section>
			<Section title={t('home.newArrivals')} action={<ViewAllLink to='/products' />}>
				<ProductGrid query={newArrivals} skeletonCount={NEW_ARRIVALS.limit} />
			</Section>
			<Section title={t('home.byBrand')}>
				<BrandStrip />
			</Section>
			<Section title={t('home.topRated')} action={<ViewAllLink to='/products?sort=rating' />}>
				<ProductGrid query={topRated} skeletonCount={TOP_RATED.limit} />
			</Section>
		</>
	)
}

export default Home
