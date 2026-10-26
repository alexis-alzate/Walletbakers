'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, Clock3, Download, List, LogOut, Maximize2, RefreshCw, Search, ShieldCheck, Sparkles, TrendingUp, WalletCards, X } from 'lucide-react';
import { Sidebar, MobileMenu } from '@/components/sidebar';
import { CashflowChart, CategoryFlowChart } from '@/components/finance-charts';
import type { ChartBarSelection } from '@/components/finance-charts';
import { AccountFlowChart } from '@/components/account-flow-chart';
import type { DashboardData } from '@/lib/wallet';
import { getDemoDashboard } from '@/lib/demo';

type Connection = 'connected'|'missing_token'|'invalid_token'|'initial_sync'|'wallet_api_error';
type Props = { initialData: DashboardData; initialConnection: Connection };
type ExpandedChartKind = 'cashflow'|'categories';

function ExpandedChartModal({kind,data,range,selection,onBarClick,onClearSelection,onClose}:{kind:ExpandedChartKind;data:DashboardData;range:'week'|'month';selection:ChartBarSelection|null;onBarClick:(selection:ChartBarSelection)=>void;onClearSelection:()=>void;onClose:()=>void}){
  const dialogRef=useRef<HTMLElement>(null);
  const title=kind==='cashflow'?'Ingresos y gastos':'Gastos por categoría';
  useEffect(()=>{
    const previousOverflow=document.body.style.overflow;
    const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
    document.body.style.overflow='hidden';dialogRef.current?.focus();
    const handleKey=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};
    window.addEventListener('keydown',handleKey);
    return ()=>{document.body.style.overflow=previousOverflow;window.removeEventListener('keydown',handleKey);previousFocus?.focus();};
  },[onClose]);
  return <div className="chart-lightbox" onMouseDown={(event)=>{if(event.target===event.currentTarget)onClose();}}><section ref={dialogRef} className="chart-lightbox-dialog" role="dialog" aria-modal="true" aria-labelledby="expanded-chart-title" tabIndex={-1}><div className="chart-lightbox-heading"><div><span className="panel-kicker">GRÁFICA AMPLIADA · {formatDateRange(data.dateFrom,data.dateTo)}</span><h2 id="expanded-chart-title">{title}</h2><p>{kind==='cashflow'?'Pulsa una barra para ver los movimientos de ese día':'Pulsa una barra para ver los gastos de esa categoría'}</p></div><button className="chart-close-button" onClick={onClose} aria-label="Cerrar gráfica ampliada"><X size={19}/></button></div><div className={'chart-lightbox-content '+(selection?'has-selection':'')}>{kind==='cashflow'?<CashflowChart data={data} range={range} onBarClick={onBarClick}/>:<CategoryFlowChart data={data} range={range} onBarClick={onBarClick}/>}{selection&&<ChartMovementDetails data={data} selection={selection} onClear={onClearSelection}/>}</div><div className="chart-lightbox-footer"><span>Datos de {data.currency}</span><span>Usa el cursor sobre las barras para ver los valores</span></div></section></div>;
}
function ChartMovementDetails({data,selection,onClear}:{data:DashboardData;selection:ChartBarSelection;onClear:()=>void}){  const [activeMovement,setActiveMovement]=useState<DashboardData['recent'][number]|null>(null);
  useEffect(()=>{
    if(!activeMovement)return;
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.stopPropagation();setActiveMovement(null);}};
    window.addEventListener('keydown',closeOnEscape,true);
    return ()=>window.removeEventListener('keydown',closeOnEscape,true);
  },[activeMovement]);
  const records=data.recent.filter((item)=>item.date.slice(0,10)===selection.date&&item.currency===data.currency&&!item.isTransfer&&(selection.kind==='income'?item.amount>0:item.amount<0)&&(!selection.category||item.category===selection.category));
  const title=selection.kind==='income'?'Ingresos':'Gastos';
  const total=records.reduce((sum,item)=>sum+Math.abs(item.amount),0);
  return <section className="chart-movement-details" aria-label={`Movimientos del día ${formatDate(selection.date)}`}>
    <div className="chart-movement-heading"><div><span className="panel-kicker">DETALLE DEL DÍA</span><h3>{formatDate(selection.date)} · {selection.category||title}</h3><p>{records.length} movimientos · {numberFormat(data.currency).format(total)}</p></div><button className="chart-clear-selection" onClick={onClear}>Quitar selección</button></div>
    {records.length?<div className="chart-movement-list">{records.map((item)=><button className="chart-movement-row" key={item.id} onClick={()=>setActiveMovement(item)} aria-label={`Ver detalle de ${item.name}`}><span className={`chart-movement-dot ${item.amount>0?'income-dot':'expense-dot'}`}/><span className="chart-movement-info"><b>{item.name}</b><small>{formatTime(item.date)} · {item.category} · {item.accountName}</small></span><strong className={item.amount>0?'positive-amount':''}>{item.amount>0?'+':'−'} {numberFormat(item.currency).format(Math.abs(item.amount))}</strong><ArrowRight className="chart-movement-open" size={15}/></button>)}</div>:<div className="chart-movement-empty">No hay movimientos de {title.toLowerCase()} asociados a esta barra.</div>}
    {activeMovement&&<div className="movement-card-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget)setActiveMovement(null);}}><article className="movement-detail-card" role="dialog" aria-modal="true" aria-labelledby="movement-card-title"><div className="movement-card-topline"><span className={`movement-card-icon ${activeMovement.amount>=0?'movement-card-income':'movement-card-expense'}`}>{activeMovement.amount>=0?<ArrowUpRight size={23}/>:<ArrowRight size={23}/>}</span><button className="chart-close-button movement-card-close" onClick={()=>setActiveMovement(null)} aria-label="Cerrar detalle"><X size={18}/></button></div><span className="panel-kicker">DETALLE DEL MOVIMIENTO</span><h3 id="movement-card-title">{movementTitle(activeMovement)}</h3><div className="movement-card-description"><span className="panel-kicker">¿QUÉ COMPRASTE?</span><p>{movementDescription(activeMovement)}</p></div><strong className={`movement-card-amount ${activeMovement.amount>=0?'positive-amount':''}`}>{activeMovement.amount>=0?'+':'−'} {numberFormat(activeMovement.currency).format(Math.abs(activeMovement.amount))}</strong><div className="movement-card-divider"/><dl className="movement-card-fields"><div><dt>Fecha y hora</dt><dd>{formatDate(activeMovement.date)} · {formatTime(activeMovement.date)}</dd></div><div><dt>Categoría</dt><dd>{translateWalletCategory(activeMovement.category)}</dd></div><div><dt>Cuenta</dt><dd>{activeMovement.accountName||'Sin cuenta'}</dd></div><div><dt>Tipo</dt><dd>{movementTypeLabel(activeMovement.type,activeMovement.amount)}</dd></div></dl></article></div>}  </section>;
}

function translateWalletCategory(category:string){
  const translations:Record<string,string>={'electronics & accessories':'Electrónica y accesorios','food & drinks':'Comida y bebidas','home & utilities':'Hogar y servicios','groceries':'Mercado','transportation':'Transporte','shopping':'Compras','health & beauty':'Salud y cuidado personal','restaurants':'Restaurantes','subscriptions':'Suscripciones','books, audio, subscriptions':'Libros, audio y suscripciones','other':'Otros'};
  return translations[category.trim().toLocaleLowerCase('en')]||category||'Sin categoría';
}
function movementTitle(item:DashboardData['recent'][number]){
  const name=item.name.trim();
  if(item.description)return item.description;
  if(name&&name.toLocaleLowerCase('es')!=='movimiento')return name;
  return translateWalletCategory(item.category);
}
function movementDescription(item:DashboardData['recent'][number]){
  if(item.description)return item.description;
  if(item.name&&item.name.toLocaleLowerCase('es')!=='movimiento')return item.name;
  return 'Wallet no envió el detalle del artículo para este movimiento.';
}
function movementTypeLabel(type:string,amount:number){
  const normalized=type.trim().toLocaleLowerCase('en');
  if(normalized==='income'||normalized==='ingreso')return 'Ingreso';
  if(normalized==='expense'||normalized==='gasto')return 'Gasto';
  if(normalized==='transfer'||normalized==='transferencia')return 'Transferencia';
  return amount>=0?'Ingreso':'Gasto';
}
const numberFormat = (currency:string) => new Intl.NumberFormat('es-CO',{style:'currency',currency,maximumFractionDigits:0});
function formatDateRange(from:string,to:string){const format=(date:string)=>new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));return format(from)+' – '+format(to);}
function formatDate(date:string){if(!date)return 'Sin fecha';return new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date));}
function formatTime(date:string){return new Intl.DateTimeFormat('es-CO',{hour:'2-digit',minute:'2-digit',timeZone:'America/Bogota'}).format(new Date(date));}
function connectionLabel(status:Connection){return status==='connected'?'Wallet conectado':status==='missing_token'?'Token pendiente':status==='invalid_token'?'Token inválido':status==='initial_sync'?'Sincronización inicial':'Revisar conexión';}
function statusMessage(status:Connection){return status==='missing_token'?'Añade WALLET_API_TOKEN en las variables del servidor.':status==='invalid_token'?'Wallet rechazó el token. Revisa la variable WALLET_API_TOKEN en Vercel.':status==='initial_sync'?'Wallet está sincronizando la primera conexión. Espera un momento y actualiza.':status==='wallet_api_error'?'Wallet no respondió a la consulta. Conservamos los últimos datos visibles.':'';}

export function Dashboard({initialData,initialConnection}:Props){
  const [data,setData]=useState(initialData);
  const [connection,setConnection]=useState(initialConnection);
  const [selectedPeriod,setSelectedPeriod]=useState(initialData.month);
  const range:'week'|'month'='month';
  const [dateFrom,setDateFrom]=useState(initialData.dateFrom);
  const [dateTo,setDateTo]=useState(initialData.dateTo);
  const [loading,setLoading]=useState(false);
  const [hasLiveData,setHasLiveData]=useState(initialConnection==='connected');
  const [menuOpen,setMenuOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [activeSection,setActiveSection]=useState('overview');
  const [selectedAccount,setSelectedAccount]=useState<{id:string;name:string}|null>(null);
  const [selectedCategory,setSelectedCategory]=useState<string|null>(null);
  const [selectedChartBar,setSelectedChartBar]=useState<ChartBarSelection|null>(null);
  const [expandedChart,setExpandedChart]=useState<ExpandedChartKind|null>(null);
  const closeExpandedChart=useCallback(()=>setExpandedChart(null),[]);
  const connected=connection==='connected';
  const format=numberFormat(data.currency);
  const categoriesTotal=data.categories.reduce((sum,category)=>sum+category.value,0);
  const invalidDateRange=dateFrom>dateTo;
  const selectedDateRange=formatDateRange(data.dateFrom,data.dateTo);
  const visibleTransactions=useMemo(()=>{
    const search=query.trim().toLocaleLowerCase('es-CO');
    return data.recent.filter((item)=>{
      const matchesSearch=!search||[item.name,item.category,item.type,item.date,item.accountName].join(' ').toLocaleLowerCase('es-CO').includes(search);
      const matchesChartBar=!selectedChartBar||(item.date.slice(0,10)===selectedChartBar.date&&item.currency===data.currency&&!item.isTransfer&&(selectedChartBar.kind==='income'?item.amount>0:item.amount<0)&&(!selectedChartBar.category||item.category===selectedChartBar.category));
      return matchesSearch&&matchesChartBar&&(!selectedAccount||item.accountId===selectedAccount.id)&&(!selectedCategory||item.category===selectedCategory);
    });
  },[data.recent,query,selectedAccount,selectedCategory,selectedChartBar]);

  useEffect(()=>{
    const sections=['cashflow','categories','account-flow','activity','accounts'].map((id)=>document.getElementById(id)).filter((node):node is HTMLElement=>Boolean(node));
    const observer=new IntersectionObserver((entries)=>{
      const current=entries.filter((entry)=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(current)setActiveSection(current.target.id);
    },{rootMargin:'-12% 0px -68% 0px',threshold:[0,.2,.5]});
    sections.forEach((section)=>observer.observe(section));
    return ()=>observer.disconnect();
  },[]);

  function filterByAccount(id:string,name:string){
    setSelectedAccount({id,name});setSelectedCategory(null);setSelectedChartBar(null);document.getElementById('activity')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function filterByCategory(name:string){
    setSelectedCategory((current)=>current===name?null:name);setSelectedAccount(null);setSelectedChartBar(null);document.getElementById('activity')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function filterByChartBar(selection:ChartBarSelection,insideModal=false){
    setSelectedChartBar(selection);setSelectedAccount(null);setSelectedCategory(null);
    if(!insideModal)document.getElementById('activity')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function refresh(period=selectedPeriod,nextRange=range,from=dateFrom,to=dateTo){
    setLoading(true);
    try{
      const response=await fetch('/api/dashboard?period='+encodeURIComponent(period)+'&range='+nextRange+'&from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to),{cache:'no-store'});
      const result=await response.json();
      if(!response.ok){
        if(response.status===401){window.location.assign('/');return;}
        const code=(result.code||'wallet_api_error') as Connection;
        setConnection(code);
        if(!hasLiveData){setData(getDemoDashboard(period,nextRange,from,to));setSelectedPeriod(from.slice(0,7));}
        return;
      }
      setData(result as DashboardData);setSelectedPeriod(from.slice(0,7));setConnection('connected');setHasLiveData(true);
    }catch{
      setConnection('wallet_api_error');
      if(!hasLiveData){setData(getDemoDashboard(period,nextRange,from,to));setSelectedPeriod(from.slice(0,7));}
    }finally{setLoading(false);}
  }

  function exportTransactions(){
    const escape=(value:string)=>'"'+value.replace(/"/g,'""')+'"';
    const rows=[
      ['Fecha','Movimiento','Categoría','Tipo','Valor','Moneda'],
      ...visibleTransactions.map((item)=>[item.date,item.name,item.category,item.type,String(item.amount),item.currency]),
    ];
    const csv='\uFEFF'+rows.map((row)=>row.map((value)=>escape(String(value))).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');
    link.href=url;link.download='bolsillo-movimientos-'+dateFrom+'-'+dateTo+'.csv';link.click();URL.revokeObjectURL(url);
  }

  async function logout(){
    await fetch('/api/auth/logout',{method:'POST'});
    window.location.assign('/');
  }

  return <div className="app-shell">
    <Sidebar open={menuOpen} onClose={()=>setMenuOpen(false)} connected={connected} activeSection={activeSection} onNavigate={setActiveSection}/>
    <main className="main-content" id="overview">
      <header className="topbar">
        <div className="topbar-left"><MobileMenu onClick={()=>setMenuOpen(true)}/><div className="breadcrumbs"><span>Mi espacio</span><span className="crumb-sep">/</span><b>Resumen</b></div></div>
        <div className="topbar-actions">
          <div className={'connection-pill '+(connected?'connected':'')}><span className="status-dot"/>{connectionLabel(connection)}</div>
          <button className="session-button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={logout}><LogOut size={15}/><span>Salir</span></button>
        </div>
      </header>
      <div className="page-wrap">
        <section className="page-heading">
          <div><div className="eyebrow"><Sparkles size={13}/> TU RESUMEN FINANCIERO</div><h1>Tu dinero, <em>en perspectiva.</em></h1><p>Elige las fechas y revisa cada día cuánto dinero entró y cuánto salió.</p></div>
          <div className="heading-controls">
            <div className="date-range-controls"><label className="date-filter-field"><span>Desde</span><input type="date" value={dateFrom} max={dateTo} onChange={(event)=>setDateFrom(event.target.value)} /></label><label className="date-filter-field"><span>Hasta</span><input type="date" value={dateTo} min={dateFrom} onChange={(event)=>setDateTo(event.target.value)} /></label><button className="refresh-button apply-date-button" onClick={()=>refresh(dateFrom.slice(0,7),'month',dateFrom,dateTo)} disabled={loading||invalidDateRange} aria-label="Aplicar rango de fechas"><RefreshCw size={15} className={loading?'spin':''}/><span>{loading?'Actualizando':'Aplicar fechas'}</span></button></div>
            {invalidDateRange&&<span className="date-range-error" role="alert">La fecha inicial debe ser anterior a la fecha final.</span>}
          </div>
        </section>
        {!connected&&<div className={'notice '+(connection==='missing_token'?'notice-info':'notice-warning')} role="status"><span className="notice-icon">{connection==='missing_token'?'i':'!'}</span><span><b>{connection==='missing_token'?'Viendo datos de muestra':connectionLabel(connection)}</b><small>{statusMessage(connection)}</small></span><button onClick={()=>refresh()} disabled={loading}>Reintentar</button></div>}
        <section className="metric-grid" aria-label={"Resumen del " + selectedDateRange}>
          <article className="metric-card balance-card"><div className="metric-header"><span>Balance del periodo</span><span className="metric-icon"><TrendingUp size={16}/></span></div><strong>{format.format(data.totals.balance)}</strong><div className="metric-footer"><span className="trend-positive"><ArrowUpRight size={14}/> Neto</span><span>ingresos menos gastos</span></div></article>
          <article className="metric-card"><div className="metric-header"><span>Ingresos</span><span className="metric-icon green-icon"><ArrowUpRight size={16}/></span></div><strong>{format.format(data.totals.income)}</strong><div className="metric-footer"><span className="metric-caption">Total recibido</span></div><div className="metric-track"><span className="track-green" style={{width:(data.totals.income?100:0)+'%'}}/></div><div className="metric-note">{data.currency} · {selectedDateRange}</div></article>
          <article className="metric-card"><div className="metric-header"><span>Gastos</span><span className="metric-icon orange-icon"><ArrowUpRight size={16}/></span></div><strong>{format.format(data.totals.expenses)}</strong><div className="metric-footer"><span className="metric-caption">Total gastado</span><span className="spend-ratio">{data.totals.income?Math.round(data.totals.expenses/data.totals.income*100):0}% de ingresos</span></div><div className="metric-track"><span className="track-orange" style={{width:(data.totals.income?Math.min(data.totals.expenses/data.totals.income*100,100):0)+'%'}}/></div><div className="metric-note">En moneda base · {data.currency}</div></article>
          <article className="metric-card"><div className="metric-header"><span>Disponible en cuentas</span><span className="metric-icon blue-icon"><WalletCards size={16}/></span></div><strong>{format.format(data.totals.accounts)}</strong><div className="metric-footer"><span className="trend-neutral"><Check size={13}/> {data.accounts.length} cuentas</span><span>en {data.currency}</span></div><div className="account-summary-line"><span>{data.accounts.length} cuentas conectadas</span><span>{data.excludedCurrencyCount?data.excludedCurrencyCount+' mov. en otra moneda':'Todas sincronizadas'}</span></div></article>
        </section>
        <section className="chart-grid">
          <article className="panel cashflow-panel" id="cashflow">
            <div className="panel-heading"><div><span className="panel-kicker">TENDENCIA</span><h2>Ingresos y gastos</h2><p>Una barra por día · {selectedDateRange}</p></div>
              <div className="chart-actions"><button className="chart-expand-button" onClick={()=>setExpandedChart('cashflow')} aria-label="Ampliar gráfica de flujo de caja" title="Ampliar gráfica"><Maximize2 size={15}/><span>Ampliar</span></button></div>
            </div>
            <CashflowChart data={data} range={range} onBarClick={(selection)=>filterByChartBar(selection)}/>
            <div className="panel-bottom"><span><i className="legend-dot green-dot"/> {connected?'Datos de Wallet':'Ejemplo visual'} <b>{data.currency}</b></span><span className="bottom-meta"><Clock3 size={12}/> {connected?'Consulta '+formatTime(data.syncedAt):'Vista previa'}</span></div>
          </article>
          <article className="panel category-panel" id="categories">
            <div className="panel-heading"><div><span className="panel-kicker">A DÓNDE VA</span><h2>Gastos por categoría</h2><p>Por día · {selectedDateRange}</p></div><button className="chart-expand-button" onClick={()=>setExpandedChart('categories')} aria-label="Ampliar gráfica de gastos por categoría" title="Ampliar gráfica"><Maximize2 size={15}/><span>Ampliar</span></button></div>
            <div className="category-total"><strong>{format.format(data.totals.expenses)}</strong><span>total de gastos</span><span className="category-period">{data.currency}</span></div>
            <CategoryFlowChart data={data} range={range} onBarClick={(selection)=>filterByChartBar(selection)}/>
            <div className="category-legend">{data.categories.slice(0,4).map((category)=><span key={category.name}><i style={{background:category.color}}/>{category.name}</span>)}</div>
            <div className="category-list">{data.categories.slice(0,5).map((category)=><button className={"category-row category-filter "+(selectedCategory===category.name?"category-filter-active":"")} key={category.name} aria-pressed={selectedCategory===category.name} onClick={()=>filterByCategory(category.name)}><span className="category-name"><i style={{background:category.color}}/>{category.name}</span><b>{format.format(category.value)}</b><small>{categoriesTotal?Math.round(category.value/categoriesTotal*100):0}%</small></button>)}</div>
            <a className="panel-link" href="#activity">Ver movimientos <ArrowRight size={13}/></a>
          </article>
        </section>
        <AccountFlowChart flows={data.accountFlows} currency={data.currency} onAccountSelect={filterByAccount}/>
        <section className="lower-grid">
          <article className="panel activity-panel" id="activity">
            <div className="panel-heading"><div><span className="panel-kicker">ACTIVIDAD</span><h2>Movimientos del periodo</h2><p>{visibleTransactions.length} de {data.recent.length} movimientos · {selectedDateRange}</p>{(selectedAccount||selectedCategory||selectedChartBar)&&<button className="filter-chip" onClick={()=>{setSelectedAccount(null);setSelectedCategory(null);setSelectedChartBar(null);}}>Filtro: {selectedAccount?.name||selectedCategory||(selectedChartBar?formatDate(selectedChartBar.date)+' · '+(selectedChartBar.category|| (selectedChartBar.kind==='income'?'Ingresos':'Gastos')):'')} <span>×</span></button>}</div>
              <div className="activity-actions"><button className="csv-button" onClick={exportTransactions} disabled={!visibleTransactions.length}><Download size={14}/><span>Exportar CSV</span></button></div>
            </div>
            <label className="transaction-search"><Search size={14}/><input aria-label="Buscar movimientos" placeholder="Buscar por nombre, categoría o fecha" value={query} onChange={(event)=>setQuery(event.target.value)}/>{query&&<button type="button" aria-label="Limpiar búsqueda" onClick={()=>setQuery('')}>Limpiar</button>}</label>
            {visibleTransactions.length?<div className="transaction-list">{visibleTransactions.map((item)=><div className="transaction-row" key={item.id}><span className={'transaction-symbol '+(item.amount>=0?'symbol-income':'')}>{item.amount>=0?'↗':'↙'}</span><span className="transaction-details"><b>{item.name}</b><small>{formatDate(item.date)} · {item.category}</small></span><span className={'transaction-amount '+(item.amount>=0?'positive-amount':'')}>{item.amount>=0?'+':'−'} {numberFormat(item.currency).format(Math.abs(item.amount))}</span></div>)}</div>:<div className="empty-state"><List size={20}/><span>{query?'No encontramos movimientos con esa búsqueda.':'No hay movimientos para este periodo.'}</span></div>}
          </article>
          <article className="panel accounts-panel" id="accounts">
            <div className="panel-heading"><div><span className="panel-kicker">TUS CUENTAS</span><h2>Todo en un vistazo</h2><p>{data.accounts.length} cuentas desde Wallet</p></div></div>
            <div className="available-balance"><span>Total disponible en {data.currency}</span><strong>{format.format(data.totals.accounts)}</strong></div>
            <div className="accounts-list">{data.accounts.map((account,index)=><button className={"account-row account-row-button "+(selectedAccount?.id===account.id?"account-row-active":"")} key={account.id} onClick={()=>filterByAccount(account.id,account.name)} aria-pressed={selectedAccount?.id===account.id}><span className={'account-icon account-color-'+(index%4)}><WalletCards size={16}/></span><span className="account-details"><b>{account.name}</b><small>{account.institution} · {account.currency}</small></span><span className="account-balance">{numberFormat(account.currency).format(account.balance)}</span></button>)}</div>
            <div className="accounts-foot"><span><i className="legend-dot green-dot"/> {data.accounts.length} cuentas sincronizadas</span><span><ShieldCheck size={12}/> Solo lectura</span></div>
          </article>
        </section>
        <footer className="app-footer"><span>Hecho para ver lo importante. <Sparkles size={12}/></span><span>{connected?'Conectado con Wallet by BudgetBakers':'Bolsillo · datos de demostración'}</span></footer>
      </div>
    </main>
    {expandedChart&&<ExpandedChartModal kind={expandedChart} data={data} range={range} selection={selectedChartBar} onBarClick={(selection)=>filterByChartBar(selection,true)} onClearSelection={()=>setSelectedChartBar(null)} onClose={closeExpandedChart}/>}
  </div>;
}