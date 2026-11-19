import { useState } from 'react'
import { useNavigate } from 'react-router'
import { sliderItems } from '../../data'
import { ArrowBtn } from '../UI/ArrowBtn/ArrowBtn'
import style from './Slider.module.css'

const Slider = () => {
	const navigate = useNavigate()
	const [slideIndex, setSlideIndex] = useState(0)
	const last = sliderItems.length - 1
	const handleClick = (direction) => {
		if (direction === 'left') {
			setSlideIndex(slideIndex > 0 ? slideIndex - 1 : last)
		} else {
			setSlideIndex(slideIndex < last ? slideIndex + 1 : 0)
		}
	}

	return (
		<div className={style.slider}>
			<ArrowBtn direction='left' onClick={() => handleClick('left')} />

			<div
				className={style['slider__wrapper']}
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
							{item.img && <img className={style['slider__img']} src={item.img} alt='' />}
						</div>
						<div className={style['slider__info']}>
							<h1 className={style['slider__title']}>{item.title}</h1>
							<p className={style['slider__description']}>{item.description}</p>
							<button className={style['slider__btn']} onClick={() => navigate('/products')}>
								Shop now
							</button>
						</div>
					</div>
				))}
			</div>

			<ArrowBtn direction='right' onClick={() => handleClick('right')} />
		</div>
	)
}

export default Slider
