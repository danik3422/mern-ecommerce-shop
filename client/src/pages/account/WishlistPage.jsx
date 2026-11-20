import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { accountKeys, fetchWishlist } from '../../api/account'
import { getErrorMessage } from '../../api/client'
import { useAuth } from '../../auth/useAuth'
import shared from '../../components/account/Account.module.css'
import ProductCard from '../../components/product/ProductCard'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

const WishlistPage = () => {
	useDocumentTitle('Wishlist')
	const { user } = useAuth()
	const wishlist = useQuery({
		queryKey: [...accountKeys.wishlist, user._id],
		queryFn: fetchWishlist,
	})

	return (
		<section className={shared.section} aria-labelledby='wishlist-title'>
			<div className={shared.heading}>
				<h1 id='wishlist-title' className={shared.title}>
					Wishlist
				</h1>
				{wishlist.data?.length > 0 && (
					<p className={shared.muted}>
						{wishlist.data.length} {wishlist.data.length === 1 ? 'item' : 'items'}
					</p>
				)}
			</div>

			{wishlist.isPending && <p className={shared.muted}>Loading your wishlist…</p>}
			{wishlist.isError && (
				<Alert tone='error'>Could not load your wishlist: {getErrorMessage(wishlist.error)}</Alert>
			)}
			{wishlist.data?.length === 0 && (
				<div className={shared.card}>
					<p>Save items you love with the heart icon and find them here later.</p>
					<Button
						as={Link}
						to='/products'
						variant='secondary'
						size='sm'
						className={shared.cardAction}
					>
						Browse products
					</Button>
				</div>
			)}
			{wishlist.data?.length > 0 && (
				<ul role='list' className={shared.grid}>
					{wishlist.data.map((product) => (
						<li key={product._id}>
							<ProductCard product={product} />
						</li>
					))}
				</ul>
			)}
		</section>
	)
}

export default WishlistPage
