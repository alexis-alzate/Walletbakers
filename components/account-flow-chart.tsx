'use client';

import { useMemo, useState } from 'react';
import type { DashboardData } from '@/lib/wallet';

type Props = { flows: DashboardData['accountFlows']; currency: string; onAccountSelect: (id: string, name: string) => void };
const palette = ['#20d6a2', '#3b9cff', '#a967ff', '#ffb547', '#f05d76', '#5ac8e8'];
const money = (value: number, currency: string) => new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);

export function AccountFlowChart({ flows, currency, onAccountSelect }: Props) {
  const currencies = useMemo(() => [...new Set(flows.map((flow) => flow.currency))].sort(), [flows]);
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const activeCurrency = currencies.includes(selectedCurrency) ? selectedCurrency : currencies[0] ?? currency;
  const items = flows.filter((flow) => flow.currency === activeCurrency).slice(0, 12);
  const maxValue = Math.max(...items.map((flow) => flow.value), 1);
  const sources = [...new Set(items.map((flow) => flow.fromId))];
  const targets = [...new Set(items.map((flow) => flow.toId))];
  const yPosition = (index: number, count: number) => count <= 1 ? 150 : 36 + index * (228 / (count - 1));

  return <section className="panel account-flow-panel" id="account-flow" aria-labelledby="account-flow-title">
    <div className="panel-heading account-flow-heading">
      <div><span className="panel-kicker">TRANSFERENCIAS</span><h2 id="account-flow-title">Mapa del dinero entre cuentas</h2><p>Los movimientos reales de una cuenta a otra en {flows.reduce((sum, flow) => sum + flow.count, 0)} transferencias</p></div>
      {currencies.length > 1 && <label className="flow-currency-select"><span className="sr-only">Moneda del mapa de transferencias</span><select value={activeCurrency} onChange={(event) => setSelectedCurrency(event.target.value)}>{currencies.map((code) => <option key={code}>{code}</option>)}</select></label>}
    </div>
    {items.length ? <>
      <div className="account-flow-summary"><strong>{money(items.reduce((sum, flow) => sum + flow.value, 0), activeCurrency)}</strong><span>{items.reduce((sum, flow) => sum + flow.count, 0)} transferencias · {activeCurrency}</span></div>
      <div className="account-flow-visual">
        <svg viewBox="0 0 760 300" role="img" aria-label={`Flujo de transferencias entre cuentas en ${activeCurrency}`}>
          {items.map((flow, index) => {
            const sourceIndex = sources.indexOf(flow.fromId), targetIndex = targets.indexOf(flow.toId);
            const sourceY = yPosition(sourceIndex, sources.length), targetY = yPosition(targetIndex, targets.length);
            const color = palette[sourceIndex % palette.length];
            return <path key={`${flow.fromId}-${flow.toId}-${flow.currency}`} d={`M 196 ${sourceY} C 330 ${sourceY}, 430 ${targetY}, 564 ${targetY}`} fill="none" stroke={color} strokeOpacity=".46" strokeWidth={Math.max(4, (flow.value / maxValue) * 34)} strokeLinecap="round" tabIndex={0} role="button" aria-label={`${flow.fromName} a ${flow.toName}: ${money(flow.value, activeCurrency)}`} onClick={() => onAccountSelect(flow.fromId, flow.fromName)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onAccountSelect(flow.fromId, flow.fromName); }}><title>{`${flow.fromName} → ${flow.toName}: ${money(flow.value, activeCurrency)} · ${flow.count} movimientos`}</title></path>;
          })}
          {sources.map((id, index) => {
            const flow = items.find((item) => item.fromId === id)!;
            return <g key={`source-${id}`} className="flow-node" role="button" tabIndex={0} aria-label={`Filtrar movimientos de ${flow.fromName}`} onClick={() => onAccountSelect(id, flow.fromName)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onAccountSelect(id, flow.fromName); }}><rect x="8" y={yPosition(index, sources.length) - 17} width="184" height="34" rx="9" fill="#151c1a" stroke={palette[index % palette.length]} strokeOpacity=".5"/><circle cx="25" cy={yPosition(index, sources.length)} r="5" fill={palette[index % palette.length]}/><text x="39" y={yPosition(index, sources.length) + 4}>{flow.fromName.slice(0, 21)}</text></g>;
          })}
          {targets.map((id, index) => {
            const flow = items.find((item) => item.toId === id)!;
            return <g key={`target-${id}`} className="flow-node" role="button" tabIndex={0} aria-label={`Filtrar movimientos de ${flow.toName}`} onClick={() => onAccountSelect(id, flow.toName)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onAccountSelect(id, flow.toName); }}><rect x="568" y={yPosition(index, targets.length) - 17} width="184" height="34" rx="9" fill="#151c1a" stroke="#3a4540"/><circle cx="585" cy={yPosition(index, targets.length)} r="5" fill="#20d6a2"/><text x="599" y={yPosition(index, targets.length) + 4}>{flow.toName.slice(0, 21)}</text></g>;
          })}
        </svg>
      </div>
      <div className="account-flow-legend"><span><i className="flow-dot"/>Pulsa una cuenta o una conexión para ver sus movimientos</span><span>Grosor = valor transferido</span></div>
    </> : <div className="flow-empty-state"><span className="flow-empty-icon">↗</span><div><b>No encontramos transferencias entre cuentas en este periodo</b><small>Cuando Wallet entregue el origen y destino de una transferencia, aparecerá aquí. No mostramos gastos como si fueran transferencias.</small></div></div>}
  </section>;
}