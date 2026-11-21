/**
 * Checks of Polish company identifiers printed on invoices (pure functions).
 */

const NIP_WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7]

/** "PL 526-025-02-74" → "5260250274": drops spaces, dashes and the optional "PL" prefix. */
export const normalizeNip = (value) => String(value).replace(/[\s-]/g, '').replace(/^PL/i, '')

/**
 * True for a valid Polish tax id (NIP): 10 digits where the last one is the checksum —
 * the weighted sum of the first nine digits modulo 11 (a result of 10 is never issued).
 */
export const isValidNip = (value) => {
	const nip = normalizeNip(value)
	if (!/^\d{10}$/.test(nip)) return false
	const digits = [...nip].map(Number)
	const checksum = NIP_WEIGHTS.reduce((sum, weight, i) => sum + weight * digits[i], 0) % 11
	return checksum !== 10 && checksum === digits[9]
}

/** "PL61 1090 1014 0000 0712 1981 2874" → "61109010140000071219812874" */
export const normalizeBankAccount = (value) => String(value).replace(/\s/g, '').replace(/^PL/i, '')

/**
 * True for a Polish bank account number (NRB, 26 digits) with a valid IBAN checksum:
 * "PL" + the number, with the first four characters moved to the end, is 1 modulo 97.
 */
export const isValidBankAccount = (value) => {
	const account = normalizeBankAccount(value)
	if (!/^\d{26}$/.test(account)) return false
	// P = 25, L = 21 in the IBAN letter encoding
	const rearranged = `${account.slice(2)}2521${account.slice(0, 2)}`
	return BigInt(rearranged) % 97n === 1n
}

/** "61109010140000071219812874" → "61 1090 1014 0000 0712 1981 2874" */
export const formatBankAccount = (value) => {
	const account = normalizeBankAccount(value)
	return account
		? `${account.slice(0, 2)} ${account.slice(2).replace(/(\d{4})(?=\d)/g, '$1 ')}`
		: ''
}
