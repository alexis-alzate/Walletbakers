'use client';

import { useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Check, ChevronDown, List, Clock3, Ellipsis, RefreshCw, Search, ShieldCheck, Sparkles, TrendingUp, WalletCards } from 'lucide-react';
import { Sidebar, MobileMenu } from '@/components/sidebar';
import { CashflowChart, CategoryFlowChart } from '@/components/finance-charts';
import type { DashboardData } from '@/lib/wallet';
import { getDemoDashboard } from '@/lib/demo';

type Connection = 'connected'|'missing_token'|'invalid_token'|'initial_sync'|'wallet_api_error';
type Props = { initialData: DashboardData; initialConnection: Connection };
const numberFormat = (currency:string) => new Intl.NumberFormat('es-CO',{style:'currency',currency,maximumFractionDigits:0});
const periodOptions = Array.from({length:8},(_,index)=>{const date=new Date();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()-index);return date.toISOString().slice(0,7)});
function periodName(period:string){return new Intl.DateTimeFormat('es-CO',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${period}-01T12:00:00Z`));}
function formatDate(date:string){if(!date)return 'Sin fecha';return new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(date));}
function connectionLabel(status:Connection){return status==='connected'?'Wallet conectado':status==='missing_token'?'Token pendiente':status==='invalid_token'?'Token inválido':status==='initial_sync'?'Sincronización inicial':'Revisar conexión';}
function statusMessage(status:Connection){return status==='missing_token'?'Añade WALLET_API_TOKEN en .env.local y reinicia el servidor para cargar tus datos reales.':status==='invalid_token'?'Wallet rechazó el token. Genera otro desde Settings en Wallet y actualiza .env.local.':status==='initial_sync'?'Wallet está sincronizando la primera conexión. Espera un momento y vuelve a actualizar.':status==='wallet_api_error'?'Wallet no respondió a la consulta. La app conserva los datos de muestra por ahora.':'';}

export function Dashboard({initialData,initialConnection}:Props){
  const [data,setData]=useState(initialData);
  const [connection,setConnection]=useState(initialConnection);
  const [selectedPeriod,setSelectedPeriod]=useState(initialData.month);
  const [range,setRange]=useState<'week'|'month'>('week');
  const [loading,setLoading]=useState(false);
  const [hasLiveData,setHasLiveData]=useState(initialConnection==='connected');
  const [menuOpen,setMenuOpen]=useState(false);
  const connected=connection==='connected';

  async function refresh(period=selectedPeriod,nextRange=range){
    setLoading(true);
    try{
      const response=await fetch(`/api/dashboard?period=${encodeURIComponent(period)}&range=${nextRange}`,{cache:'no-store'});
      const result=await response.json();
      if(!response.ok){
        const code=(result.code||'wallet_api_error') as Connection;
        setConnection(code);
        if(!hasLiveData){setData(getDemoDashboard(period,nextRange));setSelectedPeriod(period);setRange(nextRange);}
        return;
      }
      setData(result as DashboardData);setSelectedPeriod(period);setRange(nextRange);setConnection('connected');setHasLiveData(true);
    }catch{
      setConnection('wallet_api_error');
      if(!hasLiveData){setData(getDemoDashboard(period,nextRange));setSelectedPeriod(period);setRange(nextRange);}
    }finally{setLoading(false);}
  }  const format=numberFormat(data.currency);
  const categoriesTotal=data.categories.reduce((sum,category)=>sum+category.value,0);

  return <div className="app-shell">
    <Sidebar open={menuOpen} onClose={()=>setMenuOpen(false)} connected={connected}/>
    <main className="main-content" id="overview">
      <header className="topbar"><div className="topbar-left"><MobileMenu onClick={()=>setMenuOpen(true)}/><div className="breadcrumbs"><span>Mi espacio</span><span className="crumb-sep">/</span><b>Resumen</b></div></div><div className="topbar-actions"><div className={`connection-pill ${connected?'connected':''}`}><span className="status-dot"/>{connectionLabel(connection)}</div><button className="top-icon" aria-label="Buscar"><Search size={17}/></button><button className="top-icon notification-button" aria-label="Notificaciones"><Bell size={17}/><i/></button><button className="avatar-button" aria-label="Perfil de Zaeta">ZA</button></div></header>
      <div className="page-wrap">
        <section className="page-heading"><div><div className="eyebrow"><Sparkles size={13}/> TU RESUMEN FINANCIERO</div><h1>Tu dinero, <em>en perspectiva.</em></h1><p>Una mirada clara a lo que entra, lo que sale y lo que estás construyendo.</p></div><div className="heading-controls"><label className="period-select"><span className="sr-only">Periodo</span><span className="calendar-icon">▦</span><select value={selectedPeriod} onChange={(event)=>refresh(event.target.value)}>{periodOptions.map((period)=><option key={period} value={period}>{periodName(period)}</option>)}</select><ChevronDown size={15}/></label><button className="refresh-button" onClick={()=>refresh()} disabled={loading} aria-label="Actualizar datos"><RefreshCw size={15} className={loading?'spin':''}/><span>Actualizar</span></button></div></section>
        {!connected&&<div className={`notice ${connection==='missing_token'?'notice-info':'notice-warning'}`} role="status"><span className="notice-icon">{connection==='missing_token'?'i':'!'}</span><span><b>{connection==='missing_token'?'Viendo datos de muestra':connectionLabel(connection)}</b><small>{statusMessage(connection)}</small></span><button onClick={()=>refresh()} disabled={loading}>Reintentar</button></div>}
        <section className="metric-grid" aria-label="Resumen del mes">
          <article className="metric-card balance-card"><div className="metric-header"><span>Balance del mes</span><span className="metric-icon"><TrendingUp size={16}/></span></div><strong>{format.format(data.totals.balance)}</strong><div className="metric-footer"><span className="trend-positive"><ArrowUpRight size={14}/> {connected?'Balance neto':'12,8%'}</span><span>{connected?'ingresos menos gastos':'vs. mes anterior'}</span><span className="mini-spark" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/></span></div></article>
          <article className="metric-card"><div className="metric-header"><span>Ingresos</span><span className="metric-icon green-icon"><ArrowDownRight size={16}/></span></div><strong>{format.format(data.totals.income)}</strong><div className="metric-footer"><span className="metric-caption">Total recibido</span></div><div className="metric-track"><span className="track-green" style={{width:`${data.totals.income?100:0}%`}}/></div><div className="metric-note">{data.currency} · {periodName(data.month)}</div></article>
          <article className="metric-card"><div className="metric-header"><span>Gastos</span><span className="metric-icon orange-icon"><ArrowUpRight size={16}/></span></div><strong>{format.format(data.totals.expenses)}</strong><div className="metric-footer"><span className="metric-caption">Total gastado</span><span className="spend-ratio">{data.totals.income?Math.round(data.totals.expenses/data.totals.income*100):0}% de ingresos</span></div><div className="metric-track"><span className="track-orange" style={{width:`${data.totals.income?Math.min(data.totals.expenses/data.totals.income*100,100):0}%`}}/></div><div className="metric-note">En la moneda base · {data.currency}</div></article>
          <article className="metric-card"><div className="metric-header"><span>Disponible en cuentas</span><span className="metric-icon blue-icon"><WalletCards size={16}/></span></div><strong>{format.format(data.totals.accounts)}</strong><div className="metric-footer"><span className="trend-neutral"><Check size={13}/> {data.accounts.length} cuentas</span><span>en {data.currency}</span></div><div className="account-summary-line"><span>{data.accounts.length} cuentas conectadas</span><span>{data.excludedCurrencyCount?`${data.excludedCurrencyCount} mov. en otra moneda`:'Conexión segura'}</span></div></article>
        </section>
        <section className="chart-grid">
          <article className="panel cashflow-panel" id="cashflow"><div className="panel-heading"><div><span className="panel-kicker">TENDENCIA</span><h2>Así se mueve tu dinero</h2><p>Ingresos y gastos {range==='week'?'en la última semana':'a lo largo del mes'}</p></div><div className="chart-actions"><div className="segmented-control"><button className={range==='week'?'active':''} onClick={()=>refresh(selectedPeriod,'week')}>Semana</button><button className={range==='month'?'active':''} onClick={()=>refresh(selectedPeriod,'month')}>Mes</button></div><button className="more-button" aria-label="Más opciones"><Ellipsis size={18}/></button></div></div><CashflowChart data={data} range={range}/><div className="panel-bottom"><span><i className="legend-dot green-dot"/> {connected?'Datos de Wallet':'Ejemplo visual'} <b>{data.currency}</b></span><span className="bottom-meta"><Clock3 size={12}/> {connected?'Actualizado':'Vista previa'}</span></div></article>
          <article className="panel category-panel" id="categories"><div className="panel-heading"><div><span className="panel-kicker">A DÓNDE VA</span><h2>En qué se reparte</h2><p>Gastos por categoría</p></div><button className="more-button" aria-label="Opciones de categorías"><Ellipsis size={18}/></button></div><div className="category-total"><strong>{format.format(data.totals.expenses)}</strong><span>total de gastos</span><span className="category-period">{data.currency}</span></div><CategoryFlowChart data={data} range={range}/><div className="category-legend">{data.categories.slice(0,4).map((category)=><span key={category.name}><i style={{background:category.color}}/>{category.name}</span>)}</div><div className="category-list">{data.categories.slice(0,4).map((category)=><div className="category-row" key={category.name}><span className="category-name"><i style={{background:category.color}}/>{category.name}</span><b>{format.format(category.value)}</b><small>{categoriesTotal?Math.round(category.value/categoriesTotal*100):0}%</small></div>)}</div><a className="panel-link" href="#activity">Ver movimientos <ArrowRight size={13}/></a></article>
        </section>
        <section className="lower-grid">
          <article className="panel activity-panel" id="activity"><div className="panel-heading"><div><span className="panel-kicker">LO ÚLTIMO</span><h2>Movimientos recientes</h2></div><button className="panel-link-button" onClick={()=>refresh(selectedPeriod,range)}>Actualizar <RefreshCw size={13}/></button></div>{data.recent.length?<div className="transaction-list">{data.recent.slice(0,5).map((item)=><div className="transaction-row" key={item.id}><span className={`transaction-symbol ${item.amount>=0?'symbol-income':''}`}>{item.amount>=0?'↗':'↙'}</span><span className="transaction-details"><b>{item.name}</b><small>{formatDate(item.date)} · {item.category}</small></span><span className={`transaction-amount ${item.amount>=0?'positive-amount':''}`}>{item.amount>=0?'+':'−'} {numberFormat(item.currency).format(Math.abs(item.amount))}</span></div>)}</div>:<div className="empty-state"><List size={20}/><span>No hay movimientos para este periodo.</span></div>}<a className="panel-link" href="#cashflow">Ver actividad del periodo <ArrowRight size={13}/></a></article>
          <article className="panel accounts-panel" id="accounts"><div className="panel-heading"><div><span className="panel-kicker">TUS CUENTAS</span><h2>Todo en un vistazo</h2></div><button className="more-button" aria-label="Opciones de cuentas"><Ellipsis size={18}/></button></div><div className="available-balance"><span>Total disponible en {data.currency}</span><strong>{format.format(data.totals.accounts)}</strong></div><div className="accounts-list">{data.accounts.slice(0,4).map((account,index)=><div className="account-row" key={account.id}><span className={`account-icon account-color-${index%4}`}><WalletCards size={16}/></span><span className="account-details"><b>{account.name}</b><small>{account.institution}</small></span><span className="account-balance">{numberFormat(account.currency).format(account.balance)}</span></div>)}</div><div className="accounts-foot"><span><i className="legend-dot green-dot"/> {data.accounts.length} cuentas sincronizadas</span><span><ShieldCheck size={12}/> Solo lectura</span></div></article>
        </section>
        <footer className="app-footer"><span>Hecho para ver lo importante. <Sparkles size={12}/></span><span>{connected?'Conectado con Wallet by BudgetBakers':'Bolsillo · datos de demostración'}</span></footer>
      </div>
    </main>
  </div>;
}



