import mongoose from 'mongoose'

export const connectDb = (url) => mongoose.connect(url)

export const disconnectDb = () => mongoose.disconnect()

export const isDbConnected = () => mongoose.connection.readyState === mongoose.STATES.connected
