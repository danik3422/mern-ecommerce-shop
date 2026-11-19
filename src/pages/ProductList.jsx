import { useState } from 'react'
import { useParams } from 'react-router-dom'
import styled from 'styled-components'
import Footer from '../components/Footer/Footer'
import Navbar from '../components/Navbar/Navbar'
import Products from '../components/Products/Products'

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

const COLORS = ['White', 'Black', 'Red', 'Blue', 'Yellow', 'Green']
const SIZES = ['XS', 'S', 'M', 'L', 'XL']

const ProductList = () => {
	const { category } = useParams()
	const [filters, setFilters] = useState({ color: '', size: '' })
	const [sort, setSort] = useState('newest')

	const handleFilter = (e) => setFilters({ ...filters, [e.target.name]: e.target.value })

	return (
		<>
			<Navbar />
			<Container>
				<Title>{category || 'All products'}</Title>
				<FilterContainer>
					<Filter>
						<FilterText>Filter Products:</FilterText>
						<Select name='color' value={filters.color} onChange={handleFilter}>
							<option value=''>Any color</option>
							{COLORS.map((c) => (
								<option key={c}>{c}</option>
							))}
						</Select>
						<Select name='size' value={filters.size} onChange={handleFilter}>
							<option value=''>Any size</option>
							{SIZES.map((s) => (
								<option key={s}>{s}</option>
							))}
						</Select>
					</Filter>
					<Filter>
						<FilterText>Sort:</FilterText>
						<Select value={sort} onChange={(e) => setSort(e.target.value)}>
							<option value='newest'>Newest</option>
							<option value='asc'>Price (asc)</option>
							<option value='desc'>Price (desc)</option>
						</Select>
					</Filter>
				</FilterContainer>
				<Products category={category} filters={filters} sort={sort} />
			</Container>
			<Footer />
		</>
	)
}

export default ProductList
