import { useParams, useSearchParams } from 'react-router'
import styled from 'styled-components'
import Footer from '../components/Footer/Footer'
import Navbar from '../components/Navbar/Navbar'
import ProductGrid from '../components/ProductGrid/ProductGrid'

const Container = styled.div`
	min-height: calc(100vh - 304px);
`
const Title = styled.h1`
	margin: 20px;
	text-transform: capitalize;
`
const FilterContainer = styled.div`
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
`
const Filter = styled.div`
	margin: 20px;
`
const FilterText = styled.span`
	font-size: 20px;
	font-weight: 600;
	margin-right: 20px;
`
const Select = styled.select`
	padding: 20px;
	margin-right: 20px;
`

const COLORS = ['white', 'black', 'red', 'blue', 'yellow', 'green']
const SIZES = ['XS', 'S', 'M', 'L', 'XL']
const SORTS = [
	['newest', 'Newest'],
	['price_asc', 'Price (low to high)'],
	['price_desc', 'Price (high to low)'],
]
const PAGE_SIZE = 12

/** Filters, sorting and page live in the URL, so the list can be shared and survives reloads. */
const ProductList = () => {
	const { category } = useParams()
	const [searchParams, setSearchParams] = useSearchParams()

	const color = searchParams.get('color') ?? ''
	const size = searchParams.get('size') ?? ''
	const sort = searchParams.get('sort') ?? 'newest'
	const page = Number(searchParams.get('page')) || 1

	const updateParams = (changes) => {
		const next = new URLSearchParams(searchParams)
		for (const [name, value] of Object.entries(changes)) {
			if (value) next.set(name, value)
			else next.delete(name)
		}
		setSearchParams(next)
	}

	// any filter change starts from the first page
	const handleFilterChange = (e) => updateParams({ [e.target.name]: e.target.value, page: null })

	const query = { category, color, size, sort, page, limit: PAGE_SIZE }

	return (
		<>
			<Navbar />
			<Container>
				<Title>{category || 'All products'}</Title>
				<FilterContainer>
					<Filter>
						<FilterText>Filter Products:</FilterText>
						<Select name='color' value={color} onChange={handleFilterChange} aria-label='Color'>
							<option value=''>Any color</option>
							{COLORS.map((c) => (
								<option key={c} value={c}>
									{c[0].toUpperCase() + c.slice(1)}
								</option>
							))}
						</Select>
						<Select name='size' value={size} onChange={handleFilterChange} aria-label='Size'>
							<option value=''>Any size</option>
							{SIZES.map((s) => (
								<option key={s}>{s}</option>
							))}
						</Select>
					</Filter>
					<Filter>
						<FilterText>Sort:</FilterText>
						<Select name='sort' value={sort} onChange={handleFilterChange} aria-label='Sort'>
							{SORTS.map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</Select>
					</Filter>
				</FilterContainer>
				<ProductGrid query={query} onPageChange={(next) => updateParams({ page: next })} />
			</Container>
			<Footer />
		</>
	)
}

export default ProductList
