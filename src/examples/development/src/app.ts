import { createServer } from "node:http";
import * as url from "url";

const server = createServer((req, res) => {
  const parsedUrl = url.parse(req.url as string, true);
  const pathname = parsedUrl.pathname;

  if (req.method === "GET" && pathname === "/") {
    console.info("GET / 200 1ms");
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`Hello, from TSX-Strict at ${Date.now()}`);
  }
});

const port = 8000;

// class Test {
//   name: string;
// }
// const a: number = "uanela";

const shutdown = () => {
  // console.log("shutting down");
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(port, () => {
  console.info(`Server running at http://localhost:${port}`);
});
