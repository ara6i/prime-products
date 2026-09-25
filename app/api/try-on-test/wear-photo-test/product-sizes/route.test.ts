// @vitest-environment node
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { spawn } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));

function request(body = "{}", headers: Record<string, string> = {}, signal?: AbortSignal) {
  return new Request("http://localhost:3001/api/try-on-test/wear-photo-test/product-sizes", {
    method: "POST", headers: { host: "localhost:3001", origin: "http://localhost:3001", "content-type": "application/json", ...headers }, body, signal,
  });
}

function child(reply: string | null = JSON.stringify({ ok: true, fixture: "selected-person" })) {
  const process = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), kill: vi.fn(),
  });
  process.stdin.on("finish", () => {
    if (reply != null) queueMicrotask(() => { process.stdout.write(reply); process.emit("close", 0); });
  });
  process.kill.mockImplementation(() => { queueMicrotask(() => process.emit("close", null)); return true; });
  return process;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("PRIME_PRODUCTS_TEST_LAB_ENABLED", "true");
});
afterEach(() => vi.unstubAllEnvs());

describe("local selected-person product-size route", () => {
  it("invokes only the fixed local sizing adapter and keeps the response private", async () => {
    const worker = child();
    vi.mocked(spawn).mockReturnValue(worker as unknown as ReturnType<typeof spawn>);
    const body = JSON.stringify({ person: { label: "Fixture person" }, predicted: { waist: 90 } });
    const response = await POST(request(body));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ ok: true, fixture: "selected-person" });
    const [binary, args, options] = vi.mocked(spawn).mock.calls[0]!;
    expect(binary).toBe(process.execPath);
    expect(args).toEqual([expect.stringMatching(/scripts\/benchmarks\/compare-selected-person\.cjs$/)]);
    expect(options).not.toHaveProperty("shell");
    expect(worker.stdin.read().toString()).toBe(body);
  });

  it("rejects non-local, cross-origin, non-JSON, malformed and oversized requests without spawning work", async () => {
    const cases: [Request, number][] = [
      [request("{}", { host: "test-fe-9a7k.primestyleai.com" }), 403],
      [request("{}", { origin: "https://other.example" }), 403],
      [request("{}", { "content-type": "text/plain" }), 415],
      [request("not-json"), 400],
      [request("{}", { "content-length": "16001" }), 413],
      [request(JSON.stringify({ extra: "x".repeat(16001) })), 413],
    ];
    for (const [input, status] of cases) expect((await POST(input)).status).toBe(status);
    expect(spawn).not.toHaveBeenCalled();
  });

  it("does not spawn an already cancelled comparison", async () => {
    const controller = new AbortController(); controller.abort();
    expect((await POST(request("{}", {}, controller.signal))).status).toBe(499);
    expect(spawn).not.toHaveBeenCalled();
  });

  it("reserves at most two workers even when request bodies are read concurrently", async () => {
    const workers = [child(null), child(null)];
    vi.mocked(spawn).mockReturnValueOnce(workers[0] as unknown as ReturnType<typeof spawn>)
      .mockReturnValueOnce(workers[1] as unknown as ReturnType<typeof spawn>);
    const pending = [POST(request()), POST(request())];
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledTimes(2));
    const excess = await POST(request());
    workers.forEach(worker => { worker.stdout.write(JSON.stringify({ ok: true })); worker.emit("close", 0); });
    const finished = await Promise.all(pending);
    expect(excess.status).toBe(429);
    expect(finished.map(response => response.status)).toEqual([200, 200]);
    expect(spawn).toHaveBeenCalledTimes(2);
  });

  it("surfaces unavailable source data and malformed worker output rather than fake results", async () => {
    vi.mocked(spawn).mockReturnValueOnce(child(JSON.stringify({ ok: false, error: "Verified snapshot unavailable." })) as unknown as ReturnType<typeof spawn>);
    expect((await POST(request())).status).toBe(422);
    vi.mocked(spawn).mockReturnValueOnce(child("not-json") as unknown as ReturnType<typeof spawn>);
    expect((await POST(request())).status).toBe(503);
  });
});
