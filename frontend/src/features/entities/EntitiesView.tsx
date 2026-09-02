import React, { useEffect, useState } from 'react';
import { entityService, EntityItem } from '../../services/entities';
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  Phone, 
  Car, 
  MapPin, 
  Building2, 
  CreditCard,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';

export const EntitiesView: React.FC = () => {
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('PERSON');
  const [newValue, setNewValue] = useState('');
  const [newRisk, setNewRisk] = useState(30);
  const [creating, setCreating] = useState(false);

  const fetchEntities = async () => {
    try {
      setLoading(true);
      const data = await entityService.getEntities(typeFilter, searchTerm);
      setEntities(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve entities from Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, [typeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEntities();
  };

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      setCreating(true);
      const created = await entityService.createEntity({
        name: newName,
        type: newType,
        value: newValue,
        riskScore: newRisk,
      });
      setEntities([created, ...entities]);
      setIsModalOpen(false);
      setNewName('');
      setNewValue('');
      setNewRisk(30);
    } catch (err: any) {
      alert(`Entity registration failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PHONE': return <Phone className="w-4 h-4 text-emerald-400" />;
      case 'VEHICLE': return <Car className="w-4 h-4 text-amber-400" />;
      case 'LOCATION': return <MapPin className="w-4 h-4 text-rose-400" />;
      case 'ORGANIZATION': return <Building2 className="w-4 h-4 text-purple-400" />;
      case 'ACCOUNT': return <CreditCard className="w-4 h-4 text-cyan-400" />;
      default: return <Users className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Target Entity Registry
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              {entities.length} Monitored
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Persisted criminal persons, burner phones, shell companies, and associated identifiers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchEntities} 
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            title="Refresh Entities"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/10"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Target Entity</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input 
            type="text"
            placeholder="Search by entity name, alias, phone, vehicle plate..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800/80 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </form>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/50"
          >
            <option value="ALL">All Entity Types</option>
            <option value="PERSON">Person</option>
            <option value="ORGANIZATION">Organization</option>
            <option value="PHONE">Phone Number</option>
            <option value="VEHICLE">Vehicle Plate</option>
            <option value="LOCATION">Location</option>
            <option value="ACCOUNT">Bank Account</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Entities Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-slate-800/40 animate-pulse rounded-lg"></div>
            ))}
          </div>
        ) : entities.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No entities registered in Supabase matching current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase text-slate-400 font-mono">
                <tr>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Entity Name / Identifier</th>
                  <th className="px-5 py-3.5">Detail / Secondary Value</th>
                  <th className="px-5 py-3.5">Risk Score</th>
                  <th className="px-5 py-3.5">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {entities.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                        {getTypeIcon(e.type)}
                        <span>{e.type}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-medium text-white">
                      {e.name}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-slate-400 font-mono text-xs">
                      {e.value || e.aliases || '—'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${
                        e.riskScore > 70 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        e.riskScore > 40 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {e.riskScore}%
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-slate-500 font-mono text-xs">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Entity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">Register Target Entity</h2>
            <form onSubmit={handleCreateEntity} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Entity Name / Handle</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Suresh Verma"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Type</label>
                <select 
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="PERSON">Person</option>
                  <option value="ORGANIZATION">Organization / Shell Co</option>
                  <option value="PHONE">Phone Number</option>
                  <option value="VEHICLE">Vehicle License Plate</option>
                  <option value="LOCATION">Physical Location</option>
                  <option value="ACCOUNT">Financial Account</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Identifier Value / Aliases</label>
                <input 
                  type="text" 
                  placeholder="e.g. +91 98220 13345 or DL-01-AB-1234"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Risk Score ({newRisk}%)</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={newRisk}
                  onChange={(e) => setNewRisk(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-all"
                >
                  {creating ? 'Registering...' : 'Save Entity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
