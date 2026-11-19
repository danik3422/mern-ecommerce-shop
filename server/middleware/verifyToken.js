const jwt = require('jsonwebtoken')

const verifyToken = (req, res, next) => {
	const header = req.headers.authorization || req.headers.token
	if (!header) return res.status(401).json({ message: 'You are not authenticated' })

	const token = header.startsWith('Bearer ') ? header.slice(7) : header
	jwt.verify(token, process.env.JWT_SEC, (err, user) => {
		if (err) return res.status(403).json({ message: 'Token is not valid' })
		req.user = user
		next()
	})
}

// The user may only touch their own resources (identified by :id or :userId), admins anything.
const verifyTokenAndAuth = (req, res, next) => {
	verifyToken(req, res, () => {
		const ownerId = req.params.userId || req.params.id
		if (req.user.id === ownerId || req.user.isAdmin) return next()
		res.status(403).json({ message: 'You are not allowed to do that' })
	})
}

const verifyTokenAndAdmin = (req, res, next) => {
	verifyToken(req, res, () => {
		if (req.user.isAdmin) return next()
		res.status(403).json({ message: 'You are not allowed to do that' })
	})
}

module.exports = { verifyToken, verifyTokenAndAuth, verifyTokenAndAdmin }
