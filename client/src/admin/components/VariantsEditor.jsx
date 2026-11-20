import { Plus, Trash2 } from 'lucide-react'
import { useId } from 'react'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'
import { COLOR_NAMES, swatchColor } from '../../data/catalog'
import { newVariant, variantErrors } from '../productForm'
import ImagesEditor from './ImagesEditor'
import SizesEditor from './SizesEditor'
import table from './Table.module.css'
import style from './VariantsEditor.module.css'

/**
 * One card per color with its own photos and stock per size.
 * @param onChange receives an updater function `(variants) => variants`, because child
 *   editors (e.g. image uploads that finish later) update from the latest state
 * @param errors server field errors keyed by path, e.g. `variants.1.sizes.0.stock`
 */
const VariantsEditor = ({ variants, onChange, errors = {} }) => {
	const listId = useId()

	/** Sets one field of a variant; `value` may itself be an updater function. */
	const setVariantField = (index, field, value) =>
		onChange((current) =>
			current.map((variant, i) =>
				i === index
					? { ...variant, [field]: typeof value === 'function' ? value(variant[field]) : value }
					: variant,
			),
		)

	const remove = (index) => onChange((current) => current.filter((_, i) => i !== index))

	return (
		<div className={style.variants}>
			<datalist id={listId}>
				{COLOR_NAMES.map((name) => (
					<option key={name} value={name} />
				))}
			</datalist>
			{errors.variants && <p className={style.error}>{errors.variants}</p>}

			{variants.map((variant, index) => {
				const ownErrors = variantErrors(errors, index)
				const label = variant.color || `Color ${index + 1}`
				return (
					<section
						key={variant.key}
						className={`${table.panel} ${style.variant}`}
						aria-label={`Color: ${label}`}
					>
						<div className={style.header}>
							<span
								className={style.swatch}
								style={{ backgroundColor: swatchColor(variant.color) || 'transparent' }}
								aria-hidden
							/>
							<TextField
								label='Color'
								list={listId}
								value={variant.color}
								onChange={(e) => setVariantField(index, 'color', e.target.value)}
								error={ownErrors.color}
								className={style.colorField}
								required
							/>
							{variants.length > 1 && (
								<Button
									variant='ghost'
									size='sm'
									onClick={() => remove(index)}
									aria-label={`Remove color ${label}`}
								>
									<Trash2 size={16} aria-hidden /> Remove
								</Button>
							)}
						</div>
						<div className={style.columns}>
							<ImagesEditor
								images={variant.images}
								onChange={(images) => setVariantField(index, 'images', images)}
								error={ownErrors.images ?? ownErrors['images.0']}
							/>
							<SizesEditor
								sizes={variant.sizes}
								onChange={(sizes) => setVariantField(index, 'sizes', sizes)}
								errors={ownErrors}
							/>
						</div>
					</section>
				)
			})}

			<Button
				variant='secondary'
				onClick={() => onChange((current) => [...current, newVariant(current[0])])}
			>
				<Plus size={16} aria-hidden /> Add color
			</Button>
		</div>
	)
}

export default VariantsEditor
