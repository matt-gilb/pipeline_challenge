#!/usr/bin/env node

import * as net from "net";
import * as http from "http";
import { setTimeout } from "timers/promises";

const MAX_RETRIES = 30;
const RETRY_INTERVAL = 1000; // 1 second

type CheckType = "tcp" | "http";

async function checkTcp(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    const onError = () => {
      socket.destroy();
      resolve(false);
    };

    socket.setTimeout(1000);
    socket.once("error", onError);
    socket.once("timeout", onError);

    socket.connect(port, host, () => {
      socket.end();
      resolve(true);
    });
  });
}

async function checkHttp(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "*/*" },
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitFor(
  type: CheckType,
  target: string,
  retries = MAX_RETRIES,
): Promise<boolean> {
  console.log(`Waiting for ${type} ${target}...`);

  let host = "";
  let port = 0;
  if (type === "tcp") {
    const parts = target.split(":");
    host = parts[0] || "";
    port = parseInt(parts[1] || "0", 10);
  }

  for (let i = 0; i < retries; i++) {
    const isReady =
      type === "tcp"
        ? await checkTcp(host, Number(port))
        : await checkHttp(target);

    if (isReady) {
      console.log(`${type} ${target} is ready!`);
      return true;
    }

    process.stdout.write(".");
    await setTimeout(RETRY_INTERVAL);
  }

  console.error(
    `\nTimeout: ${type} ${target} not ready after ${retries} attempts`,
  );
  return false;
}

async function main() {
  const args = process.argv.slice(2);
  const type = args[0];
  const target = args[1];

  if (!type || !target || !["tcp", "http"].includes(type)) {
    console.error("Usage: wait-for.ts <tcp|http> <host:port|url>");
    process.exit(1);
  }

  const success = await waitFor(type as CheckType, target);
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}
