import { useI18n } from '../../i18n/useI18n'
import { fitPosition, MIN_FIT_ANSWERS } from './sizeFit'
import style from './FitBar.module.css'

/**
 * How the product fits according to reviewers: a verdict ("Runs small — 70% of reviewers…")
 * and a marker on a small → large scale. Hidden until enough reviewers have answered.
 * @param fit `{ counts: { small, true, large }, total, verdict, share }` from the product
 */
const FitBar = ({ fit }) => {
	const { t } = useI18n()
	if (!fit || fit.total < MIN_FIT_ANSWERS) return null

	const percent = Math.round(fit.share * 100)
	const position = fitPosition(fit.counts, fit.total)

	return (
		<div className={style.fit}>
			<p className={style.heading}>
				<span className={style.label}>{t('fit.label')}:</span>{' '}
				<strong>{fit.verdict ? t(`fit.verdict.${fit.verdict}`) : t('fit.mixed')}</strong>
				<span className={style.count}> · {t('fit.basedOn', { count: fit.total })}</span>
			</p>
			<div
				className={style.scale}
				role='img'
				aria-label={t('fit.scaleLabel', fit.counts)}
				style={{ '--fit-position': `${position}%` }}
			>
				<span className={style.track} aria-hidden>
					<span className={style.marker} />
				</span>
				<span className={style.legend} aria-hidden>
					<span>{t('fit.scale.small')}</span>
					<span>{t('fit.scale.true')}</span>
					<span>{t('fit.scale.large')}</span>
				</span>
			</div>
			<p className={style.detail}>
				{fit.verdict ? t(`fit.detail.${fit.verdict}`, { percent }) : t('fit.mixedDetail')}
			</p>
		</div>
	)
}

export default FitBar
