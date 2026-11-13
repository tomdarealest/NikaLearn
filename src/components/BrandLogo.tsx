import Link from 'next/link';

type BrandLogoProps = {
  href?: string;
  height?: number;
  className?: string;
};

export default function BrandLogo({ href = '/', height = 40, className = '' }: BrandLogoProps) {
  const image = (
    <div className="relative rounded-xl overflow-hidden border-2 border-[#121212] shadow-[2px_2px_0_#121212] bg-[#FFD23F] p-0.5 inline-flex items-center justify-center">
      <img
        src="/assets/img/logo.png"
        alt="NikaLearn"
        height={height}
        style={{ height, width: 'auto' }}
        className={`object-contain rounded-lg ${className}`}
      />
    </div>
  );

  if (!href) return image;

  return (
    <Link href={href} className="inline-flex items-center transition-transform hover:-translate-y-0.5">
      {image}
    </Link>
  );
}
