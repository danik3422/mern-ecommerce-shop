import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 12

export const hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_ROUNDS)

export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash)
