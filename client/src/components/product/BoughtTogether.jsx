import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useCart } from '../../cart/useCart'
import { colorName } from '../../i18n/catalogText'
import { useI18n } from '../../i18n/useI18n'
import { cx } from '../../utils/cx'
import { isVariantInStock } from '../../utils/variants'
import Button from '../ui/Button'
import { useToast } from '../ui/toast/useToast'
import style from './BoughtTogether.module.css'
import pickerStyle from './OptionPicker.module.css'
import Price from './Price'
import ProductCard from './ProductCard'
import { useBoughtTogether } from './useBoughtTogether'

/** Sizes of the top pick as small radio pills (a name of their own, apart from the main picker). */
const PickSizes = ({ pick, sizes, value, onChange }) => {
	const { t } = useI18n()
	return (
		<fieldset className={style.pickSizes}>
			<legend className='visually-hidden'>{t('together.sizeOf', { title: pick.title })}</legend>
			{sizes.map((size) => {
				const soldOut = size.stock === 0
				return (
					<label
						key={size.label}
						className={cx(pickerStyle.option, soldOut && pickerStyle.disabled)}
					>
						<input
							type='radio'
							name={`together-size-${pick._id}`}
							value={size.label}
							checked={size.label === value}
							onChange={() => onChange(size.label)}
							disabled={soldOut}
							aria-label={soldOut ? t('card.sizeSoldOut', { size: size.label }) : size.label}
							className='visually-hidden'
						/>
						<span className={cx(pickerStyle.pill, style.smallPill)} aria-hidden>
							{size.label}
						</span>
					</label>
				)
			})}
		</fieldset>
	)
}

/**
 * "Frequently bought together": this product plus the product most often bought with it,
 * added to the bag in one click, and the other frequent companions as cards (with quick add).
 * Shown only when there is real order data; similar products appear in "You may also like".
 * @param variant the color chosen on the page, `size` the chosen size (null: none)
 * @param available how many more of the chosen size can go to the bag
 */
const BoughtTogether = ({ product, variant, size, available, sizeStock }) => {
	const { t, formatMoney } = useI18n()
	const { addItem, quantityInBag } = useCart()
	const toast = useToast()
	const { data } = useBoughtTogether(product._id)
	// the size chosen for the top pick, remembered per pick
	const [pickChoice, setPickChoice] = useState({ id: null, size: null })

	if (data?.source !== 'orders' || !data.items.length) return null

	const [pick, ...others] = data.items
	const pickVariant = pick.variants.find(isVariantInStock) ?? pick.variants[0]
	const pickIsOneSize = pickVariant.sizes.length === 1
	const pickSize = pickIsOneSize
		? pickVariant.sizes[0].label
		: pickChoice.id === pick._id
			? pickChoice.size
			: null
	const pickStock = pickVariant.sizes.find((s) => s.label === pickSize)?.stock ?? 0
	const pickAvailable =
		pickStock - quantityInBag({ productId: pick._id, color: pickVariant.color, size: pickSize })

	const mainIsOneSize = variant.sizes.length === 1
	// what stops "Add both": the first problem is explained under the button
	const problem = !size
		? t('together.chooseMainSize')
		: !pickSize
			? t('together.choosePickSize', { title: pick.title })
			: available <= 0 || pickAvailable <= 0
				? t('together.notAvailable')
				: null

	const addBoth = () => {
		addItem({ productId: product._id, color: variant.color, size, quantity: 1 }, sizeStock)
		addItem(
			{ productId: pick._id, color: pickVariant.color, size: pickSize, quantity: 1 },
			pickStock,
		)
		toast.show({
			message: t('together.bothAdded'),
			tone: 'success',
			action: { label: t('card.viewBag'), to: '/cart' },
		})
	}

	const describe = (item, itemVariant, itemSize, isOneSize) =>
		[
			item.variants.length > 1 && colorName(t, itemVariant.color),
			!isOneSize && itemSize && `${t('together.size')} ${itemSize}`,
		]
			.filter(Boolean)
			.join(' · ')

	return (
		<section className={style.section} aria-labelledby='together-title'>
			<h2 id='together-title' className={style.title}>
				{t('together.title')}
			</h2>

			<div className={cx(style.layout, others.length && style.withOthers)}>
				<div className={style.bundle}>
					<div className={style.images} aria-hidden>
						<img src={variant.images[0]} alt='' className={style.image} />
						<Plus size={18} className={style.plus} />
						<Link to={`/product/${pick.slug}`} tabIndex={-1}>
							<img src={pickVariant.images[0]} alt='' className={style.image} />
						</Link>
					</div>

					<ul role='list' className={style.items}>
						<li className={style.item}>
							<div className={style.itemText}>
								<p className={style.itemTitle}>
									<span className={style.thisItem}>{t('together.thisItem')}:</span> {product.title}
								</p>
								<p className={style.itemMeta}>{describe(product, variant, size, mainIsOneSize)}</p>
							</div>
							<Price product={product} className={style.itemPrice} />
						</li>
						<li className={style.item}>
							<div className={style.itemText}>
								<p className={style.itemTitle}>
									<Link to={`/product/${pick.slug}`} className={style.pickLink}>
										{pick.title}
									</Link>
								</p>
								<p className={style.itemMeta}>
									{[
										pick.brand,
										describe(pick, pickVariant, pickIsOneSize ? null : pickSize, pickIsOneSize),
									]
										.filter(Boolean)
										.join(' · ')}
								</p>
								{!pickIsOneSize && (
									<PickSizes
										pick={pick}
										sizes={pickVariant.sizes}
										value={pickSize}
										onChange={(next) => setPickChoice({ id: pick._id, size: next })}
									/>
								)}
							</div>
							<Price product={pick} className={style.itemPrice} />
						</li>
					</ul>

					<div className={style.footer}>
						<p className={style.total}>
							{t('together.total')}: <strong>{formatMoney(product.price + pick.price)}</strong>
						</p>
						<Button onClick={addBoth} disabled={Boolean(problem)}>
							{t('together.addBoth')}
						</Button>
					</div>
					{problem && <p className={style.hint}>{problem}</p>}
					<p className={style.orders}>{t('together.boughtInOrders', { count: pick.orders })}</p>
				</div>

				{others.length > 0 && (
					<div className={style.others}>
						<h3 className={style.othersTitle}>{t('together.alsoBought')}</h3>
						<ul role='list' className={style.othersGrid}>
							{others.map((item) => (
								<li key={item._id}>
									<ProductCard product={item} />
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</section>
	)
}

export default BoughtTogether
