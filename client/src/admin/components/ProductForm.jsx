import { useState } from 'react'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'
import { COLOR_NAMES } from '../../data/catalog'
import { formToPayload, emptyProductForm } from '../productForm'
import { slugify } from '../format'
import ImagesEditor from './ImagesEditor'
import SizesEditor from './SizesEditor'
import table from './Table.module.css'
import TagInput from './TagInput'
import TextArea from './TextArea'
import style from './ProductForm.module.css'

const CATEGORY_SUGGESTIONS = ['women', 'men', 'tshirts', 'shirts', 'coats', 'jeans', 'accessories']

/**
 * Create/edit form for a product.
 * @param initialValues form values (see productForm.js); omit for a new product
 * @param onSubmit called with the request body
 * @param mutation the TanStack mutation that saves (for pending and error state)
 */
const ProductForm = ({ initialValues, onSubmit, mutation, submitLabel, extraActions }) => {
	const isNew = !initialValues
	const [form, setForm] = useState(() => initialValues ?? emptyProductForm())
	// a new product's slug follows its title until the slug is edited by hand
	const [slugEdited, setSlugEdited] = useState(!isNew)

	const errors = getFieldErrors(mutation.error)
	const unmatchedError = mutation.isError && !Object.keys(errors).length

	/** Sets one field; `value` may be an updater function like in useState. */
	const setField = (name, value) =>
		setForm((current) => ({
			...current,
			[name]: typeof value === 'function' ? value(current[name]) : value,
		}))

	const handleTitle = (e) => {
		const title = e.target.value
		setForm((current) => ({
			...current,
			title,
			slug: slugEdited ? current.slug : slugify(title),
		}))
	}

	const handleSubmit = (e) => {
		e.preventDefault()
		onSubmit(formToPayload(form, { isNew }))
	}

	const text = (name) => ({
		name,
		value: form[name],
		onChange: (e) => setField(name, e.target.value),
		error: errors[name],
	})

	return (
		<form className={style.form} onSubmit={handleSubmit} noValidate>
			<div className={style.columns}>
				<section className={`${table.panel} ${style.section}`} aria-labelledby='details-title'>
					<h2 id='details-title' className={style.sectionTitle}>
						Details
					</h2>
					<TextField label='Title' {...text('title')} onChange={handleTitle} required />
					<TextField
						label='URL slug'
						hint={`Shown in the address: /product/${form.slug || 'your-product'}`}
						{...text('slug')}
						onChange={(e) => {
							setSlugEdited(true)
							setField('slug', e.target.value)
						}}
						required
					/>
					<TextField label='Brand' {...text('brand')} required />
					<TextArea label='Description' {...text('description')} required />
					<TagInput
						label='Categories'
						hint='Press Enter to add. The first category is used for breadcrumbs.'
						values={form.categories}
						onChange={(value) => setField('categories', value)}
						suggestions={CATEGORY_SUGGESTIONS}
						error={errors.categories}
					/>
					<TagInput
						label='Colors'
						values={form.colors}
						onChange={(value) => setField('colors', value)}
						suggestions={COLOR_NAMES}
						error={errors.colors}
					/>
				</section>

				<div className={style.side}>
					<section className={`${table.panel} ${style.section}`} aria-labelledby='pricing-title'>
						<h2 id='pricing-title' className={style.sectionTitle}>
							Pricing
						</h2>
						<TextField
							label='Price ($)'
							type='number'
							min='0'
							step='0.01'
							inputMode='decimal'
							{...text('price')}
							required
						/>
						<TextField
							label='Compare-at price ($)'
							type='number'
							min='0'
							step='0.01'
							inputMode='decimal'
							hint='Original price for a sale. Leave empty for no discount.'
							{...text('compareAtPrice')}
						/>
					</section>

					<section className={`${table.panel} ${style.section}`} aria-labelledby='visibility-title'>
						<h2 id='visibility-title' className={style.sectionTitle}>
							Visibility
						</h2>
						<label className={style.toggle}>
							<input
								type='checkbox'
								checked={form.active}
								onChange={(e) => setField('active', e.target.checked)}
							/>
							<span>
								<strong>Visible in the shop</strong>
								<span className={style.toggleHint}>Hidden products are only shown here.</span>
							</span>
						</label>
					</section>

					<section className={`${table.panel} ${style.section}`} aria-label='Sizes and stock'>
						<SizesEditor
							sizes={form.sizes}
							onChange={(value) => setField('sizes', value)}
							errors={errors}
						/>
					</section>
				</div>

				<section className={`${table.panel} ${style.section} ${style.wide}`} aria-label='Images'>
					<ImagesEditor
						images={form.images}
						onChange={(value) => setField('images', value)}
						error={errors.images ?? errors['images.0']}
					/>
				</section>
			</div>

			<div className={style.footer}>
				{mutation.isError && (
					<Alert tone='error' className={style.error}>
						{unmatchedError
							? getErrorMessage(mutation.error)
							: 'Please fix the highlighted fields.'}
					</Alert>
				)}
				{mutation.isSuccess && !mutation.isPending && (
					<Alert tone='success' className={style.error}>
						Saved.
					</Alert>
				)}
				<div className={style.buttons}>
					{extraActions}
					<Button type='submit' disabled={mutation.isPending}>
						{mutation.isPending
							? 'Saving…'
							: (submitLabel ?? (isNew ? 'Create product' : 'Save changes'))}
					</Button>
				</div>
			</div>
		</form>
	)
}

export default ProductForm
