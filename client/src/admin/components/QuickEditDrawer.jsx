import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useState } from 'react'
import { updateProduct } from '../../api/admin'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Drawer from '../../components/ui/Drawer'
import TextField from '../../components/ui/TextField'
import field from '../../components/ui/Field.module.css'
import { useToast } from '../../components/ui/toast/useToast'
import { formatMoney } from '../../utils/money'
import { capitalize } from '../../utils/text'
import { cx } from '../../utils/cx'
import { discountPercent, priceErrors } from '../pricing'
import { useRefreshProducts } from '../useProductActions'
import style from './QuickEditDrawer.module.css'

const toForm = (product) => ({
	price: String(product.price),
	compareAtPrice: product.compareAtPrice > product.price ? String(product.compareAtPrice) : '',
	stock: product.variants.map((variant) => variant.sizes.map((size) => String(size.stock))),
})

const toNumber = (value) => (value === '' ? 0 : Number(value))

/**
 * Price, compare-at price and stock per color and size, edited without leaving the list.
 * Render it only while open.
 */
const QuickEditDrawer = ({ product, onClose }) => {
	const [form, setForm] = useState(() => toForm(product))
	const [localErrors, setLocalErrors] = useState({})
	const refresh = useRefreshProducts()
	const toast = useToast()

	const save = useMutation({
		mutationFn: (body) => updateProduct(product._id, body),
		onSuccess: async (saved) => {
			await refresh()
			toast.show({ tone: 'success', message: `Saved "${saved.title}"` })
			onClose()
		},
	})

	const errors = { ...getFieldErrors(save.error), ...localErrors }
	const discount = discountPercent(form.price, form.compareAtPrice)

	const setPrice = (name) => (e) => {
		setForm((current) => ({ ...current, [name]: e.target.value }))
		setLocalErrors({})
	}

	const setStock = (variantIndex, sizeIndex, value) =>
		setForm((current) => ({
			...current,
			stock: current.stock.map((sizes, v) =>
				v === variantIndex ? sizes.map((stock, s) => (s === sizeIndex ? value : stock)) : sizes,
			),
		}))

	const handleSubmit = (e) => {
		e.preventDefault()
		const problems = priceErrors(form.price, form.compareAtPrice)
		setLocalErrors(problems)
		if (Object.keys(problems).length) return

		save.mutate({
			price: Number(form.price),
			compareAtPrice: form.compareAtPrice === '' ? null : Number(form.compareAtPrice),
			variants: product.variants.map((variant, v) => ({
				color: variant.color,
				images: variant.images,
				sizes: variant.sizes.map((size, s) => ({
					label: size.label,
					stock: toNumber(form.stock[v][s]),
				})),
			})),
		})
	}

	const formId = `quick-edit-${product._id}`
	const unmatchedError =
		save.isError && !Object.keys(getFieldErrors(save.error)).length && getErrorMessage(save.error)

	return (
		<Drawer
			title='Quick edit'
			onClose={onClose}
			closeLabel='Close quick edit'
			footer={
				<div className={style.footer}>
					<Button as={Link} to={`/admin/products/${product._id}`} variant='ghost' size='sm'>
						Open full editor
					</Button>
					<div className={style.buttons}>
						<Button variant='secondary' onClick={onClose}>
							Cancel
						</Button>
						<Button type='submit' form={formId} disabled={save.isPending}>
							{save.isPending ? 'Saving…' : 'Save'}
						</Button>
					</div>
				</div>
			}
		>
			<form id={formId} className={style.form} onSubmit={handleSubmit} noValidate>
				<div className={style.product}>
					<img className={style.thumb} src={product.images[0]} alt='' />
					<div>
						<p className={style.title}>{product.title}</p>
						<p className={style.muted}>{product.brand}</p>
					</div>
				</div>

				{unmatchedError && <Alert tone='error'>{unmatchedError}</Alert>}

				<fieldset className={style.fieldset}>
					<legend className={style.legend}>Price</legend>
					<div className={style.prices}>
						<TextField
							label='Price (PLN)'
							type='number'
							min='0'
							step='0.01'
							inputMode='decimal'
							value={form.price}
							onChange={setPrice('price')}
							error={errors.price}
						/>
						<TextField
							label='Compare-at (PLN)'
							type='number'
							min='0'
							step='0.01'
							inputMode='decimal'
							value={form.compareAtPrice}
							onChange={setPrice('compareAtPrice')}
							error={errors.compareAtPrice}
						/>
					</div>
					<p className={style.muted}>
						{discount
							? `On sale: −${discount}%, was ${formatMoney(Number(form.compareAtPrice))}`
							: 'Leave compare-at empty for no sale.'}
					</p>
				</fieldset>

				{product.variants.map((variant, v) => (
					<fieldset key={variant.color} className={style.fieldset}>
						<legend className={style.legend}>
							Stock · {capitalize(variant.color)}{' '}
							<span className={style.muted}>
								({form.stock[v].reduce((sum, value) => sum + toNumber(value), 0)} pcs)
							</span>
						</legend>
						<div className={style.sizes}>
							{variant.sizes.map((size, s) => {
								const error = errors[`variants.${v}.sizes.${s}.stock`]
								return (
									<label key={size.label} className={style.size}>
										<span className={style.sizeLabel}>{size.label}</span>
										<input
											className={cx(field.control, error && field.invalid)}
											type='number'
											min='0'
											step='1'
											inputMode='numeric'
											value={form.stock[v][s]}
											onChange={(e) => setStock(v, s, e.target.value)}
											aria-label={`Stock of ${variant.color} ${size.label}`}
											aria-invalid={Boolean(error)}
										/>
										{error && <span className={field.error}>{error}</span>}
									</label>
								)
							})}
						</div>
					</fieldset>
				))}
			</form>
		</Drawer>
	)
}

export default QuickEditDrawer
