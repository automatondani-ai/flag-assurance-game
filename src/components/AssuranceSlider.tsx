interface AssuranceSliderProps {
  value: number;
  onChange: (v: number) => void;
}

export default function AssuranceSlider({ value, onChange }: AssuranceSliderProps) {
  const fillPct = value; // 0–100

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-ibm text-xs tracking-[0.2em] text-[#6b7a8d] uppercase">
          Assurance
        </span>
        <span
          className={[
            'font-ibm text-xl font-semibold tabular-nums transition-colors duration-150',
            value === 0 ? 'text-[#3a4557]' : 'text-gold',
          ].join(' ')}
        >
          {value}
          <span className="text-sm font-normal ml-0.5">%</span>
        </span>
      </div>

      {/* Track wrapper */}
      <div className="relative h-2 bg-navy-input border border-navy-border">
        {/* Gold fill */}
        <div
          className="absolute inset-y-0 left-0 bg-gold transition-all duration-75"
          style={{ width: `${fillPct}%` }}
        />

        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          style={{ margin: 0 }}
        />
      </div>

      {/* Tick marks */}
      <div className="flex justify-between mt-1.5 px-0.5">
        {[0, 25, 50, 75, 100].map(tick => (
          <span
            key={tick}
            className={[
              'font-ibm text-[9px] tabular-nums transition-colors duration-150',
              value >= tick && tick > 0 ? 'text-gold opacity-60' : 'text-[#2e3a4a]',
            ].join(' ')}
          >
            {tick}
          </span>
        ))}
      </div>
    </div>
  );
}
