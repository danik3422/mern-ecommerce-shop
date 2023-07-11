const express = require('express')

const app = express()
require('dotenv').config()
const mongoose = require('mongoose')

//Connected to MongoDB
mongoose
	.connect(process.env.MONGO_URL)
	.then(() => console.log('DB connected successfully!'))
	.catch((err) => console.log(err))

//Created server with express
app.listen(8000, () => {
	console.log('API is running...')
})
