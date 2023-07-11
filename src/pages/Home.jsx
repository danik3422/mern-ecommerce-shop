import React from 'react'
import Categories from '../components/Categories/Categories'
import Footer from '../components/Footer/Footer'
import Navbar from '../components/Navbar/Navbar'
import NewsLetter from '../components/NewsLetter/Newsletter'
import Products from '../components/Products/Products'
import Slider from '../components/Slider/Slider'
import '../styles/main.scss'
const Home = () => {
	return (
		<>
			<Navbar />
			<Slider />
			<Categories />
			<Products />
			<NewsLetter />
			<Footer />
		</>
	)
}

export default Home
