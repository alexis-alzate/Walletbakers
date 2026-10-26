'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DashboardData } from '@/lib/wallet';

const currencyFormatter = (currency:string) => new Intl.NumberFormat('es-CO',{style:'currency',currency,maximumFractionDigits:0});
function compactNumber(value:number){
  const absolute=Math.abs(value);
  if(absolute>=1000000)return (value/1000000).toFixed(1)+' M';
  if(absolute>=1000)return (value/1000).toFixed(1)+' mil';
  return String(Math.round(value));
}
export type ChartBarSelection = { date: string; kind: 'income'|'expense'; category?: string };
type Props = { data: DashboardData; range: 'week'|'month'; onBarClick?: (selection: ChartBarSelection) => void };
export function CashflowChart({data,onBarClick}:Props){
  const format=currencyFormatter(data.currency);
  return <div className="chart-area cashflow-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.flow} margin={{top:8,right:2,left:-18,bottom:0}} barGap={5}>
    <CartesianGrid vertical={false} stroke="#222a27" strokeDasharray="0"/>
    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill:'#858f89',fontSize:data.flow.length>20?9:10}} interval={data.flow.length>20?2:0} dy={9}/>
    <YAxis axisLine={false} tickLine={false} tick={{fill:'#737e77',fontSize:10}} tickFormatter={compactNumber}/>
    <Tooltip cursor={{fill:'#ffffff08'}} formatter={(value)=>format.format(Number(value))} contentStyle={{background:'#171d1a',border:'1px solid #313b35',borderRadius:8,color:'#eef2ed',fontSize:12}} labelStyle={{color:'#9aa69d'}}/>
    <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11,color:'#a7b0aa',paddingTop:12}}/>
    <Bar name="Ingresos" dataKey="income" fill="#75c900" radius={[4,4,0,0]} maxBarSize={25} cursor="pointer" onClick={(item)=>{const date=item.payload?.date;if(typeof date==='string')onBarClick?.({date,kind:'income'});}}/>
    <Bar name="Gastos" dataKey="expenses" fill="#f97316" radius={[4,4,0,0]} maxBarSize={25} cursor="pointer" onClick={(item)=>{const date=item.payload?.date;if(typeof date==='string')onBarClick?.({date,kind:'expense'});}}/>
  </BarChart></ResponsiveContainer></div>;
}
export function CategoryFlowChart({data,onBarClick}:Props){
  const format=currencyFormatter(data.currency);
  return <div className="chart-area category-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.flow} margin={{top:8,right:0,left:-22,bottom:0}} barCategoryGap="35%">
    <CartesianGrid vertical={false} stroke="#222a27"/>
    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill:'#858f89',fontSize:data.flow.length>20?9:10}} interval={data.flow.length>20?2:0} dy={8}/>
    <YAxis axisLine={false} tickLine={false} tick={{fill:'#737e77',fontSize:9}} tickFormatter={compactNumber}/>
    <Tooltip formatter={(value)=>format.format(Number(value))} contentStyle={{background:'#171d1a',border:'1px solid #313b35',borderRadius:8,color:'#eef2ed',fontSize:11}} labelStyle={{color:'#9aa69d'}}/>
    {data.categoryNames.map((name,index)=><Bar key={name} dataKey={name} fill={data.categories[index]?.color||'#75c900'} radius={index===data.categoryNames.length-1?[3,3,0,0]:0} maxBarSize={32} cursor="pointer" onClick={(item)=>{const date=item.payload?.date;if(typeof date==='string')onBarClick?.({date,kind:'expense',category:name});}}/>)}
  </BarChart></ResponsiveContainer></div>;
}