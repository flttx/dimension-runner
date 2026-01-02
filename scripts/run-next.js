/* eslint-disable @typescript-eslint/no-require-imports */
const net = require("net");
const { spawn } = require("child_process");

const mode = process.argv[2] || "dev";
const basePort = Number(process.env.PORT) || 5400;
const maxPort = basePort + 50;

const tryListen = (port, host) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", (error) => {
      server.close();
      resolve({ ok: false, error });
    });
    server.listen({ port, host }, () => {
      server.close(() => resolve({ ok: true }));
    });
  });

const isPortAvailable = async (port) => {
  const ipv6 = await tryListen(port, "::");
  if (ipv6.ok) {
    return true;
  }
  if (ipv6.error && ipv6.error.code !== "EADDRNOTAVAIL") {
    return false;
  }
  const ipv4 = await tryListen(port, "127.0.0.1");
  return ipv4.ok;
};

const findPort = async () => {
  for (let port = basePort; port <= maxPort; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port in range ${basePort}-${maxPort}`);
};

const run = async () => {
  const port = await findPort();
  if (port !== basePort) {
    console.log(`Port ${basePort} is busy, switching to ${port}`);
  }

  const nextBin = require.resolve("next/dist/bin/next");
  const args = [nextBin, mode, "-p", String(port)];
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    env: { ...process.env, PORT: String(port) },
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
