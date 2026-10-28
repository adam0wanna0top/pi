// 第 0 层：最小 Agent Loop —— 只跑"一次循环"：用户消息 → 模型 → 回复。
// 对照完整版：git show main:packages/agent/src/agent-loop.ts（看 runAgentLoop 和 runLoop）

import type { AgentContext, AgentEvent, AgentLoopConfig, AgentMessage } from "./types.ts";

export type AgentEventSink = (event: AgentEvent) => Promise<void> | void;

export async function runAgentLoop(
	prompts: AgentMessage[],
	context: AgentContext,
	config: AgentLoopConfig,
	emit: AgentEventSink,
): Promise<AgentMessage[]> {
	const newMessages: AgentMessage[] = [...prompts];
	const currentContext: AgentContext = {
		...context,
		messages: [...context.messages, ...prompts],
	};

	await emit({ type: "agent_start" });
	for (const prompt of prompts) {
		await emit({ type: "message_start", message: prompt });
		await emit({ type: "message_end", message: prompt });
	}

	// 唯一的一次模型调用。后面的层会把这里变成 while 循环（工具调用、steering、follow-up）。
	const message = await config.complete(config.model, {
		systemPrompt: currentContext.systemPrompt,
		messages: currentContext.messages,
	});
	currentContext.messages.push(message);
	newMessages.push(message);
	await emit({ type: "message_start", message });
	await emit({ type: "message_end", message });

	await emit({ type: "agent_end", messages: newMessages });
	return newMessages;
}
