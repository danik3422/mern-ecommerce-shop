/** Leaves the app for the payment page (a separate module so tests can mock it). */
export const redirectToPayment = (url) => window.location.assign(url)
