import { Send } from '@material-ui/icons'
import style from './NewsLetter.module.css'

const NewsLetter = () => {
	return (
		<div className={style.container}>
			<h1 className={style['news__title']}>Newsletter</h1>
			<p className={style['news__desc']}>
				Subscribe to <news></news>leteer
			</p>
			<div className={style['news__input-container']}>
				<input
					className={style['news__input']}
					type='text'
					placeholder='Your email'
				/>
				<button className={style['news__btn']}>
					<Send />
				</button>
			</div>
		</div>
	)
}

export default NewsLetter
