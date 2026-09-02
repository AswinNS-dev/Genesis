import React, { useEffect, useState } from 'react';
import { entityService } from '../../services/entities';
import { Entity } from '../../types';
import { Users, Phone, Car, MapPin, Building, CreditCard } from 'lucide-react';

const ENTITY_ICONS: Record<string, any> = {
  PERSON: Users,
  PHONE: Phone,
  VEHICLE: Car,
  LOCATION: MapPin,
  ORGANIZATION: Building,
  BANK_ACCOUNT: CreditCard,
};

export const EntitiesView: React.FC = () => {
  const [entities, setEntities] = useState<Entity[]>([]);

  useEffect(() => {
    entityService.list().then(setEntities).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Entity Intelligence Directory</h1>
        <p className="text-sm text-slate-400">All registered suspects, phone numbers, vehicles, and geo-locations.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950 text-xs font-semibold text-slate-400 uppercase border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Entity Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Value / Metadata</th>
              <th className="px-4 py-3">Risk Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {entities.map((e) => {
              const Icon = ENTITY_ICONS[e.type] || Users;
              return (
                <tr key={e.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-slate-100 flex items-center gap-2">
                    <Icon className="w-4 h-4 text-sky-400" />
                    {e.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {e.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{e.value || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      e.riskScore > 70 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {e.riskScore} / 100
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
