import 'server-only';

export type FlowPoint = { date: string; label: string; income: number; expenses: number; [key: string]: number | string };
export type DashboardData = {
  month: string; dateFrom: string; dateTo: string; currency: string;
  totals: { income: number; expenses: number; balance: number; accounts: number };
  flow: FlowPoint[];
  categories: { name: string; value: number; color: string }[];
  categoryNames: string[];
  recent: { id: string; name: string; description?: string; category: string; date: string; amount: number; currency: string; type: string; accountId: string; accountName: string; isTransfer: boolean }[];
  accounts: { id: string; name: string; institution: string; balance: number; currency: string }[];
  excludedCurrencyCount: number; syncedAt: string; accountFlows: { fromId: string; fromName: string; toId: string; toName: string; value: number; count: number; currency: string }[];
};
type Amount = { value?: number | string; currentBalance?: number | string; rawCurrentBalance?: number | string; currencyCode?: string } | number | string | null;
type Named = { name?: string; customName?: string } | string | null;
type WalletRecord = { id?: string; recordDate?: string; counterParty?: string; note?: string; accountName?: string; amount?: Amount; recordType?: string; category?: Named; accountId?: string; transfer?: { type?: string; transferId?: string; mirrorRecord?: { id?: string; accountId?: string; amount?: Amount } | null } | null };
type WalletAccount = { id?: string; name?: string; customName?: string; institutionName?: string; bankName?: string; currencyCode?: string; currentBalance?: Amount; balance?: Amount; amount?: Amount };
type Page<T> = { records?: T[]; accounts?: T[]; nextOffset?: number | null };
const COLORS = ['#75c900','#3b82f6','#f5a623','#e23d35','#a855f7'];
const baseCurrency = () => process.env.WALLET_BASE_CURRENCY || 'COP';

export class WalletApiError extends Error {
  constructor(message: string, public status: number, public code: string) { super(message); this.name = 'WalletApiError'; }
}
function valueOf(amount: Amount | undefined): number {
  const raw = typeof amount === 'object' && amount !== null ? amount.value ?? amount.currentBalance ?? amount.rawCurrentBalance : amount;
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
function periodDates(period?: string, fromDate?: string, toDate?: string) {
  const requestedMonth = period && /^\d{4}-(0[1-9]|1[0-2])$/.test(period) ? period : new Date().toISOString().slice(0,7);
  const [year, monthNumber] = requestedMonth.split('-').map(Number);
  const monthStart = requestedMonth + '-01';
  const monthEnd = new Date(Date.UTC(year,monthNumber,0)).toISOString().slice(0,10);
  const today = new Date().toISOString().slice(0,10);
  const defaultEnd = requestedMonth === today.slice(0,7) ? today : monthEnd;
  const validDate = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0,10) === value);
  const from = validDate(fromDate) ? fromDate! : monthStart;
  const to = validDate(toDate) ? toDate! : defaultEnd;
  if (from > to) throw new WalletApiError('La fecha Desde debe ser anterior o igual a la fecha Hasta.',400,'invalid_date_range');
  const toExclusive = new Date(Date.parse(to + 'T00:00:00Z') + 86400000).toISOString().slice(0,10);
  return { month: from.slice(0,7), from, to, toExclusive };
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

export async function getWalletDashboard(period?: string, range: 'week' | 'month' = 'month', fromDate?: string, toDate?: string): Promise<DashboardData> {
  void range;
  const dates = periodDates(period,fromDate,toDate);
  const [records, accountPage] = await Promise.all([
    getRecords(dates.from,dates.toExclusive), walletGet<Page<WalletAccount>>('accounts',new URLSearchParams({limit:'200'})),
  ]);
  const currency = baseCurrency();
  const currencyMismatchCount = records.filter((r) => {
    const recordCurrency = typeof r.amount === 'object' && r.amount ? r.amount.currencyCode : currency;
    return Boolean(recordCurrency && recordCurrency !== currency);
  }).length;
  const included = records.filter((r) => {
    const recordCurrency = typeof r.amount === 'object' && r.amount ? r.amount.currencyCode : currency;
    return (recordCurrency || currency) === currency && !r.transfer?.transferId;
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
  const startDay = Date.parse(dates.from + 'T00:00:00Z');
  const endDay = Date.parse(dates.to + 'T00:00:00Z');
  for (let timestamp = startDay; timestamp <= endDay; timestamp += 86400000) {
    const date = new Date(timestamp).toISOString().slice(0,10);
    const label = new Intl.DateTimeFormat('es-CO',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(timestamp + 43200000)).replace('.','');
    buckets.set(date,{date,label,income:0,expenses:0});
  }
  for(const category of categoryNames) for(const bucket of buckets.values()) bucket[category]=0;
  for(const record of included){
    if(!record.recordDate) continue;
    const date=record.recordDate.slice(0,10), key=date;
    const bucket=buckets.get(key); if(!bucket) continue;
    const amount=valueOf(record.amount), type=record.recordType?.toLowerCase();
    if(type==='income'||(type!=='expense'&&amount>0)) bucket.income+=Math.abs(amount);
    else if(type==='expense'||amount<0){bucket.expenses+=Math.abs(amount);const category=nameOf(record.category,'Sin categoría');if(categoryNames.includes(category))bucket[category]=Number(bucket[category]||0)+Math.abs(amount);}
  }
  const accounts=(accountPage.accounts||[]).map((a,index)=>{
    const accountCurrency=a.currencyCode||(a.balance&&typeof a.balance==='object'?a.balance.currencyCode:undefined)||currency;
    return {id:a.id||`account-${index}`,name:nameOf(a,'Cuenta'),institution:a.institutionName||a.bankName||'Wallet',balance:valueOf(a.currentBalance??a.balance??a.amount),currency:accountCurrency};
  });
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const flowSums = new Map<string, DashboardData['accountFlows'][number]>();
  const seenTransferIds = new Set<string>();
  for (const record of records) {
    const transferId = record.transfer?.transferId;
    const mirror = record.transfer?.mirrorRecord;
    const accountId = record.accountId;
    if (!transferId || !accountId || !mirror?.accountId || seenTransferIds.has(transferId)) continue;
    const recordAmount = valueOf(record.amount);
    const fromId = recordAmount < 0 ? accountId : mirror.accountId;
    const toId = recordAmount < 0 ? mirror.accountId : accountId;
    if (fromId === toId) continue;
    seenTransferIds.add(transferId);
    const from = accountById.get(fromId), to = accountById.get(toId);
    if (!from || !to) continue;
    const recordCurrency = typeof record.amount === 'object' && record.amount?.currencyCode ? record.amount.currencyCode : from.currency;
    const key = fromId + ':' + toId + ':' + recordCurrency;
    const existing = flowSums.get(key);
    if (existing) { existing.value += Math.abs(recordAmount); existing.count += 1; }
    else flowSums.set(key, { fromId, fromName: from.name, toId, toName: to.name, value: Math.abs(recordAmount), count: 1, currency: recordCurrency });
  }
  const accountFlows = [...flowSums.values()].sort((a, b) => b.value - a.value);
  const recent=[...records].sort((a,b)=>(b.recordDate||'').localeCompare(a.recordDate||'')).map((r,index)=>({
    id:r.id||`record-${index}`,name:r.counterParty||'Movimiento',description:r.note?.trim()||'',category:nameOf(r.category,'Sin categoría'),date:r.recordDate||'',amount:valueOf(r.amount),
    currency:typeof r.amount==='object'&&r.amount?.currencyCode?r.amount.currencyCode:currency,type:r.recordType||'expense',
    accountId:r.accountId||'',accountName:r.accountName||accountById.get(r.accountId||'')?.name||'Cuenta no identificada',isTransfer:Boolean(r.transfer?.transferId),
  }));
  return {month:dates.month,dateFrom:dates.from,dateTo:dates.to,currency,totals:{income,expenses,balance:income-expenses,accounts:accounts.filter(a=>a.currency===currency).reduce((sum,a)=>sum+a.balance,0)},flow:[...buckets.values()],categories,categoryNames,recent,accounts,accountFlows,excludedCurrencyCount:currencyMismatchCount,syncedAt:new Date().toISOString()};
}



