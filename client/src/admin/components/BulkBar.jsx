import { Eye, EyeOff, Percent, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'
import { formatMoney } from '../../utils/money'
import { previewDiscount } from '../pricing'
import { useAdminConfirm } from '../useAdminConfirm'
import Modal from '../../components/ui/Modal'
import table from './Table.module.css'
import style from './BulkBar.module.css'

const PREVIEW_ROWS = 4

/** Percent off the regular price for the selected products; 0 ends the sale. */
const DiscountDialog = ({ products, pending, onApply, onClose }) => {
	const [percent, setPercent] = useState('20')
	const value = Number(percent)
	const valid = percent !== '' && Number.isInteger(value) && value >= 0 && value <= 90

	return (
		<Modal title='Set discount' onClose={onClose}>
			<form
				className={style.dialog}
				onSubmit={(e) => {
					e.preventDefault()
					if (valid) onApply(value)
				}}
				noValidate
			>
				<TextField
					label='Discount (%)'
					type='number'
					min='0'
					max='90'
					step='1'
					inputMode='numeric'
					value={percent}
					onChange={(e) => setPercent(e.target.value)}
					error={valid ? undefined : 'Enter a whole number from 0 to 90'}
					hint='Taken off the regular price; products already on sale are not discounted twice. 0 ends the sale.'
				/>
				{valid && (
					<table className={table.table}>
						<caption className='visually-hidden'>New prices</caption>
						<thead>
							<tr>
								<th scope='col'>Product</th>
								<th scope='col' className={table.numeric}>
									Now
								</th>
								<th scope='col' className={table.numeric}>
									After
								</th>
							</tr>
						</thead>
						<tbody>
							{products.slice(0, PREVIEW_ROWS).map((product) => {
								const next = previewDiscount(product, value)
								return (
									<tr key={product._id}>
										<td>{product.title}</td>
										<td className={table.numeric}>{formatMoney(product.price)}</td>
										<td className={table.numeric}>
											{formatMoney(next.price)}
											{next.compareAtPrice && (
												<div className={table.muted}>
													<s>{formatMoney(next.compareAtPrice)}</s>
												</div>
											)}
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				)}
				{products.length > PREVIEW_ROWS && (
					<p className={table.muted}>…and {products.length - PREVIEW_ROWS} more.</p>
				)}
				<div className={style.dialogButtons}>
					<Button variant='secondary' onClick={onClose}>
						Cancel
					</Button>
					<Button type='submit' disabled={!valid || pending}>
						{pending ? 'Applying…' : value === 0 ? 'End sale' : `Apply −${value}%`}
					</Button>
				</div>
			</form>
		</Modal>
	)
}

/**
 * Actions for the selected products.
 * @param onAction `(action, extra?) => Promise` — 'show' | 'hide' | 'delete' | 'discount'
 */
const BulkBar = ({ products, pending, onAction, onClear }) => {
	const [discountOpen, setDiscountOpen] = useState(false)
	const confirm = useAdminConfirm()
	const count = products.length
	const close = () => setDiscountOpen(false)
	const apply = (action, extra) => onAction(action, extra).then(close, () => {})

	const handleDelete = async () => {
		const names = products
			.slice(0, 3)
			.map((product) => `"${product.title}"`)
			.join(', ')
		const more = count > 3 ? ` and ${count - 3} more` : ''
		const confirmed = await confirm({
			title: `Delete ${count} ${count === 1 ? 'product' : 'products'}?`,
			message: `${names}${more} will be removed for good. Past orders keep their copy. To take products off sale for now, hide them instead.`,
			confirmLabel: 'Delete',
			tone: 'danger',
		})
		if (confirmed) apply('delete')
	}

	return (
		<div className={style.bar} role='region' aria-label='Bulk actions'>
			<p className={style.count}>
				<strong>{count}</strong> selected
			</p>
			<div className={style.actions}>
				<Button variant='secondary' size='sm' disabled={pending} onClick={() => apply('show')}>
					<Eye size={16} aria-hidden /> Show
				</Button>
				<Button variant='secondary' size='sm' disabled={pending} onClick={() => apply('hide')}>
					<EyeOff size={16} aria-hidden /> Hide
				</Button>
				<Button
					variant='secondary'
					size='sm'
					disabled={pending}
					onClick={() => setDiscountOpen(true)}
				>
					<Percent size={16} aria-hidden /> Set discount
				</Button>
				<Button
					variant='secondary'
					size='sm'
					className={style.danger}
					disabled={pending}
					onClick={handleDelete}
				>
					<Trash2 size={16} aria-hidden /> Delete
				</Button>
			</div>
			<Button variant='ghost' size='sm' onClick={onClear} className={style.clear}>
				<X size={16} aria-hidden /> Clear selection
			</Button>

			{discountOpen && (
				<DiscountDialog
					products={products}
					pending={pending}
					onApply={(percent) => apply('discount', { percent })}
					onClose={close}
				/>
			)}
		</div>
	)
}

export default BulkBar
