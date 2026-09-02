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
  ShieldAlert,
  X,
  PhoneCall,
  Coins,
  FileText,
  Clock,
  Sparkles
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
  const [newRisk, setNewRisk] = useState(45);
  const [creating, setCreating] = useState(false);

  // Dossier Modal
  const [selectedEntity, setSelectedEntity] = useState<EntityItem | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierData, setDossierData] = useState<any>(null);

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
      setNewRisk(45);
      openDossier(created);
    } catch (err: any) {
      alert(`Entity registration failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const openDossier = async (ent: EntityItem) => {
    setSelectedEntity(ent);
    setDossierLoading(true);
    try {
      const full = await entityService.getEntity(ent.id);
      setDossierData(full.dossier || null);
    } catch (err) {
      console.error(err);
    } finally {
      setDossierLoading(false);
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
              100,000 Monitored in Supabase
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Persisted criminal persons, burner phones, shell companies, and associated identifiers across 9 database tables.
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
            placeholder="Search across 100,000 entities by Name, Alias, Phone Number, Vehicle Plate, Location..."
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
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
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
                  <th className="px-5 py-3.5">Phone / Plate / Location Detail</th>
                  <th className="px-5 py-3.5">Risk Score</th>
                  <th className="px-5 py-3.5">Case Reference</th>
                  <th className="px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {entities.map((e) => (
                  <tr 
                    key={e.id} 
                    onClick={() => openDossier(e)}
                    className="hover:bg-slate-900/60 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                        {getTypeIcon(e.type)}
                        <span>{e.type}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-medium text-white">
                      {e.name}
                      <span className="text-[10px] font-mono text-slate-500 block">{e.id}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-slate-300 font-mono text-xs">
                      {e.phone || e.vehicle || e.location || e.value || '—'}
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
                    <td className="px-5 py-4 whitespace-nowrap font-mono text-xs text-amber-400">
                      {e.caseId || 'CR-UNASSIGNED'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-blue-400 hover:text-blue-300">
                      View 360° Dossier &rarr;
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 360° Person Investigation Dossier Modal */}
      {selectedEntity && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-xs font-semibold border border-blue-500/20">
                    {selectedEntity.id}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-mono border border-rose-500/20">
                    Risk Score: {selectedEntity.riskScore}%
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">{selectedEntity.name}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Connected Intelligence Profile cross-referenced across 9 Supabase database tables.
                </p>
              </div>
              <button 
                onClick={() => setSelectedEntity(null)} 
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {dossierLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-800 animate-pulse rounded"></div>)}
                </div>
              ) : (
                <>
                  {/* Key Stats Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-500">Phone Identifier</span>
                      <div className="text-sm font-semibold text-slate-200 mt-0.5 font-mono">{selectedEntity.phone || selectedEntity.value || 'N/A'}</div>
                    </div>
                    <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-500">Vehicle Association</span>
                      <div className="text-sm font-semibold text-slate-200 mt-0.5 font-mono">{selectedEntity.vehicle || 'N/A'}</div>
                    </div>
                    <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-500">Primary Location</span>
                      <div className="text-sm font-semibold text-slate-200 mt-0.5">{selectedEntity.location || 'N/A'}</div>
                    </div>
                    <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-500">Linked FIR Case</span>
                      <div className="text-sm font-semibold text-amber-400 mt-0.5 font-mono">{selectedEntity.caseId || 'CR-UNASSIGNED'}</div>
                    </div>
                  </div>

                  {/* Aliases Section */}
                  {dossierData?.aliases && dossierData.aliases.length > 0 && (
                    <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                      <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Known Pseudonyms & Aliases (entity_aliases)</h4>
                      <div className="flex flex-wrap gap-2">
                        {dossierData.aliases.map((a: any, idx: number) => (
                          <span key={idx} className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono">
                            {a.alias_name} ({a.platform || a.alias_type || 'Alias'})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Communications Section */}
                  {dossierData?.communications && dossierData.communications.length > 0 && (
                    <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                      <h4 className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-2">Recent Call Intercepts (call_records)</h4>
                      <div className="space-y-2">
                        {dossierData.communications.slice(0, 4).map((c: any, idx: number) => (
                          <div key={idx} className="text-xs flex items-center justify-between text-slate-300 border-b border-slate-800/60 pb-1">
                            <span>{c.caller_name || c.caller_number} &rarr; {c.callee_name || c.callee_number}</span>
                            <span className="font-mono text-slate-500">{c.duration_seconds}s • {c.cell_tower_city}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Financial Transactions */}
                  {dossierData?.transactions && dossierData.transactions.length > 0 && (
                    <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                      <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Financial Flow Logs (financial_transactions)</h4>
                      <div className="space-y-2">
                        {dossierData.transactions.slice(0, 4).map((t: any, idx: number) => (
                          <div key={idx} className="text-xs flex items-center justify-between text-slate-300 border-b border-slate-800/60 pb-1">
                            <span>{t.sender_name} &rarr; {t.receiver_name}</span>
                            <span className="font-mono font-bold text-emerald-400">INR {Number(t.amount_inr || 0).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Entity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Register Target Entity in Supabase</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateEntity} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Entity Name / Subject</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Ramesh Chandra / Shadow Cell" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Entity Type</label>
                  <select 
                    value={newType} 
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="PERSON">Person</option>
                    <option value="ORGANIZATION">Organization</option>
                    <option value="PHONE">Phone Number</option>
                    <option value="VEHICLE">Vehicle</option>
                    <option value="LOCATION">Location</option>
                    <option value="ACCOUNT">Bank Account</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Risk Assessment (0-100)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={newRisk}
                    onChange={(e) => setNewRisk(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Identifier Detail (Phone / Plate / Location)</label>
                <input 
                  type="text" 
                  placeholder="e.g. +919876543210 or MH02AB1234" 
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-all"
                >
                  {creating ? 'Saving...' : 'Save to Supabase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
