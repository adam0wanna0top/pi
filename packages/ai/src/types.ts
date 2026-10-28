// 第 0 层：LLM 消息协议的最小子集。
// 对照完整版：git show main:packages/ai/src/types.ts

export type Api = string;
export type ProviderId = string;

export interface TextContent {
	type: "text";
	text: string;
}

export type StopReason = "stop" | "error";

export interface UserMessage {
	role: "user";
	content: string | TextContent[];
	timestamp: number; // Unix timestamp in milliseconds
}

export interface AssistantMessage {
	role: "assistant";
	content: TextContent[];
	api: Api;
	provider: ProviderId;
	model: string;
	stopReason: StopReason;
	errorMessage?: string;
	timestamp: number; // Unix timestamp in milliseconds
}

export type Message = UserMessage | AssistantMessage;

export interface Context {
	systemPrompt?: string;
	messages: Message[];
}

export interface Model {
	id: string;
	name: string;
	api: Api;
	provider: ProviderId;
}

// 第 0 层的"模型调用"：一次请求，一次完整回复，没有流式。
// 约定：失败不抛异常，而是返回 stopReason 为 "error" 的 AssistantMessage。
export type CompleteFunction = (model: Model, context: Context) => Promise<AssistantMessage>;
