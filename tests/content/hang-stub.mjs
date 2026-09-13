/**
 * A CMS that accepts the connection and never answers.
 *
 * This is how the 1.5s timeout in `src/lib/content.ts` is tested without
 * waiting on a real network fault: a refused connection fails instantly and
 * proves a different branch, so one of the outage instances points here and
 * one points at a port where nothing listens at all.
 *
 * The media manifest is answered immediately and emptily on purpose. If this
 * stub hung on that too, the page would also pay `src/lib/media.ts`'s own
 * 1.5s and the measurement would be of both together rather than of the one
 * under test.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.CONTENT_E2E_HANG_PORT ?? 8018);

createServer((request, response) => {
  if (request.url?.startsWith("/api/v1/media/manifest")) {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ bindings: {} }));
    return;
  }
  // Everything else: no reply, no close. The client's abort signal is the only
  // way this request ever ends.
}).listen(PORT, () => {
  console.log(`content-e2e hang stub listening on ${PORT}`);
});
