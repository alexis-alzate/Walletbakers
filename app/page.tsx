import { Dashboard } from '@/components/dashboard';
import { getDemoDashboard } from '@/lib/demo';
import { getWalletDashboard, WalletApiError, type DashboardData } from '@/lib/wallet';
import { hasValidSession, isAuthConfigured } from '@/lib/auth';
import { LoginForm } from '@/components/login-form';

export const dynamic = 'force-dynamic';

type Connection = 'connected'|'missing_token'|'invalid_token'|'initial_sync'|'wallet_api_error';

export default async function Home() {
  if (!await hasValidSession()) return <LoginForm configured={isAuthConfigured()} />;
  const month = new Date().toISOString().slice(0, 7);
  let data: DashboardData = getDemoDashboard(month);
  let connection: Connection = 'missing_token';
  try {
    data = await getWalletDashboard(month);
    connection = 'connected';
  } catch (error) {
    const code = error instanceof WalletApiError ? error.code : 'wallet_api_error';
    connection = (['missing_token','invalid_token','initial_sync','wallet_api_error'].includes(code) ? code : 'wallet_api_error') as Connection;
  }
  return <Dashboard initialData={data} initialConnection={connection} />;
}
