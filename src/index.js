const UPSTREAM_ORIGIN = "https://julie-eduarda-sobrancelhas.amorfosounds.chatgpt.site";

function buildUpstreamUrl(requestUrl) {
  const incoming = new URL(requestUrl);
  return new URL(incoming.pathname + incoming.search, UPSTREAM_ORIGIN);
}

function cleanRequestHeaders(headers) {
  const next = new Headers(headers);
  next.delete("host");
  next.delete("cf-connecting-ip");
  next.delete("cf-ipcountry");
  next.delete("cf-ray");
  next.delete("cf-visitor");
  next.delete("x-forwarded-for");
  next.delete("x-forwarded-proto");
  next.set("accept-encoding", "identity");
  return next;
}

function cleanResponseHeaders(headers) {
  const next = new Headers(headers);
  next.delete("content-length");
  next.delete("content-encoding");
  next.delete("content-security-policy");
  next.delete("content-security-policy-report-only");
  next.delete("report-to");
  next.delete("nel");
  return next;
}

function rewriteLocation(location, incomingOrigin) {
  if (!location) return location;
  return location.replaceAll(UPSTREAM_ORIGIN, incomingOrigin);
}

async function proxyRequest(request) {
  const incomingUrl = new URL(request.url);
  const upstreamUrl = buildUpstreamUrl(request.url);
  const init = {
    method: request.method,
    headers: cleanRequestHeaders(request.headers),
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  const upstreamResponse = await fetch(upstreamUrl, init);
  const headers = cleanResponseHeaders(upstreamResponse.headers);

  if (headers.has("location")) {
    headers.set("location", rewriteLocation(headers.get("location"), incomingUrl.origin));
  }

  const contentType = headers.get("content-type") || "";
  const isText =
    contentType.includes("text/html") ||
    contentType.includes("text/css") ||
    contentType.includes("javascript") ||
    contentType.includes("application/json") ||
    contentType.includes("application/ld+json");

  if (request.method === "HEAD") {
    return new Response(null, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  }

  if (isText) {
    let body = await upstreamResponse.text();
    body = body.replaceAll(UPSTREAM_ORIGIN, incomingUrl.origin);
    return new Response(body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    try {
      const response = await proxyRequest(request);

      // If the original site temporarily fails, keep the local migration as a fallback.
      if (response.status >= 500 && env.ASSETS) {
        return env.ASSETS.fetch(request);
      }

      return response;
    } catch (error) {
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }

      return new Response("Site temporariamente indisponível.", {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
  },
};
