import './JaPlanLoader.css';

export type JaPlanLoaderProps = {
  /** Set from actual application readiness. False removes the loader immediately. */
  loading?: boolean;
  size?: number;
  label?: string;
  className?: string;
};

export function JaPlanLoader({ loading = true, size = 220, label = 'טוען את JaPlan…', className = '' }: JaPlanLoaderProps) {
  if (!loading) return null;
  return (
    <div className={`japlan-loader ${className}`} role="status" aria-live="polite" style={{ width: size, maxWidth: '100%' }}>
      <span className="jl-sr-only">{label}</span>
      <svg viewBox="140 160 980 960" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
<g className="jl-sun"><path d="M332 650 A326 326 0 1 1 922 650Z" fill="#CE3C37"/></g>
<g className="jl-mountain">
 <path d="M166 739 C320 644 467 554 592 408 L626 415 L663 408 C785 556 930 642 1089 739 C1024 741 973 725 921 708 L765 762 L489 762 L334 708 C277 730 222 741 166 739Z" fill="#293949"/>
 <path d="M334 708 L494 603 L476 661 L626 621 L776 660 L757 603 L921 708 L765 762 L489 762Z" fill="#1D2935"/>
 <path d="M451 552 C508 500 550 460 592 408 L626 415 L663 408 C705 459 750 509 803 552 L717 525 L739 581 L660 523 L622 594 L583 523 L508 582 L528 527Z" fill="#F8F6EE" stroke="#293949" strokeWidth="8" strokeLinejoin="round"/>
</g>
<g className="jl-gate" fill="#F05243">
 <path d="M495 724 L531 724 L532 971 L470 971Z"/>
 <path d="M721 724 L756 724 L783 971 L721 971Z"/>
 <path d="M424 762 H829 V798 H424Z" fill="#FF604F"/>
 <path d="M425 696 H827 L818 732 H435Z" fill="#FF604F"/>
 <path d="M384 650 C477 697 777 697 870 650 C856 696 851 704 803 708 H451 C405 704 397 696 384 650Z" fill="#FC5948"/>
</g>
<g fill="none" stroke="#3D6076" strokeWidth="19" strokeLinecap="round">
 <path className="jl-line jl-line1" d="M400 1004 H855"/>
 <path className="jl-line jl-line2" d="M495 1041 H760"/>
 <path className="jl-line jl-line3" d="M564 1077 H690"/>
</g>
      </svg>
      <span className="jl-status" aria-hidden="true"><i /><i /><i /></span>
    </div>
  );
}

export default JaPlanLoader;
