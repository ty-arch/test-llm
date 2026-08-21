const BASE = "http://localhost:4001/api/langchain";
const INPUT = "用户注册时必须绑定手机号，密码至少8位";

async function post(path, body) {
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

const t0 = Date.now();
const invoke = await post("chain-invoke", { input: INPUT });
console.log("=== chain-invoke ===");
console.log("status:", invoke.status, `(${Date.now() - t0}ms)`);
console.log("content:", invoke.data.content);

const t1 = Date.now();
const batch = await post("chain-batch", { inputs: [INPUT, "会员下单满100元包邮"] });
console.log("\n=== chain-batch ===");
console.log("status:", batch.status, `(${Date.now() - t1}ms)`);
batch.data.results.forEach((r, i) => console.log(`results[${i}]:`, r));

// chain-stream：读前 5 个 SSE 事件验证逐块流式
console.log("\n=== chain-stream (first 5 chunks) ===");
const res = await fetch(`${BASE}/chain-stream`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
  body: JSON.stringify({ input: INPUT }),
});
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buf = "";
let count = 0;
const t2 = Date.now();
while (count < 5) {
  const { done, value } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  const events = buf.split("\n\n");
  buf = events.pop() ?? "";
  for (const e of events) {
    if (count >= 5) break;
    count++;
    console.log(`chunk ${count} @+${Date.now() - t2}ms:`, e.slice(0, 60));
  }
}
reader.releaseLock();
console.log("(stopped reading after 5 chunks)");
