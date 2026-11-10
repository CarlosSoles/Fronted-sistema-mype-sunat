interface Env {
  BACKEND_URL?: string;
}

interface EventContext<Env, P extends string, Data> {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<unknown>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: Env;
  params: Record<P, string | string[]>;
  data: Data;
}

type PagesFunction<
  Env = unknown,
  Params extends string = any,
  Data extends Record<string, unknown> = Record<string, unknown>,
> = (context: EventContext<Env, Params, Data>) => Response | Promise<Response>;

/**
 * Proxy inverso Cloudflare Pages Function.
 *
 * Intercepta todas las peticiones a `/api/*` en el frontend de Cloudflare Pages
 * y las reenvía transparentemente al backend NestJS en Render.
 *
 * Ventajas:
 * 1. Cero problemas de CORS (mismo origen para el navegador).
 * 2. Mantiene cookies HTTP-Only de sesión (Silent Refresh) sin bloqueos de third-party cookies.
 * 3. Expone 'Content-Disposition' para la descarga de XML/PDF/CDR de SUNAT.
 */
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // URL del backend configurada en las variables de Cloudflare Pages (o fallback a Render)
  const rawBackend = env.BACKEND_URL || 'https://sistema-mype-sunat-back.onrender.com';
  const backendBase = rawBackend.trim().replace(/\/+$/, '');

  const url = new URL(request.url);

  // Mapear la ruta completa preservando path y query parameters
  const targetUrl = new URL(url.pathname + url.search, backendBase);

  // Clonar cabeceras requeridas por NestJS y SUNAT
  const headers = new Headers(request.headers);
  const clientIp = request.headers.get('CF-Connecting-IP');
  if (clientIp) {
    headers.set('X-Forwarded-For', clientIp);
    headers.set('X-Real-IP', clientIp);
  }
  headers.set('Host', new URL(backendBase).host);
  headers.set('X-Forwarded-Host', url.host);
  headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

  try {
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow',
    });

    const responseHeaders = new Headers(response.headers);
    // Permitir leer nombres de archivos en descargas de comprobantes
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Disposition');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        statusCode: 502,
        message: `Error al conectar con el backend (${backendBase}): ${error?.message || 'Error de red'}`,
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};

