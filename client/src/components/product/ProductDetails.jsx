import { Check, Truck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { MAX_QUANTITY } from '../../cart/cartLines'
import { FREE_SHIPPING_FROM } from '../../cart/pricing'
import { useCart } from '../../cart/useCart'
import { formatMoney } from '../../utils/money'
import { capitalize } from '../../utils/text'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import QuantityStepper from '../ui/QuantityStepper'
import OptionPicker from './OptionPicker'
import style from './ProductDetails.module.css'

const ProductDetails = ({ product }) => {
	const { addItem } = useCart()
	const [color, setColor] = useState(product.color[0])
	const [size, setSize] = useState(product.size[0])
	const [quantity, setQuantity] = useState(1)
	const [isAdded, setIsAdded] = useState(false)

	const category = product.categories[0]

	const handleAdd = () => {
		addItem({ productId: product._id, color, size, quantity })
		setIsAdded(true)
	}

	return (
		<article className={style.product}>
			<div className={style.media}>
				<img className={style.image} src={product.img} alt={product.title} />
			</div>

			<div className={style.info}>
				{category && (
					<Link to={`/products/${category}`} className='eyebrow'>
						{capitalize(category)}
					</Link>
				)}
				<h1 className={style.title}>{product.title}</h1>
				<p className={style.price}>{formatMoney(product.price)}</p>
				<p className={style.description}>{product.description}</p>

				{product.color.length > 0 && (
					<OptionPicker
						legend='Color'
						name='color'
						variant='swatch'
						options={product.color}
						value={color}
						onChange={setColor}
					/>
				)}
				{product.size.length > 0 && (
					<OptionPicker
						legend='Size'
						name='size'
						options={product.size}
						value={size}
						onChange={setSize}
					/>
				)}

				{product.inStock ? (
					<div className={style.purchase}>
						<QuantityStepper value={quantity} onChange={setQuantity} max={MAX_QUANTITY} />
						<Button fullWidth onClick={handleAdd}>
							Add to bag
						</Button>
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
	)
}

export default ProductDetails
