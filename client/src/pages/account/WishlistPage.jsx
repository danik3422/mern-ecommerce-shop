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
import { useI18n } from '../../i18n/useI18n'

const WishlistPage = () => {
	const { t } = useI18n()
	useDocumentTitle(t('wishlist.title'))
	const { user } = useAuth()
	const wishlist = useQuery({
		queryKey: [...accountKeys.wishlist, user._id],
		queryFn: fetchWishlist,
	})

	return (
		<section className={shared.section} aria-labelledby='wishlist-title'>
			<div className={shared.heading}>
				<h1 id='wishlist-title' className={shared.title}>
					{t('wishlist.title')}
				</h1>
				{wishlist.data?.length > 0 && (
					<p className={shared.muted}>{t('bag.count', { count: wishlist.data.length })}</p>
				)}
			</div>

			{wishlist.isPending && <p className={shared.muted}>{t('wishlist.loading')}</p>}
			{wishlist.isError && (
				<Alert tone='error'>
					{t('wishlist.loadError', { error: getErrorMessage(wishlist.error) })}
				</Alert>
			)}
			{wishlist.data?.length === 0 && (
				<div className={shared.card}>
					<p>{t('wishlist.empty')}</p>
					<Button
						as={Link}
						to='/products'
						variant='secondary'
						size='sm'
						className={shared.cardAction}
					>
						{t('wishlist.browse')}
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
