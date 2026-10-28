// 假模型：不联网、不花钱、结果可预测。真实 Provider 在后面的层才加入。
// 对照完整版：git show main:packages/ai/src/providers/faux.ts

import type { AssistantMessage, CompleteFunction, Context, Model } from "../types.ts";

export type FauxResponder = (context: Context) => string;

export interface FauxProvider {
	model: Model;
	complete: CompleteFunction;
}

function lastUserText(context: Context): string {
	for (let i = context.messages.length - 1; i >= 0; i--) {
		const message = context.messages[i];
		if (message.role !== "user") continue;
		if (typeof message.content === "string") return message.content;
		return message.content.map((c) => c.text).join("");
	}
	return "";
}

export function fauxProvider(responder: FauxResponder = (context) => `echo: ${lastUserText(context)}`): FauxProvider {
	const model: Model = { id: "faux-1", name: "Faux Model", api: "faux", provider: "faux" };

	const complete: CompleteFunction = async (requestModel, context) => {
		const message: AssistantMessage = {
			role: "assistant",
			content: [],
			api: requestModel.api,
			provider: requestModel.provider,
			model: requestModel.id,
			stopReason: "stop",
			timestamp: Date.now(),
		};
		try {
			message.content.push({ type: "text", text: responder(context) });
		} catch (error) {
			message.stopReason = "error";
			message.errorMessage = error instanceof Error ? error.message : String(error);
		}
		return message;
	};

	return { model, complete };
}
