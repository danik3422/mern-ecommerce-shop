require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')

const authRoute = require('./routes/auth')
const userRoute = require('./routes/user')
const productRoute = require('./routes/product')
const cartRoute = require('./routes/cart')
const orderRoute = require('./routes/order')

const { MONGO_URL, JWT_SEC, PORT = 8000, CLIENT_URL } = process.env

if (!MONGO_URL || !JWT_SEC) {
	console.error('MONGO_URL and JWT_SEC must be set (see server/.env.example)')
	process.exit(1)
}

const app = express()

app.use(
	cors({
		origin: CLIENT_URL ? CLIENT_URL.split(',') : 'http://localhost:3000',
	})
)
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', authRoute)
app.use('/api/users', userRoute)
app.use('/api/products', productRoute)
app.use('/api/carts', cartRoute)
app.use('/api/orders', orderRoute)

app.use((req, res) => res.status(404).json({ message: 'Not found' }))

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
	const status = err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 500
	if (status === 500) console.error(err)
	res.status(status).json({ message: status === 400 ? err.message : 'Server error' })
})

mongoose
	.connect(MONGO_URL)
	.then(() => {
		console.log('DB connected successfully!')
		app.listen(PORT, () => console.log(`API is running on port ${PORT}`))
	})
	.catch((err) => {
		console.error('DB connection failed:', err.message)
		process.exit(1)
	})
