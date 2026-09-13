import LogoGlyph from './LogoGlyph'

export default function BrandLogo({ name = '실글패스', light = false, wordmarkClassName = '' }: { name?: string; light?: boolean; wordmarkClassName?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap" role="img" aria-label={name}>
      <LogoGlyph className="h-8 w-8 shrink-0" />
      <span aria-hidden="true" className={`font-black text-base sm:text-lg tracking-tight ${light ? 'text-white' : 'text-[var(--navy)]'} ${wordmarkClassName}`}>{"KPPASS"}</span>
    </span>
  )
}
