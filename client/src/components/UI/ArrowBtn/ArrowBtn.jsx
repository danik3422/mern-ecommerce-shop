import { KeyboardArrowLeftOutlined, KeyboardArrowRightOutlined } from '@mui/icons-material'

import style from './ArrowBtn.module.css'
export const ArrowBtn = (props) => {
	return (
		<button
			type='button'
			aria-label={props.direction === 'left' ? 'Previous slide' : 'Next slide'}
			onClick={props.onClick}
			className={style.arrow}
			style={props.direction === 'left' ? { left: 10 } : { right: 10 }}
		>
			{props.direction === 'left' ? <KeyboardArrowLeftOutlined /> : <KeyboardArrowRightOutlined />}
		</button>
	)
}
