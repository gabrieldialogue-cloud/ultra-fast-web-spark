export function AlteseLogoIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#003C8F" />
          <stop offset="50%" stopColor="#1A73E8" />
          <stop offset="100%" stopColor="#FF7A00" />
        </linearGradient>
        <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF7A00" />
          <stop offset="100%" stopColor="#FF5722" />
        </linearGradient>
        <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00A859" />
          <stop offset="100%" stopColor="#00C853" />
        </linearGradient>
      </defs>
      
      {/* Hexágono de fundo */}
      <path
        d="M 50 5 L 85 27.5 L 85 72.5 L 50 95 L 15 72.5 L 15 27.5 Z"
        fill="url(#logoGradient)"
      />
      
      {/* Letra A moderna e geométrica */}
      <path
        d="M 50 25 L 65 65 L 57 65 L 54 55 L 46 55 L 43 65 L 35 65 L 50 25 Z M 48 48 L 52 48 L 50 38 Z"
        fill="white"
      />
      
      {/* Elementos de conectividade - cantos superiores */}
      <circle cx="35" cy="35" r="2.5" fill="url(#accentGradient)" />
      <circle cx="65" cy="35" r="2.5" fill="url(#accentGradient)" />
      
      {/* Elementos de conectividade - cantos inferiores */}
      <circle cx="30" cy="70" r="2.5" fill="url(#greenGradient)" />
      <circle cx="70" cy="70" r="2.5" fill="url(#greenGradient)" />
      
      {/* Linhas de conexão sutis */}
      <line x1="35" y1="35" x2="48" y2="38" stroke="white" strokeWidth="0.8" opacity="0.3" />
      <line x1="65" y1="35" x2="52" y2="38" stroke="white" strokeWidth="0.8" opacity="0.3" />
      <line x1="30" y1="70" x2="43" y2="65" stroke="white" strokeWidth="0.8" opacity="0.3" />
      <line x1="70" y1="70" x2="57" y2="65" stroke="white" strokeWidth="0.8" opacity="0.3" />
      
      {/* Borda do hexágono */}
      <path
        d="M 50 5 L 85 27.5 L 85 72.5 L 50 95 L 15 72.5 L 15 27.5 Z"
        stroke="white"
        strokeWidth="1.5"
        fill="none"
        opacity="0.2"
      />
    </svg>
  );
}

export function AlteseLogoText({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col ${className}`}>
      <span className="text-xl font-bold tracking-tight leading-none">ALTESE</span>
      <span className="text-xs opacity-90 tracking-wider leading-none">AI Sales Sync</span>
    </div>
  );
}
