import {
	KeyboardArrowLeftOutlined,
	KeyboardArrowRightOutlined,
} from '@mui/icons-material'

import React from 'react'
import style from './ArrowBtn.module.css'
export const ArrowBtn = (props) => {
	return (
		<button
			onClick={props.onClick}
			className={style.arrow}
			style={props.direction === 'left' ? { left: 10 } : { right: 10 }}
		>
			{props.direction === 'left' ? (
				<KeyboardArrowLeftOutlined />
			) : (
				<KeyboardArrowRightOutlined />
			)}
		</button>
	)
}
