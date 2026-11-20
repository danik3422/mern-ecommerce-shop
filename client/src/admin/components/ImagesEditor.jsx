import { ChevronLeft, ChevronRight, ImagePlus, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { uploadImage } from '../../api/admin'
import { getErrorMessage } from '../../api/client'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import field from '../../components/ui/Field.module.css'
import { moveItem } from '../productForm'
import style from './FormParts.module.css'

const ACCEPTED = 'image/jpeg,image/png,image/webp'
const IMAGE_PATH = /^(https?:\/\/\S+|\/[\w\-./]+)$/

/**
 * Ordered product images: upload files, add a URL or path, reorder and remove.
 * The first image is the main one shown in the catalog.
 */
const ImagesEditor = ({ images, onChange, error }) => {
	const inputId = useId()
	const urlId = useId()
	const [uploading, setUploading] = useState(0)
	const [uploadErrors, setUploadErrors] = useState([])
	const [url, setUrl] = useState('')
	const [urlError, setUrlError] = useState('')

	const handleFiles = async (e) => {
		const files = [...e.target.files]
		e.target.value = ''
		setUploadErrors([])
		setUploading(files.length)

		const uploaded = []
		const failed = []
		for (const file of files) {
			try {
				uploaded.push(await uploadImage(file))
			} catch (err) {
				failed.push(`${file.name}: ${getErrorMessage(err)}`)
			}
			setUploading((count) => count - 1)
		}
		if (uploaded.length) onChange((current) => [...current, ...uploaded])
		setUploadErrors(failed)
	}

	const addUrl = () => {
		const value = url.trim()
		if (!IMAGE_PATH.test(value)) {
			setUrlError('Enter a full URL (https://…) or a path starting with /')
			return
		}
		if (!images.includes(value)) onChange((current) => [...current, value])
		setUrl('')
		setUrlError('')
	}

	return (
		<fieldset className={style.fieldset}>
			<legend className={field.label}>Images</legend>
			<p className={field.hint}>
				The first image is shown in the catalog. JPEG, PNG or WebP, up to 5 MB.
			</p>

			{images.length > 0 ? (
				<ol className={style.images}>
					{images.map((src, index) => (
						<li key={src} className={style.imageItem}>
							<img src={src} alt={`Product image ${index + 1}`} className={style.preview} />
							{index === 0 && <span className={style.mainBadge}>Main</span>}
							<div className={style.imageActions}>
								<Button
									variant='ghost'
									size='sm'
									onClick={() => onChange(moveItem(images, index, -1))}
									disabled={index === 0}
									aria-label={`Move image ${index + 1} left`}
								>
									<ChevronLeft size={16} aria-hidden />
								</Button>
								<Button
									variant='ghost'
									size='sm'
									onClick={() => onChange(moveItem(images, index, 1))}
									disabled={index === images.length - 1}
									aria-label={`Move image ${index + 1} right`}
								>
									<ChevronRight size={16} aria-hidden />
								</Button>
								<Button
									variant='ghost'
									size='sm'
									onClick={() => onChange(images.filter((image) => image !== src))}
									aria-label={`Remove image ${index + 1}`}
								>
									<Trash2 size={16} aria-hidden />
								</Button>
							</div>
						</li>
					))}
				</ol>
			) : (
				<p className={style.noImages}>No images yet.</p>
			)}

			<div className={style.imageInputs}>
				<label htmlFor={inputId} className={style.uploadButton}>
					<ImagePlus size={16} aria-hidden />
					{uploading ? `Uploading ${uploading}…` : 'Upload images'}
				</label>
				<input
					id={inputId}
					type='file'
					accept={ACCEPTED}
					multiple
					className='visually-hidden'
					onChange={handleFiles}
					disabled={uploading > 0}
				/>

				<div className={style.urlRow}>
					<label htmlFor={urlId} className='visually-hidden'>
						Image URL or path
					</label>
					<input
						id={urlId}
						className={field.control}
						placeholder='…or paste a URL or /images/path.jpg'
						value={url}
						onChange={(e) => setUrl(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault()
								addUrl()
							}
						}}
						aria-invalid={Boolean(urlError)}
					/>
					<Button variant='secondary' onClick={addUrl} disabled={!url.trim()}>
						Add
					</Button>
				</div>
			</div>

			{urlError && <p className={field.error}>{urlError}</p>}
			{error && <p className={field.error}>{error}</p>}
			{uploadErrors.length > 0 && (
				<Alert tone='error'>
					{uploadErrors.map((message) => (
						<div key={message}>{message}</div>
					))}
				</Alert>
			)}
		</fieldset>
	)
}

export default ImagesEditor
