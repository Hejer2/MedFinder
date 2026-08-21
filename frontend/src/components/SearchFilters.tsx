import React from 'react';
import { Filter, X } from 'lucide-react';

interface Specialty {
  id: string;
  name: string;
}

interface SearchFiltersProps {
  showFilters: boolean;
  setShowFilters: (value: boolean) => void;
  selectedSpecialty: string;
  setSelectedSpecialty: (value: string) => void;
  specialties: Specialty[];
}

/**
 * UI component for filter controls on the Search page.
 * - Displays a filter toggle button.
 * - When active, shows a dropdown panel with a specialty selector.
 * - Allows clearing the selected specialty.
 */
const SearchFilters: React.FC<SearchFiltersProps> = ({
  showFilters,
  setShowFilters,
  selectedSpecialty,
  setSelectedSpecialty,
  specialties,
}) => {
  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
          showFilters ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
      >
        <Filter size={16} /> Filters
      </button>

      {/* Clear button (appears only when a specialty is selected) */}
      {selectedSpecialty && (
        <button
          onClick={() => setSelectedSpecialty('')}
          className="flex items-center gap-1 px-4 py-2 bg-primary-50 border-primary-200 border rounded-full text-sm font-medium text-primary-700 whitespace-nowrap"
        >
          Clear Specialty <X size={14} />
        </button>
      )}

      {/* Dropdown panel */}
      {showFilters && (
        <div className="mt-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
          <h3 className="font-semibold text-slate-800 mb-2">Specialty</h3>
          <select
            value={selectedSpecialty}
            onChange={e => setSelectedSpecialty(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-primary-500"
          >
            <option value="">All Specialties</option>
            {specialties.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
};

export default SearchFilters;
