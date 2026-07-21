import { Check } from 'lucide-react'
import { QARIS, qariFor } from './quranAudio'
import { useLocale } from './i18n'

export default function QariPicker({ value, onChange, label }) {
  const { t } = useLocale()
  const selectedId = qariFor(value).id
  return <div className="qari-picker" role="radiogroup" aria-label={label || t('qari.label')}>
    {QARIS.map((qari) => {
      const selected = qari.id === selectedId
      return <button type="button" role="radio" aria-checked={selected} key={qari.id} onClick={() => onChange(qari.id)} className={`qari-choice ${selected ? 'qari-choice-active' : ''}`}>
        <span className="qari-choice-radio" aria-hidden="true">{selected && <Check size={14} strokeWidth={3}/>}</span>
        <span className="min-w-0 flex-1 text-left"><b>{qari.name}</b><small>{qari.detail}</small></span>
        {qari.id === 'ayman-sowaid' && <span className="qari-default-badge">{t('qari.default')}</span>}
      </button>
    })}
  </div>
}
