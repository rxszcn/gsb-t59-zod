import { z } from "../packages/zod/src/index.ts";

const line = (s: string) => console.log("\n//== " + s);
const t = (label: string, fn: () => unknown) => {
  try {
    console.log(label.padEnd(50), "OK   " + JSON.stringify(fn()));
  } catch (e: any) {
    console.log(label.padEnd(50), "THROW " + e.constructor.name + ": " + String(e.message).slice(0, 70));
  }
};

const aT = z.string().transform(async (s: string) => s.length);
const aP = z.preprocess(async (v: unknown) => v, z.string());
const aR = z.string().refine(async () => false, { message: "nope" });
const prom = z.promise(z.string());
const aCheck = z.string().check(z.custom(async () => false, { message: "bad" }));

const mk = () => {
  const aT = z.string().transform(async (s: string) => s.length);
  const aP = z.preprocess(async (v: unknown) => v, z.string());
  const aR = z.string().refine(async () => false, { message: "nope" });
  const prom = z.promise(z.string());
  const aCheck = z.string().check(z.custom(async () => false, { message: "bad" }));
  return [
    ["object{async transform}", z.object({ a: aT }), { a: "abc" }],
    ["object{async preprocess}", z.object({ a: aP }), { a: "abc" }],
    ["object{z.promise()}", z.object({ a: prom }), { a: Promise.resolve("abc") }],
    ["object{async check}", z.object({ a: aCheck }), { a: "abc" }],
    ["object{async refine}", z.object({ a: aR }), { a: "abc" }],
    ["strict object{async transform}", z.object({ a: aT }).strict(), { a: "abc" }],
    ["loose object{async transform}", z.looseObject({ a: aT }), { a: "abc" }],
    ["catchall obj{async transform}", z.object({ a: aT }).catchall(z.number()), { a: "abc" }],
    ["2nd key async, 1st sync", z.object({ b: z.string(), a: aT }), { b: "x", a: "abc" }],
    ["async + present key ok", z.object({ a: aT, b: z.string() }), { a: "abc", b: "q" }],
    ["array{z.promise}", z.array(prom), [Promise.resolve("a")]],
    ["record{z.promise}", z.record(z.string(), prom), { k: Promise.resolve("a") }],
    ["tuple{z.promise}", z.tuple([prom]), [Promise.resolve("a")]],
  ] as [string, any, any][];
};

const cases = mk();

line("with JIT fast path (default)");
for (const [n, s, i] of cases) t(n, () => s.safeParse(i));

line("same, via .parse()");
t("object{async transform}.parse", () => z.object({ a: aT }).parse({ a: "abc" }));
t("object{z.promise}.parse", () => z.object({ a: prom }).parse({ a: Promise.resolve("a") }));

line("with jitless global config (fresh schemas)");
z.config({ jitless: true });
for (const [n, s, i] of mk()) t(n, () => s.safeParse(i));
z.config({ jitless: false });

line("already-built schemas after jitless toggle (jit captured at init)");
for (const [n, s, i] of cases.slice(0, 4)) t(n, () => s.safeParse(i));

line("per-schema jitless via config()?");
try {
  const s2 = z.object({ a: aT });
  t("obj.config({jitless})", () => (s2 as any).config({ jitless: true }).safeParse({ a: "abc" }));
} catch (e: any) { console.log("config jitless err:", e.message.slice(0, 80)); }


line("what does parseAsync give for these?");
await (async () => {
  for (const [n, s, i] of [cases[0], cases[2], cases[5], cases[6]]) {
    try {
      const r = await s.safeParseAsync(i);
      console.log(n.padEnd(50), "OK   " + JSON.stringify(r));
    } catch (e: any) {
      console.log(n.padEnd(50), "THROW " + e.constructor.name + ": " + String(e.message).slice(0, 60));
    }
  }
})();
