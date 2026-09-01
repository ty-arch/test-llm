const BASE = "http://localhost:4001";
const sessionId = "req-session-final";

const rounds = [
    "我们需要开发一个用户登录功能，支持用户名和密码登录。",
    "密码必须至少 8 位，包含字母和数字，且不能明文存储，需要加密保存。",
    "登录成功后跳转到首页；连续失败三次锁定账号 15 分钟，并记录日志。",
];
const trigger = "帮我判断这个需求是否完整，并产出一份需求分析报告";

async function post(path, body) {
    const res = await fetch(`${BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return { status: res.status, data: await res.json() };
}

console.log("=== 前三轮：多轮记忆 (POST /api/memory/chat) ===");
for (let i = 0; i < rounds.length; i++) {
    const { status, data } = await post("/api/memory/chat", { sessionId, input: rounds[i] });
    console.log(`round${i + 1} status=${status} reply=${data.reply?.slice(0, 40)}`);
}

console.log("\n=== 第四轮：统一分析 (POST /api/advanced/analyze) ===");
let data;
for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await post("/api/advanced/analyze", { sessionId, input: trigger });
    data = r.data;
    console.log(`attempt ${attempt}: status_code=${r.status} analyze_status=${data.status} usedAgents=${data.usedAgents?.length}`);
    if (data.status === "completed") break;
    console.log("  (empty report, retrying...)");
}
console.log("final analyze status =", data.status);
console.log("reportPath =", data.reportPath);
console.log("clarificationQuestions =", JSON.stringify(data.clarificationQuestions));
console.log("fallback =", data.fallback);
if (data.report) console.log("report (first 500 chars):\n", data.report.slice(0, 500));

console.log("\n=== 会话历史 (GET /api/memory/history/:sessionId) ===");
const hist = await fetch(`${BASE}/api/memory/history/${sessionId}`).then((r) => r.json());
console.log("历史条数 =", hist.history?.length);
for (const m of hist.history ?? []) {
    console.log(`- [${m.role}] ${m.content.slice(0, 50)}`);
}
