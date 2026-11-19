import { Send } from '@mui/icons-material'
import style from './NewsLetter.module.css'
const NewsLetter = () => {
	return (
		<div className={style.container}>
			<h1 className={style['news__title']}>Newsletter</h1>
			<p className={style['news__desc']}>Get timely updates from your favorite products.</p>
			<div className={style['news__input-container']}>
				<input className={style['news__input']} type='text' placeholder='Your email' />
				<button className={style['news__btn']}>
					<Send />
				</button>
			</div>
		</div>
	)
}

export default NewsLetter
