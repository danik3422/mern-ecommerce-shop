import { Plus, Trash2 } from 'lucide-react'
import Button from '../../components/ui/Button'
import field from '../../components/ui/Field.module.css'
import { cx } from '../../utils/cx'
import { presetSizes } from '../productForm'
import style from './FormParts.module.css'

/**
 * Rows of size label + stock. At least one row is always kept.
 * @param errors field errors keyed by path, e.g. `{ 'sizes.1.label': '...' }`
 */
const SizesEditor = ({ sizes, onChange, errors = {} }) => {
	const update = (index, changes) =>
		onChange(sizes.map((size, i) => (i === index ? { ...size, ...changes } : size)))

	const listError = errors.sizes

	return (
		<fieldset className={style.fieldset}>
			<legend className={field.label}>Sizes and stock</legend>
			<div className={style.presets}>
				<span className={field.hint}>Presets:</span>
				<Button variant='ghost' size='sm' onClick={() => onChange(presetSizes('clothing'))}>
					XS–XL
				</Button>
				<Button variant='ghost' size='sm' onClick={() => onChange(presetSizes('jeans'))}>
					Jeans 28–34
				</Button>
				<Button variant='ghost' size='sm' onClick={() => onChange(presetSizes('oneSize'))}>
					One size
				</Button>
			</div>

			<table className={style.sizesTable}>
				<thead>
					<tr>
						<th scope='col'>Size</th>
						<th scope='col'>In stock</th>
						<th scope='col'>
							<span className='visually-hidden'>Remove</span>
						</th>
					</tr>
				</thead>
				<tbody>
					{sizes.map((size, index) => {
						const labelError = errors[`sizes.${index}.label`]
						const stockError = errors[`sizes.${index}.stock`]
						return (
							<tr key={index}>
								<td>
									<input
										className={cx(field.control, labelError && field.invalid)}
										value={size.label}
										onChange={(e) => update(index, { label: e.target.value })}
										aria-label={`Size ${index + 1} label`}
										aria-invalid={Boolean(labelError)}
										required
									/>
									{labelError && <p className={field.error}>{labelError}</p>}
								</td>
								<td>
									<input
										className={cx(field.control, stockError && field.invalid)}
										type='number'
										min='0'
										step='1'
										inputMode='numeric'
										value={size.stock}
										onChange={(e) => update(index, { stock: e.target.value })}
										aria-label={`Stock of size ${size.label || index + 1}`}
										aria-invalid={Boolean(stockError)}
										required
									/>
									{stockError && <p className={field.error}>{stockError}</p>}
								</td>
								<td>
									<Button
										variant='ghost'
										size='sm'
										onClick={() => onChange(sizes.filter((_, i) => i !== index))}
										disabled={sizes.length === 1}
										aria-label={`Remove size ${size.label || index + 1}`}
									>
										<Trash2 size={16} aria-hidden />
									</Button>
								</td>
							</tr>
						)
					})}
				</tbody>
			</table>
			{listError && <p className={field.error}>{listError}</p>}

			<Button
				variant='secondary'
				size='sm'
				onClick={() => onChange([...sizes, { label: '', stock: '0' }])}
			>
				<Plus size={16} aria-hidden /> Add size
			</Button>
		</fieldset>
	)
}

export default SizesEditor
