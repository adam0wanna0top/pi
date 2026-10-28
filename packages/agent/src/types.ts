// 第 0 层：Agent 层的最小类型。
// 对照完整版：git show main:packages/agent/src/types.ts

import type { CompleteFunction, Message, Model } from "@earendil-works/pi-ai";

// 完整版里 AgentMessage 可以扩展自定义消息，这里先等同于 LLM Message。
export type AgentMessage = Message;

export interface AgentContext {
	systemPrompt: string;
	messages: AgentMessage[];
}

export interface AgentLoopConfig {
	model: Model;
	complete: CompleteFunction;
}

export type AgentEvent =
	| { type: "agent_start" }
	| { type: "message_start"; message: AgentMessage }
	| { type: "message_end"; message: AgentMessage }
	| { type: "agent_end"; messages: AgentMessage[] };
