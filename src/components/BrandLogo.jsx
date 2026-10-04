const files = { blue: '01_logo_blue.png', white: '02_logo_white.png', icon: '03_icon_J.png' };

export default function BrandLogo({ variant = 'blue', className = '' }) {
  return <img src={`/images/jeexpert/${files[variant]}`} alt="JEEXPERT" className={`block object-contain ${className}`} />;
}
