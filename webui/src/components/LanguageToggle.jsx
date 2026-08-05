import { useI18n } from '../i18n'

export default function LanguageToggle({ className = '' }) {
    const { lang, setLang, t } = useI18n()
    const nextLang = lang === 'vi' ? 'en' : lang === 'en' ? 'zh' : 'vi'
    const label = lang === 'vi' ? t('language.vietnamese') : lang === 'en' ? t('language.english') : t('language.chinese')

    return (
        <button
            type="button"
            onClick={() => setLang(nextLang)}
            className={`text-xs font-semibold px-2 py-1 rounded-md border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ${className}`}
            title={t('language.label')}
        >
            🌐 {label}
        </button>
    )
}
