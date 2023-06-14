import { useState } from 'react'
import { sliderItems } from '../../data'
import { ArrowBtn } from '../UI/ArrowBtn/ArrowBtn'
import style from './Slider.module.css'

const Slider = () => {
	const [slideIndex, setSlideIndex] = useState(0)
	const handleClick = (direction) => {
		if (direction === 'left') {
			setSlideIndex(slideIndex > 0 ? slideIndex - 1 : 2)
		} else {
			setSlideIndex(slideIndex < 2 ? slideIndex + 1 : 0)
		}
	}

	return (
		<div className={style.slider}>
			<ArrowBtn direction='left' onClick={() => handleClick('left')} />

			<div
				className={style['slider__wrapper']}
				slideIndex={slideIndex}
				style={{
					transform: `translateX(${slideIndex * -100}vw)`,
				}}
			>
				{sliderItems.map((item) => (
					<div
						className={style['slider__slide']}
						style={{ backgroundColor: `#${item.bg}` }}
						key={item.id}
					>
						<div className={style['slider__img-container']}>
							<img className={style['slider__img']} scr={item.img} />
						</div>
						<div className={style['slider__info']}>
							<h1 className={style['slider__title']}>{item.title}</h1>
							<p className={style['slider__description']}>{item.description}</p>
							<button className={style['slider__btn']}>Show now</button>
						</div>
					</div>
				))}
			</div>

			<ArrowBtn direction='right' onClick={() => handleClick('right')} />
		</div>
	)
}

export default Slider
