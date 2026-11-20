import { Check, Truck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { MAX_QUANTITY } from '../../cart/cartLines'
import { FREE_SHIPPING_FROM } from '../../cart/pricing'
import { useCart } from '../../cart/useCart'
import { formatMoney } from '../../utils/money'
import { capitalize } from '../../utils/text'
import WishlistButton from '../account/WishlistButton'
import ProductReviews from '../reviews/ProductReviews'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import QuantityStepper from '../ui/QuantityStepper'
import OptionPicker from './OptionPicker'
import Price from './Price'
import style from './ProductDetails.module.css'
import SizePicker from './SizePicker'

const firstAvailableSize = (sizes) => (sizes.find((s) => s.stock > 0) ?? sizes[0]).label

const ProductDetails = ({ product }) => {
	const { addItem } = useCart()
	const [color, setColor] = useState(product.colors[0])
	const [size, setSize] = useState(() => firstAvailableSize(product.sizes))
	const [quantity, setQuantity] = useState(1)
	const [isAdded, setIsAdded] = useState(false)

	const category = product.categories[0]
	const sizeStock = product.sizes.find((s) => s.label === size)?.stock ?? 0
	const isOneSize = product.sizes.length === 1

	const handleAdd = () => {
		addItem({ productId: product._id, color, size, quantity })
		setIsAdded(true)
	}

	return (
		<>
			<article className={style.product}>
				<div className={style.media}>
					<img className={style.image} src={product.images[0]} alt={product.title} />
				</div>

				<div className={style.info}>
					{category && (
						<Link to={`/products/${category}`} className='eyebrow'>
							{capitalize(category)}
						</Link>
					)}
					<div>
						<p className={style.brand}>{product.brand}</p>
						<h1 className={style.title}>{product.title}</h1>
					</div>
					<Price product={product} size='lg' />
					<p className={style.description}>{product.description}</p>

					{product.colors.length > 0 && (
						<OptionPicker
							legend='Color'
							name='color'
							variant='swatch'
							options={product.colors}
							value={color}
							onChange={setColor}
						/>
					)}
					{!isOneSize && <SizePicker sizes={product.sizes} value={size} onChange={setSize} />}

					{product.inStock ? (
						<div className={style.purchase}>
							<QuantityStepper
								value={quantity}
								onChange={setQuantity}
								max={Math.min(MAX_QUANTITY, sizeStock || 1)}
							/>
							<Button fullWidth onClick={handleAdd} disabled={sizeStock === 0}>
								Add to bag
							</Button>
							<WishlistButton productId={product._id} variant='button' />
						</div>
					) : (
						<Alert>This product is sold out.</Alert>
					)}

					{isAdded && (
						<Alert tone='success' className={style.added}>
							<Check size={16} aria-hidden /> Added to your bag.{' '}
							<Link to='/cart' className='text-link'>
								View bag
							</Link>
						</Alert>
					)}

					<p className={style.note}>
						<Truck size={16} aria-hidden /> Free shipping on orders over{' '}
						{formatMoney(FREE_SHIPPING_FROM)}
					</p>
				</div>
			</article>
			<ProductReviews product={product} />
		</>
	)
}

export default ProductDetails
