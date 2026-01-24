import React from 'react';
import { useStore } from '@nanostores/react';
import { Filter, X } from 'lucide-react';
import { 
  selectedYear, selectedGenre, selectedStyle,
  uniqueYears, uniqueGenres, uniqueStyles,
  filteredProducts
} from '../stores/productStore';

export default function Filters() {
  const $year = useStore(selectedYear);
  const $genre = useStore(selectedGenre);
  const $style = useStore(selectedStyle);
  
  const $years = useStore(uniqueYears);
  const $genres = useStore(uniqueGenres);
  const $styles = useStore(uniqueStyles);
  const $filtered = useStore(filteredProducts);

  const hasFilters = $year !== 'all' || $genre !== 'all' || $style !== 'all';

  const clearFilters = () => {
    selectedYear.set('all');
    selectedGenre.set('all');
    selectedStyle.set('all');
  };

  return (
    <div className="border-b border-white/5 pb-8 mb-8">
      <div className="flex items-end justify-between mb-8">
        <h2 className="text-4xl font-black uppercase tracking-tighter tracking-widest flex items-baseline gap-4">
          COLLECTION <span className="text-[#ff4d7d]/30 text-2xl font-black">[{Object.keys($filtered).length}]</span>
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#ff4d7d]" />
          <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Filtros:</span>
        </div>

        {/* Year Filter */}
        <select
          value={$year}
          onChange={(e) => selectedYear.set(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-white outline-none focus:border-[#ff4d7d] transition-all cursor-pointer hover:bg-white/10"
        >
          {$years.map(year => (
            <option key={year} value={year} className="bg-[#0a0d1f]">
              {year === 'all' ? 'Todos los años' : year}
            </option>
          ))}
        </select>

        {/* Genre Filter */}
        <select
          value={$genre}
          onChange={(e) => selectedGenre.set(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-white outline-none focus:border-[#ff4d7d] transition-all cursor-pointer hover:bg-white/10"
        >
          {$genres.map(genre => (
            <option key={genre} value={genre} className="bg-[#0a0d1f]">
              {genre === 'all' ? 'Todos los géneros' : genre}
            </option>
          ))}
        </select>

        {/* Style Filter */}
        <select
          value={$style}
          onChange={(e) => selectedStyle.set(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-white outline-none focus:border-[#ff4d7d] transition-all cursor-pointer hover:bg-white/10"
        >
          {$styles.map(style => (
            <option key={style} value={style} className="bg-[#0a0d1f]">
              {style === 'all' ? 'Todos los estilos' : style}
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-[9px] font-black uppercase tracking-wider text-[#ff4d7d] hover:text-white transition-colors flex items-center gap-2 px-3 py-2 bg-[#ff4d7d]/10 rounded-xl border border-[#ff4d7d]/20 hover:bg-[#ff4d7d]/20"
          >
            <X className="w-3 h-3" /> Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
