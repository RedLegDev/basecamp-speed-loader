import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getUserAccounts } from '@/lib/basecamp';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=missing_code', request.url)
    );
  }

  try {
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);

    // Get user accounts to find Basecamp 3 account ID
    const accounts = await getUserAccounts(tokenData.access_token);
    const basecampAccount = accounts.find(account => account.product === 'bc3');

    if (!basecampAccount) {
      return NextResponse.redirect(
        new URL('/?error=no_basecamp_account', request.url)
      );
    }

    // Redirect back to home with token and account info in URL
    // Note: In production, you'd want to store this more securely (e.g., encrypted cookie or session)
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('access_token', tokenData.access_token);
    redirectUrl.searchParams.set('account_id', basecampAccount.id.toString());

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(
      new URL('/?error=oauth_failed', request.url)
    );
  }
}
