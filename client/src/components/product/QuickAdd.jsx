import { ShoppingBag, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useCart } from '../../cart/useCart'
import { cx } from '../../utils/cx'
import { useToast } from '../ui/toast/useToast'
import style from './QuickAdd.module.css'
import { useI18n } from '../../i18n/useI18n'

/**
 * Size picker over a product card image: hover (or the bag button on touch screens)
 * reveals the sizes, one click adds the product to the bag.
 * Products with several colors link to the product page instead of guessing a color.
 */
const QuickAdd = ({ product }) => {
	const { t } = useI18n()
	const { addItem, quantityInBag } = useCart()
	const toast = useToast()
	const [isOpen, setIsOpen] = useState(false)

	if (!product.inStock) return null

	const needsColorChoice = product.variants.length > 1
	const [{ sizes }] = product.variants
	const isOneSize = sizes.length === 1

	const color = product.colors[0]
	// sizes whose whole stock is already in the bag cannot be added again
	const available = (size) =>
		size.stock - quantityInBag({ productId: product._id, color, size: size.label })

	const add = (size) => {
		addItem({ productId: product._id, size: size.label, color, quantity: 1 }, size.stock)
		setIsOpen(false)
		toast.show({
			message: isOneSize
				? t('card.added', { title: product.title })
				: t('card.addedInSize', { title: product.title, size: size.label }),
			tone: 'success',
			action: { label: t('card.viewBag'), to: '/cart' },
		})
	}

	return (
		<div className={cx(style.overlay, isOpen && style.open)}>
			<button
				type='button'
				className={style.toggle}
				onClick={() => setIsOpen((open) => !open)}
				aria-expanded={isOpen}
				aria-label={t('card.quickAddProduct', { title: product.title })}
			>
				<ShoppingBag size={16} aria-hidden />
			</button>

			<div className={style.panel}>
				{isOpen && (
					<button
						type='button'
						className={style.close}
						onClick={() => setIsOpen(false)}
						aria-label={t('card.closeQuickAdd')}
					>
						<X size={14} aria-hidden />
					</button>
				)}
				{needsColorChoice ? (
					<Link to={`/product/${product.slug}`} className={style.link}>
						{t('card.chooseOptions')}
					</Link>
				) : isOneSize ? (
					<button
						type='button'
						className={style.addButton}
						onClick={() => add(sizes[0])}
						disabled={available(sizes[0]) <= 0}
					>
						{available(sizes[0]) > 0 ? t('card.addToBag') : t('card.allInBag')}
					</button>
				) : (
					<>
						<p className={style.label}>{t('card.quickAdd')}</p>
						<div
							className={style.sizes}
							role='group'
							aria-label={t('card.sizesOf', { title: product.title })}
						>
							{sizes.map((size) => (
								<button
									key={size.label}
									type='button'
									className={style.size}
									onClick={() => add(size)}
									disabled={available(size) <= 0}
									aria-label={
										size.stock === 0
											? t('card.sizeSoldOut', { size: size.label })
											: available(size) <= 0
												? t('card.sizeAllInBag', { size: size.label })
												: t('card.addInSize', { title: product.title, size: size.label })
									}
								>
									{size.label}
								</button>
							))}
						</div>
					</>
				)}
			</div>
		</div>
	)
}

export default QuickAdd
