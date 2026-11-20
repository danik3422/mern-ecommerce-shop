/** Shipping address fields, in the order they are shown in forms. */
export const ADDRESS_FIELDS = [
	{ name: 'fullName', label: 'Full name', autoComplete: 'name' },
	{ name: 'street', label: 'Street and house number', autoComplete: 'street-address' },
	{ name: 'postalCode', label: 'Postal code', autoComplete: 'postal-code' },
	{ name: 'city', label: 'City', autoComplete: 'address-level2' },
	{ name: 'country', label: 'Country', autoComplete: 'country-name' },
]

export const EMPTY_ADDRESS = Object.fromEntries(ADDRESS_FIELDS.map(({ name }) => [name, '']))

/** Value of the "Use a new address" choice in the saved address picker. */
export const NEW_ADDRESS = 'new'

/** Only the fields an order accepts (saved addresses also carry _id and isDefault). */
export const toOrderAddress = (address) =>
	Object.fromEntries(ADDRESS_FIELDS.map(({ name }) => [name, address[name]]))

/** The default saved address, the first one, or a new address when there are none. */
export const defaultAddressId = (addresses) =>
	(addresses.find((address) => address.isDefault) ?? addresses[0])?._id ?? NEW_ADDRESS
