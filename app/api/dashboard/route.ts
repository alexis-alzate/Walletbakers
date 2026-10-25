import { NextRequest, NextResponse } from 'next/server';
import { getWalletDashboard, WalletApiError } from '@/lib/wallet';
import { hasValidSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!await hasValidSession()) {
    return NextResponse.json({ code: 'unauthorized', message: 'Inicia sesión para consultar tus finanzas.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const period = request.nextUrl.searchParams.get('period') || undefined;
  const range = request.nextUrl.searchParams.get('range') === 'month' ? 'month' : 'week';
  try {
    const dashboard = await getWalletDashboard(period, range);
    return NextResponse.json(dashboard, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const walletError = error instanceof WalletApiError ? error : null;
    const status = walletError?.status && walletError.status >= 400 && walletError.status < 600 ? walletError.status : 502;
    return NextResponse.json(
      { code: walletError?.code || 'wallet_api_error', message: walletError?.message || 'No pudimos leer los datos de Wallet.' },
      { status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
