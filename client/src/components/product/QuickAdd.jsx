import { ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useCart } from '../../cart/useCart'
import { cx } from '../../utils/cx'
import { useToast } from '../ui/toast/useToast'
import style from './QuickAdd.module.css'

/**
 * Size picker over a product card image: hover (or the bag button on touch screens)
 * reveals the sizes, one click adds the product to the bag.
 * Products with several colors link to the product page instead of guessing a color.
 */
const QuickAdd = ({ product }) => {
	const { addItem } = useCart()
	const toast = useToast()
	const [isOpen, setIsOpen] = useState(false)

	if (!product.inStock) return null

	const needsColorChoice = product.colors.length > 1
	const isOneSize = product.sizes.length === 1

	const add = (size) => {
		addItem({ productId: product._id, size, color: product.colors[0], quantity: 1 })
		setIsOpen(false)
		toast.show({
			message: `${product.title}${isOneSize ? '' : `, ${size}`} added to your bag`,
			tone: 'success',
			action: { label: 'View bag', to: '/cart' },
		})
	}

	return (
		<div className={cx(style.overlay, isOpen && style.open)}>
			<button
				type='button'
				className={style.toggle}
				onClick={() => setIsOpen((open) => !open)}
				aria-expanded={isOpen}
				aria-label={`Quick add ${product.title}`}
			>
				<ShoppingBag size={16} aria-hidden />
			</button>

			<div className={style.panel}>
				{needsColorChoice ? (
					<Link to={`/product/${product.slug}`} className={style.link}>
						Choose color &amp; size
					</Link>
				) : isOneSize ? (
					<button
						type='button'
						className={style.addButton}
						onClick={() => add(product.sizes[0].label)}
					>
						Add to bag
					</button>
				) : (
					<>
						<p className={style.label}>Quick add</p>
						<div className={style.sizes} role='group' aria-label={`Sizes of ${product.title}`}>
							{product.sizes.map((size) => (
								<button
									key={size.label}
									type='button'
									className={style.size}
									onClick={() => add(size.label)}
									disabled={size.stock === 0}
									aria-label={
										size.stock === 0
											? `${size.label}, sold out`
											: `Add ${product.title} in size ${size.label}`
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
