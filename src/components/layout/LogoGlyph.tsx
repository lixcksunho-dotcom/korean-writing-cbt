import Image from 'next/image'

export default function LogoGlyph({ className = '' }: { className?: string }) {
  return <Image src="/brand/mark.svg" width={64} height={64} alt="" aria-hidden="true" unoptimized loading="eager" className={className} />
}
