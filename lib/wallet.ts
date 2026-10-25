import 'server-only';

export type FlowPoint = { label: string; income: number; expenses: number; [key: string]: number | string };
export type DashboardData = {
  month: string; currency: string;
  totals: { income: number; expenses: number; balance: number; accounts: number };
  flow: FlowPoint[];
  categories: { name: string; value: number; color: string }[];
  categoryNames: string[];
  recent: { id: string; name: string; category: string; date: string; amount: number; currency: string; type: string }[];
  accounts: { id: string; name: string; institution: string; balance: number; currency: string }[];
  excludedCurrencyCount: number; syncedAt: string;
};
type Amount = { value?: number | string; currencyCode?: string } | number | string | null;
type Named = { name?: string; customName?: string } | string | null;
type WalletRecord = { id?: string; recordDate?: string; counterParty?: string; amount?: Amount; recordType?: string; category?: Named };
type WalletAccount = { id?: string; name?: string; customName?: string; institutionName?: string; bankName?: string; currencyCode?: string; currentBalance?: Amount; balance?: Amount; amount?: Amount };
type Page<T> = { records?: T[]; accounts?: T[]; nextOffset?: number | null };
const COLORS = ['#75c900','#3b82f6','#f5a623','#e23d35','#a855f7'];
const baseCurrency = () => process.env.WALLET_BASE_CURRENCY || 'COP';

export class WalletApiError extends Error {
  constructor(message: string, public status: number, public code: string) { super(message); this.name = 'WalletApiError'; }
}
function valueOf(amount: Amount | undefined): number {
  const raw = typeof amount === 'object' && amount !== null ? amount.value : amount;
  const value = Number(raw ?? 0); return Number.isFinite(value) ? value : 0;
}
function nameOf(value: Named | undefined, fallback: string): string {
  if (typeof value === 'string') return value;
  return value?.name || value?.customName || fallback;
}
async function walletGet<T>(path: string, params: URLSearchParams): Promise<T> {
  const token = process.env.WALLET_API_TOKEN;
  if (!token) throw new WalletApiError('Falta configurar el token de Wallet.',503,'missing_token');
  const response = await fetch(`https://rest.budgetbakers.com/wallet/v1/api/${path}?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, cache: 'no-store',
  });
  const body = await response.json().catch(() => ({})) as { message?: string; error?: string };
  if (!response.ok) throw new WalletApiError(body.message || body.error || `Wallet respondió ${response.status}.`,response.status,response.status===409?'initial_sync':response.status===401?'invalid_token':'wallet_api_error');
  return body as T;
}
function periodDates(period?: string) {
  const month = period && /^\d{4}-(0[1-9]|1[0-2])$/.test(period) ? period : new Date().toISOString().slice(0,7);
  const [year, monthNumber] = month.split('-').map(Number);
  return { month, from: `${month}-01`, to: new Date(Date.UTC(year,monthNumber,1)).toISOString().slice(0,10) };
}
async function getRecords(from: string, to: string) {
  const rows: WalletRecord[] = []; let offset: number | undefined = 0;
  while (offset !== undefined && rows.length < 1000) {
    const params = new URLSearchParams({limit:'200',sortBy:'-recordDate'});
    params.append('recordDate',`gte.${from}`); params.append('recordDate',`lt.${to}`);
    if (offset > 0) params.set('offset',String(offset));
    const page = await walletGet<Page<WalletRecord>>('records',params);
    rows.push(...(page.records || [])); offset = page.nextOffset ?? undefined;
  }
  return rows;
}

export async function getWalletDashboard(period?: string, range: 'week' | 'month' = 'week'): Promise<DashboardData> {
  const dates = periodDates(period);
  const [records, accountPage] = await Promise.all([
    getRecords(dates.from,dates.to), walletGet<Page<WalletAccount>>('accounts',new URLSearchParams({limit:'200'})),
  ]);
  const currency = baseCurrency();
  const currencyMismatchCount = records.filter((r) => {
    const recordCurrency = typeof r.amount === 'object' && r.amount ? r.amount.currencyCode : currency;
    return Boolean(recordCurrency && recordCurrency !== currency);
  }).length;
  const included = records.filter((r) => {
    const recordCurrency = typeof r.amount === 'object' && r.amount ? r.amount.currencyCode : currency;
    return (recordCurrency || currency) === currency && r.recordType !== 'transfer';
  });
  let income = 0, expenses = 0;
  const categorySums = new Map<string,number>();
  for (const record of included) {
    const amount = valueOf(record.amount), type = record.recordType?.toLowerCase();
    if (type === 'income' || (type !== 'expense' && amount > 0)) income += Math.abs(amount);
    else if (type === 'expense' || amount < 0) {
      expenses += Math.abs(amount); const key = nameOf(record.category,'Sin categoría');
      categorySums.set(key,(categorySums.get(key)||0)+Math.abs(amount));
    }
  }
  const categories = [...categorySums.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5)
    .map(([name,value],index)=>({name,value,color:COLORS[index%COLORS.length]}));
  const categoryNames = categories.map((item)=>item.name);
  const buckets = new Map<string,FlowPoint>();
  const [year,monthNumber] = dates.month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year,monthNumber,0)).getUTCDate();
  if (range === 'week') {
    const today = new Date(), current = today.getUTCFullYear()===year && today.getUTCMonth()+1===monthNumber;
    const last = current ? today.getUTCDate() : lastDay;
    for(let day=Math.max(1,last-6);day<=last;day++){
      const date=`${dates.month}-${String(day).padStart(2,'0')}`;
      buckets.set(date,{label:new Intl.DateTimeFormat('es-CO',{weekday:'short',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`)).replace('.',''),income:0,expenses:0});
    }
  } else {
    for(let week=1;week<=Math.ceil(lastDay/7);week++) buckets.set(`week-${week}`,{label:`Sem ${week}`,income:0,expenses:0});
  }
  for(const category of categoryNames) for(const bucket of buckets.values()) bucket[category]=0;
  for(const record of included){
    if(!record.recordDate) continue;
    const date=record.recordDate.slice(0,10), key=range==='week'?date:`week-${Math.floor((Number(date.slice(8,10))-1)/7)+1}`;
    const bucket=buckets.get(key); if(!bucket) continue;
    const amount=valueOf(record.amount), type=record.recordType?.toLowerCase();
    if(type==='income'||(type!=='expense'&&amount>0)) bucket.income+=Math.abs(amount);
    else if(type==='expense'||amount<0){bucket.expenses+=Math.abs(amount);const category=nameOf(record.category,'Sin categoría');if(categoryNames.includes(category))bucket[category]=Number(bucket[category]||0)+Math.abs(amount);}
  }
  const accounts=(accountPage.accounts||[]).map((a,index)=>{
    const accountCurrency=a.currencyCode||(a.balance&&typeof a.balance==='object'?a.balance.currencyCode:undefined)||currency;
    return {id:a.id||`account-${index}`,name:nameOf(a,'Cuenta'),institution:a.institutionName||a.bankName||'Wallet',balance:valueOf(a.currentBalance??a.balance??a.amount),currency:accountCurrency};
  });
  const recent=[...records].sort((a,b)=>(b.recordDate||'').localeCompare(a.recordDate||'')).map((r,index)=>({
    id:r.id||`record-${index}`,name:r.counterParty||'Movimiento',category:nameOf(r.category,'Sin categoría'),date:r.recordDate||'',amount:valueOf(r.amount),
    currency:typeof r.amount==='object'&&r.amount?.currencyCode?r.amount.currencyCode:currency,type:r.recordType||'expense',
  }));
  return {month:dates.month,currency,totals:{income,expenses,balance:income-expenses,accounts:accounts.filter(a=>a.currency===currency).reduce((sum,a)=>sum+a.balance,0)},flow:[...buckets.values()],categories,categoryNames,recent,accounts,excludedCurrencyCount:currencyMismatchCount,syncedAt:new Date().toISOString()};
}



