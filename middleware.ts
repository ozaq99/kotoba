export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico|assets).*)',
};

export default function middleware(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader) {
    const [, base64Credentials] = authHeader.split(' ');
    const credentials = atob(base64Credentials);
    const [user, pwd] = credentials.split(':');

    if (user === process.env.SITE_USER && pwd === process.env.SITE_PASSWORD) {
      return;
    }
  }

  return new Response('Auth required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
  });
}