'use client';

import { BarChart3, ChevronDown, CircleHelp, CreditCard, LayoutGrid, List, Menu, Settings, Sparkles, Target, Wallet, X } from 'lucide-react';

type Props = { open: boolean; onClose: () => void; connected: boolean };
const mainLinks = [
  {label:'Resumen',href:'#overview',icon:LayoutGrid},
  {label:'Flujo de caja',href:'#cashflow',icon:BarChart3},
  {label:'Categorías',href:'#categories',icon:List},
  {label:'Movimientos',href:'#activity',icon:Wallet},
];
const manageLinks = [
  {label:'Cuentas',href:'#accounts',icon:CreditCard},
  {label:'Metas',href:'#goals',icon:Target},
];
export function Sidebar({open,onClose,connected}:Props){
  return <>
    {open && <button className="mobile-scrim" aria-label="Cerrar navegación" onClick={onClose}/>}
    <aside className={`sidebar ${open?'sidebar-open':''}`}>
      <div className="sidebar-top"><a className="brand" href="#overview" onClick={onClose}><span className="brand-mark">b<span>·</span></span><span>bolsillo</span></a><button className="sidebar-close" aria-label="Cerrar menú" onClick={onClose}><X size={18}/></button></div>
      <button className="workspace-switch"><span className="workspace-avatar">Z</span><span className="workspace-copy"><b>Mi espacio</b><small>Finanzas personales</small></span><ChevronDown size={15}/></button>
      <div className="nav-label">TU DINERO</div>
      <nav className="nav-group" aria-label="Tu dinero">{mainLinks.map(({label,href,icon:Icon},index)=><a key={href} href={href} className={`nav-link ${index===0?'selected':''}`} onClick={onClose}><Icon size={17}/><span>{label}</span>{index===0&&<span className="nav-index">01</span>}</a>)}</nav>
      <div className="nav-label nav-label-second">GESTIÓN</div>
      <nav className="nav-group" aria-label="Gestión">{manageLinks.map(({label,href,icon:Icon})=><a key={href} href={href} className="nav-link" onClick={onClose}><Icon size={17}/><span>{label}</span></a>)}</nav>
      <div className="sidebar-spacer"/>
      <div className="connection-card"><span className={`connection-indicator ${connected?'is-live':''}`}/><span className="connection-copy"><b>{connected?'Wallet sincronizado':'Wallet desconectado'}</b><small>{connected?'Lectura segura activa':'Conecta tu token API'}</small></span><ChevronDown size={14}/></div>
      <button className="nav-link muted-link"><Settings size={16}/><span>Preferencias</span></button>
      <button className="nav-link muted-link"><CircleHelp size={16}/><span>Ayuda</span></button>
      <div className="user-card"><span className="user-avatar">ZA</span><span className="workspace-copy"><b>Zaeta</b><small>Finanzas personales</small></span><ChevronDown size={15}/></div>
      <div className="sidebar-footer"><Sparkles size={13}/> Bolsillo · Tu dinero, a tu manera</div>
    </aside>
  </>;
}
export function MobileMenu({onClick}:{onClick:()=>void}){return <button className="mobile-menu" aria-label="Abrir menú" onClick={onClick}><Menu size={19}/></button>}

