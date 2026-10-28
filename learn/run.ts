// 每一层的验收脚本：npm run stage
import { runAgentLoop } from "@earendil-works/pi-agent-core";
import { fauxProvider } from "@earendil-works/pi-ai";

const faux = fauxProvider();

const messages = await runAgentLoop(
	[{ role: "user", content: "你好，Pi", timestamp: Date.now() }],
	{ systemPrompt: "You are a helpful assistant.", messages: [] },
	{ model: faux.model, complete: faux.complete },
	(event) => {
		if (event.type === "message_end") {
			const m = event.message;
			const text = typeof m.content === "string" ? m.content : m.content.map((c) => c.text).join("");
			console.log(`[${event.type}] ${m.role}: ${text}`);
		} else {
			console.log(`[${event.type}]`);
		}
	},
);

console.log(`共 ${messages.length} 条新消息`);
