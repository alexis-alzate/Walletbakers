'use client';

import { BarChart3, ChevronDown, CircleHelp, CreditCard, LayoutGrid, List, Menu, ShieldCheck, Sparkles, Wallet, X } from 'lucide-react';

type Props = { open: boolean; onClose: () => void; connected: boolean };
const links = [
  {label:'Resumen',href:'#overview',icon:LayoutGrid},
  {label:'Flujo de caja',href:'#cashflow',icon:BarChart3},
  {label:'Categorías',href:'#categories',icon:List},
  {label:'Movimientos',href:'#activity',icon:Wallet},
  {label:'Cuentas',href:'#accounts',icon:CreditCard},
];

export function Sidebar({open,onClose,connected}:Props){
  return <>
    {open && <button className="mobile-scrim" aria-label="Cerrar navegación" onClick={onClose}/>}
    <aside className={'sidebar '+(open?'sidebar-open':'')}>
      <div className="sidebar-top"><a className="brand" href="#overview" onClick={onClose}><span className="brand-mark">b<span>·</span></span><span>bolsillo</span></a><button className="sidebar-close" aria-label="Cerrar menú" onClick={onClose}><X size={18}/></button></div>
      <div className="workspace-switch"><span className="workspace-avatar">Z</span><span className="workspace-copy"><b>Mi espacio</b><small>Finanzas personales</small></span><ShieldCheck size={15}/></div>
      <div className="nav-label">TU DINERO</div>
      <nav className="nav-group" aria-label="Tu dinero">{links.map(({label,href,icon:Icon},index)=><a key={href} href={href} className={'nav-link '+(index===0?'selected':'')} onClick={onClose}><Icon size={17}/><span>{label}</span>{index===0&&<span className="nav-index">01</span>}</a>)}</nav>
      <div className="sidebar-spacer"/>
      <div className="connection-card"><span className={'connection-indicator '+(connected?'is-live':'')}/><span className="connection-copy"><b>{connected?'Wallet sincronizado':'Wallet desconectado'}</b><small>{connected?'Lectura segura activa':'Revisa la conexión del token'}</small></span></div>
      <a className="nav-link muted-link" href="https://web.budgetbakers.com/" target="_blank" rel="noreferrer"><Wallet size={16}/><span>Abrir Wallet</span></a>
      <a className="nav-link muted-link" href="https://rest.budgetbakers.com/wallet/reference" target="_blank" rel="noreferrer"><CircleHelp size={16}/><span>API y ayuda</span></a>
      <div className="user-card"><span className="user-avatar">ZA</span><span className="workspace-copy"><b>Zaeta</b><small>Finanzas personales</small></span></div>
      <div className="sidebar-footer"><Sparkles size={13}/> Bolsillo · Tu dinero, a tu manera</div>
    </aside>
  </>;
}
export function MobileMenu({onClick}:{onClick:()=>void}){return <button className="mobile-menu" aria-label="Abrir menú" onClick={onClick}><Menu size={19}/></button>}