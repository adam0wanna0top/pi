# 从零重建 Pi：逐层路线

分支 `learn/from-zero` 只保留最小核心。`main` 是完整答案，任何时候都可以对照：

```bash
git show main:packages/agent/src/agent-loop.ts   # 看某个文件的完整版
git diff main --stat -- packages/agent/src        # 看还差多少
```

每一层的做法：

1. 读本层"参考"里的 main 文件对应片段，搞清楚它解决什么问题。
2. 自己在 learn 分支上写（可以让 Claude 先出题、给提示，再帮你 review）。
3. 改 `learn/run.ts` 演示新能力，`npm run stage` 跑通，`npm run check` 通过。
4. 提交一次：`git commit -m "learn: layer N ..."`，再进下一层。

## 第 0 层：一次循环（已完成）

用户消息 → 模型 → 回复 → 结束。没有流式、没有工具、没有错误恢复。

| 文件 | 作用 |
|---|---|
| `packages/ai/src/types.ts` | 消息协议：`UserMessage`、`AssistantMessage`、`Context`、`Model` |
| `packages/ai/src/providers/faux.ts` | 假模型，回显用户输入 |
| `packages/agent/src/types.ts` | `AgentContext`、`AgentLoopConfig`、`AgentEvent` |
| `packages/agent/src/agent-loop.ts` | `runAgentLoop()`：只调用一次模型 |
| `learn/run.ts` | 验收脚本 |

思考题：为什么模型失败时返回 `stopReason: "error"` 而不是抛异常？`emit` 回调让谁受益？

## 第 1 层：流式输出

模型不再一次性返回，而是一个事件流：`start → text_delta... → done`。

- 新增 `packages/ai/src/utils/event-stream.ts`（`EventStream`、`AssistantMessageEventStream`）
- `types.ts` 加 `AssistantMessageEvent`，`CompleteFunction` 换成 `StreamFunction`
- faux 按字符分块推送 delta
- agent-loop 加 `streamAssistantResponse()` 和 `message_update` 事件
- 参考：`main:packages/ai/src/utils/event-stream.ts`，`main:packages/agent/src/agent-loop.ts` 的 `streamAssistantResponse`

重点：async iterator、Promise 队列、"partial message"如何边流边更新上下文。

## 第 2 层：工具调用（Agent 真正成为 Agent）

模型返回 `toolCall` → 执行工具 → `ToolResultMessage` 写回历史 → 再次调用模型，直到不再请求工具。

- `types.ts` 加 `ToolCall`、`ToolResultMessage`、`Tool`、`StopReason` 的 `toolUse`
- agent `types.ts` 加 `AgentTool`、`AgentToolResult`、`tool_execution_*` 事件、`turn_start/turn_end`
- agent-loop 的单次调用变成 `while (hasMoreToolCalls)`；先写顺序执行
- 引入 `typebox` 描述参数，加 `validateToolArguments`（参考 `main:packages/ai/src/utils/validation.ts`）
- faux 支持脚本化响应：第一次返回 toolCall，第二次返回文本

## 第 3 层：失败、取消与用量

- `AbortSignal` 贯穿 loop、模型、工具；`stopReason: "aborted"`
- 工具找不到、参数非法、执行抛错 → 变成 `isError` 的工具结果而不是崩溃
- `Usage` 与 cost 统计
- `ThinkingContent`

## 第 4 层：Agent 类（状态与队列）

在 loop 外包一层有状态的对象。

- 新增 `packages/agent/src/agent.ts`：`state`、`subscribe()`、`prompt()`、`abort()`、`waitForIdle()`
- loop 加 `getSteeringMessages` / `getFollowUpMessages`（外层 while）
- 并行工具执行、`beforeToolCall` / `afterToolCall`、`convertToLlm` / `transformContext`
- 参考：`main:packages/agent/src/agent.ts`

## 第 5 层：真实 Provider（API 适配层）

- `packages/ai/src/models.ts`：`Model` 注册与 `createProvider`
- 接入一个真实 API（建议 `openai-completions` 或 `anthropic-messages`），把厂商 SSE 转成 `AssistantMessageEvent`
- `env-api-keys.ts`、`utils/transform-messages.ts`
- 此时才需要 API key；faux 继续用于离线验收
- 参考：`main:packages/ai/src/api/`

## 第 6 层：Coding Agent 最小 CLI

- 新建 `packages/coding-agent`：`cli.ts`、`main.ts`、print 模式（`pi -p "..."`）
- 内置工具：`read`、`write`、`edit`、`bash`
- `AgentSession` 雏形：系统提示词、工具装配、模型选择
- 参考：`main:packages/coding-agent/src/core/tools/`、`core/agent-session.ts`、`core/sdk.ts`

## 第 7 层：会话持久化

- JSONL 会话文件、恢复会话、会话树/分支
- 参考：`main:packages/coding-agent/src/core/session-manager.ts`、`main:packages/agent/src/harness/session/`

## 第 8 层：上下文压缩

- token 估算、超窗口检测、compaction 摘要
- 参考：`main:packages/agent/src/harness/compaction/`、`main:packages/ai/src/utils/overflow.ts`

## 第 9 层：TUI

- `packages/tui`：差分渲染、输入分发、组件
- interactive 模式把 `AgentEvent` 渲染到终端
- 参考：`main:packages/tui/src/`、`main:packages/coding-agent/src/modes/interactive/`

## 第 10 层：扩展、Skill、Prompt 模板、RPC

- 参考：`main:packages/coding-agent/src/core/extensions/`、`main:packages/agent/src/harness/skills.ts`

## 第 11 层（选修）：单元测试与 Orchestrator

- 用 faux provider 把每层的演示改写成 vitest 测试
- `main:packages/orchestrator`
