import type { DashboardData } from './wallet';

const categories = [
  { name: 'Hogar', value: 820000, color: '#75c900' },
  { name: 'Alimentación', value: 680000, color: '#3b82f6' },
  { name: 'Transporte', value: 485000, color: '#f5a623' },
  { name: 'Salud', value: 375000, color: '#e23d35' },
  { name: 'Ocio', value: 320000, color: '#a855f7' },
];
const names = categories.map((category) => category.name);
const bars = [
  [78, 52, 21, 15, 14, 8, 8], [94, 44, 15, 17, 18, 9, 2], [66, 38, 13, 10, 9, 8, 4],
  [81, 61, 16, 14, 13, 10, 8], [100, 57, 24, 12, 10, 7, 4], [34, 22, 9, 8, 7, 5, 3], [5, 3, 1, 1, 0, 0, 1],
];
const colors = ['#75c900','#3b82f6','#f5a623','#e23d35','#a855f7'];
export function getDemoDashboard(month = '2026-10', range: 'week' | 'month' = 'month', fromDate?: string, toDate?: string): DashboardData {
  void range;
  const from = fromDate || month + '-01';
  const currentMonth = new Date().toISOString().slice(0,7) === month;
  const defaultTo = currentMonth ? new Date().toISOString().slice(0,10) : new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10);
  const to = toDate || defaultTo;
  const startDay = Date.parse(from + 'T00:00:00Z'), endDay = Date.parse(to + 'T00:00:00Z');
  const flow = [];
  for(let timestamp=startDay,index=0;timestamp<=endDay;timestamp+=86400000,index++){
    const date=new Date(timestamp), source=bars[index%bars.length];
    const label=new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(timestamp+43200000)).replace('.','');
    const point: DashboardData['flow'][number] = {label,income:source[0]*10000,expenses:source[1]*10000};
    names.forEach((name,categoryIndex)=>{point[name]=source[categoryIndex+2]*10000;});
    flow.push(point);
  }
  month=from.slice(0,7);
  const recent: DashboardData['recent'] = [
    {id:'m1',name:'Arriendo',category:'Hogar',date:`${month}-25T08:00:00Z`,amount:-1200000,currency:'COP',type:'expense',accountId:'a1',accountName:'Cuenta principal'},
    {id:'m2',name:'Pago de nómina',category:'Ingresos',date:`${month}-24T12:00:00Z`,amount:5800000,currency:'COP',type:'income',accountId:'a1',accountName:'Cuenta principal'},
    {id:'m3',name:'Mercado local',category:'Alimentación',date:`${month}-24T09:00:00Z`,amount:-186400,currency:'COP',type:'expense',accountId:'a2',accountName:'Ahorros'},
    {id:'m4',name:'Café con Laura',category:'Ocio',date:`${month}-23T15:00:00Z`,amount:-32000,currency:'COP',type:'expense',accountId:'a3',accountName:'Efectivo'},
  ];
  return {
    month,dateFrom:from,dateTo:to,currency:'COP',totals:{income:6250000,expenses:3405000,balance:2845000,accounts:12640500},flow,
    categories,categoryNames:names,recent,accountFlows:[{fromId:'a1',fromName:'Cuenta principal',toId:'a2',toName:'Ahorros',value:650000,count:3,currency:'COP'},{fromId:'a2',fromName:'Ahorros',toId:'a3',toName:'Efectivo',value:120000,count:1,currency:'COP'}],
    accounts:[
      {id:'a1',name:'Cuenta principal',institution:'Bancolombia',balance:8250000,currency:'COP'},
      {id:'a2',name:'Ahorros',institution:'Nu',balance:3840500,currency:'COP'},
      {id:'a3',name:'Efectivo',institution:'En mano',balance:350000,currency:'COP'},
    ],excludedCurrencyCount:0,syncedAt:new Date().toISOString(),
  };
}
