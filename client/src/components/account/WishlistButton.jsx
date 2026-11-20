import { Heart } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { cx } from '../../utils/cx'
import Button from '../ui/Button'
import { useWishlist } from './useWishlist'
import style from './WishlistButton.module.css'

/**
 * Heart toggle that adds/removes a product from the wishlist.
 * Guests are sent to sign in and come back to the current page.
 * @param variant 'icon' (round button over product images) | 'button' (product page)
 */
const WishlistButton = ({ productId, variant = 'icon' }) => {
	const { isSaved, isSignedIn, toggle } = useWishlist(productId)
	const navigate = useNavigate()
	const location = useLocation()

	const handleClick = (e) => {
		// the icon sits on top of a product link
		e.preventDefault()
		e.stopPropagation()
		if (!isSignedIn) {
			navigate('/login', { state: { from: location.pathname + location.search } })
			return
		}
		toggle()
	}

	const label = isSaved ? 'Remove from wishlist' : 'Add to wishlist'
	const icon = <Heart size={18} aria-hidden className={cx(isSaved && style.filled)} />

	if (variant === 'button') {
		return (
			<Button
				variant='secondary'
				onClick={handleClick}
				aria-pressed={isSaved}
				aria-label={label}
				title={label}
				className={cx(style.button, isSaved && style.saved)}
			>
				{icon}
			</Button>
		)
	}

	return (
		<button
			type='button'
			className={cx(style.icon, isSaved && style.saved)}
			onClick={handleClick}
			aria-pressed={isSaved}
			aria-label={label}
			title={label}
		>
			{icon}
		</button>
	)
}

export default WishlistButton
