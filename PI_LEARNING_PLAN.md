# Pi 工程学习计划

## 目标

这份计划面向 TypeScript 初学者和 Agent 新手，目标是帮助你从零建立对 Pi 工程的整体理解：

- 看懂 Pi monorepo 的包边界。
- 从 `pi` 命令追踪到 agent loop。
- 理解模型调用、工具调用、会话、TUI、扩展机制分别在哪里。
- 遇到偏难的 TypeScript 写法时，不跳过语法，而是先解释再继续读代码。

学习方式是 8 轮导览。每轮先建立 mental model，再读少量关键源码，最后做一个小练习。

## 学习原则

- 先看链路，不先陷入细节。
- 先理解“这个文件负责什么”，再理解“每一行怎么写”。
- 复杂 TypeScript 语法要单独解释，包括泛型、联合类型、异步生成器、事件类型、工具 schema。
- 默认只读代码，不改源码。
- 和 Claude Code 的对比只在关键处轻量出现，主线专注 Pi。

## 第 1 轮：工程地图

### 要理解的问题

Pi 不是一个单文件 CLI，而是一个 monorepo。它由几个职责清晰的包组成：

| 包 | 作用 | 初学者理解 |
|---|---|---|
| `packages/coding-agent` | CLI 产品本体 | 用户真正运行的 `pi` |
| `packages/agent` | Agent runtime | agent loop、工具调用、状态管理 |
| `packages/ai` | 模型/provider 抽象 | 统一 OpenAI、Anthropic、Google 等模型接口 |
| `packages/tui` | 终端 UI 库 | interactive mode 的界面层 |
| `packages/orchestrator` | 编排层 | 多 agent / RPC / 调度相关，后面再看 |

### 阅读文件

- `package.json`
- `README.md`

### TS 语法看点

- 暂时不需要深入 TS。
- 重点看 `package.json` 的 `workspaces`、`scripts`、`dependencies`。
- 理解 npm workspace 是如何把多个包放在一个仓库里的。

### 小练习

画出粗链路：

```text
用户输入
-> coding-agent
-> AgentSession
-> Agent
-> agent-loop
-> pi-ai provider
-> LLM
-> tools
-> 输出给用户
```

### 自检问题

- `coding-agent` 和 `agent` 的区别是什么？
- 为什么模型调用单独放在 `packages/ai`？
- 如果只想学习 agent loop，应该优先看哪个包？

## 第 2 轮：CLI 如何启动

### 要理解的问题

用户执行 `pi` 后，代码如何从命令行入口进入主流程，并最终选择 interactive、print、rpc 等模式。

### 阅读文件

- `packages/coding-agent/src/cli.ts`
- `packages/coding-agent/src/main.ts`
- `packages/coding-agent/src/cli/args.ts`

### TS 语法看点

- `import` / `export`：模块之间如何引用。
- `async function`：为什么启动流程通常是异步的。
- `process.argv`：Node CLI 如何接收命令行参数。
- 类型标注：例如函数参数和返回值后面的 `: Type`。

### 小练习

在源码里找出三件事：

- 参数解析在哪里发生。
- 配置加载在哪里发生。
- 模式分发在哪里发生。

### 自检问题

- `cli.ts` 为什么通常很薄？
- `main.ts` 为什么会比较大？
- interactive mode 和 print mode 的分叉点在哪里？

## 第 3 轮：AgentSession 是产品层核心

### 要理解的问题

`AgentSession` 是 coding-agent 的核心产品层。它把底层 `Agent` 包装起来，并管理这些产品功能：

- 用户 prompt。
- 当前模型。
- 可用工具。
- 会话历史。
- 上下文压缩。
- 扩展和资源。
- 事件输出。

### 阅读文件

- `packages/coding-agent/src/core/sdk.ts`
- `packages/coding-agent/src/core/agent-session.ts`

### TS 语法看点

- `class`：对象如何组织状态和方法。
- 构造函数 `constructor`：对象创建时如何注入依赖。
- `private` / `protected` / `public`：类成员可见性。
- 可选属性 `foo?: Type`：某个字段可能不存在。
- 对象解构：从配置对象里取参数。

### 小练习

跟踪一次用户输入：

```text
interactive mode
-> AgentSession.prompt(...)
-> 底层 Agent
-> agent-loop
```

不用理解所有代码，只要能说清每一层负责什么。

### 自检问题

- 为什么不让 UI 直接调用 `packages/agent`？
- `AgentSession` 比 `Agent` 多了哪些产品能力？
- session 和 agent loop 是同一个概念吗？

## 第 4 轮：真正的 Agent Loop

### 要理解的问题

Agent loop 是整个工程最核心的部分。它处理一个循环：

```text
把消息发给模型
-> 接收模型流式输出
-> 如果模型请求工具调用，就执行工具
-> 把工具结果加入对话
-> 再次请求模型
-> 直到模型给出最终回答
```

### 阅读文件

- `packages/agent/src/agent.ts`
- `packages/agent/src/agent-loop.ts`
- `packages/agent/src/types.ts`

### TS 语法看点

- `type` 和 `interface`：如何描述消息、事件、工具。
- 联合类型 `A | B`：一个值可能是多种形态。
- 类型收窄：根据字段判断当前是哪种事件。
- `async function*`：异步生成器，可以一边工作一边产出事件。
- `for await ... of`：消费异步事件流。

### 小练习

用伪代码复述 agent loop：

```ts
while (true) {
  callModel();
  if (modelAskedForTool) {
    runTool();
    appendToolResult();
    continue;
  }
  break;
}
```

### 自检问题

- agent loop 为什么不是一次普通函数调用？
- tool result 为什么要回到模型上下文里？
- 流式输出和最终结果有什么区别？

## 第 5 轮：模型与 Provider 抽象

### 要理解的问题

`packages/ai` 的作用是把不同模型厂商统一起来。上层 agent 不应该关心 OpenAI、Anthropic、Google、Bedrock 的 API 差异。

### 阅读文件

- `packages/ai/src/models.ts`
- `packages/ai/src/compat.ts`
- `packages/ai/src/types.ts`

### TS 语法看点

- 泛型 `<T>`：让函数或类型适配不同数据结构。
- 字面量类型：例如 provider 名称只能是某些固定字符串。
- `Record<K, V>`：用类型描述对象映射。
- `readonly`：表示某些数据不应该被修改。
- 函数类型：把函数本身作为参数或字段。

### 小练习

回答这个问题：

为什么不要在 `packages/coding-agent` 里直接写各家模型 API 调用？

推荐答案方向：

- coding-agent 会变复杂。
- provider 差异会污染产品逻辑。
- 新增模型时不应该改 agent loop。

### 自检问题

- provider 和 model 是一个概念吗？
- `packages/ai` 解决的是业务问题还是适配问题？
- 如果要新增一个 provider，应该优先看哪个包？

## 第 6 轮：工具系统

### 要理解的问题

工具是 agent 能操作真实环境的方式。Pi 的内置工具包括读文件、写文件、编辑、搜索、执行命令等。

### 阅读文件

- `packages/coding-agent/src/core/tools/index.ts`
- `packages/coding-agent/src/core/tools/read.ts`
- `packages/coding-agent/src/core/tools/bash.ts`
- `packages/coding-agent/src/core/tools/edit.ts`

### TS 语法看点

- schema：如何用类型或运行时结构描述工具输入。
- 异步函数返回值：工具经常需要等待文件系统或进程执行。
- 错误处理：`try` / `catch` 和结构化错误返回。
- 对象数组：工具列表如何统一注册。

### 小练习

任选一个工具，追踪三件事：

- 输入 schema 是什么。
- 执行函数在哪里。
- 返回结果如何交给 agent loop。

### 自检问题

- 工具为什么需要 schema？
- read 工具和 bash 工具的风险为什么不同？
- 为什么 Claude Code 的工具系统更重，而 Pi 更适合先学习最小闭环？

## 第 7 轮：TUI 与交互模式

### 要理解的问题

Interactive mode 不是简单的 `console.log`。它需要处理输入框、消息列表、加载状态、快捷键、流式输出等终端 UI 行为。

Pi 使用自己的 `pi-tui`，而不是 React + Ink。

### 阅读文件

- `packages/coding-agent/src/modes/interactive/interactive-mode.ts`
- `packages/tui/src/tui.ts`
- `packages/tui/src/components/input.ts`
- `packages/tui/src/components/markdown.ts`

### TS 语法看点

- 事件回调：用户输入、按键、渲染更新如何触发函数。
- 类和组件对象：TUI 组件如何保存状态。
- 函数参数对象：配置型 API 常用一个对象传很多参数。
- 类型导入：区分运行时代码和类型描述。

### 小练习

找出用户在输入框提交消息后，代码如何调用到 `AgentSession.prompt(...)`。

### 自检问题

- TUI 层负责 agent 决策吗？
- 为什么 UI 不应该直接拼模型请求？
- Pi 自研 TUI 和 Claude Code React + Ink 的主要差异是什么？

## 第 8 轮：会话、资源与扩展

### 要理解的问题

Pi 不只是一次性问答工具。它还管理：

- session 保存。
- session 分叉。
- 上下文压缩。
- AGENTS.md / CLAUDE.md 等资源加载。
- skills。
- extensions。
- orchestrator。

### 阅读文件

- `packages/coding-agent/src/core/session-manager.ts`
- `packages/coding-agent/src/core/resource-loader.ts`
- `packages/coding-agent/src/core/extensions.ts`
- `packages/orchestrator/README.md`

### TS 语法看点

- JSONL 数据：一行一个 JSON 事件或消息。
- 递归/树结构：session 的 parent/child 关系。
- 插件式接口：extension 如何暴露能力给主程序。
- 类型组合：多个配置来源如何合并成一个运行时配置。

### 小练习

回答这个问题：

如果你要二次开发 Pi，什么时候应该写 extension，什么时候应该改 core？

推荐判断：

- 新增外部能力，优先 extension。
- 修改 agent loop 行为，才考虑 core。
- 修改模型适配，优先 `packages/ai`。
- 修改终端交互，优先 `packages/tui` 或 interactive mode。

### 自检问题

- session persistence 和 agent loop 是什么关系？
- resource loader 为什么属于产品层？
- orchestrator 为什么不适合作为入门第一站？

## TS 初学者补充路线

学习 Pi 时，建议按这个顺序补 TypeScript：

1. 基础类型：`string`、`number`、`boolean`、数组、对象。
2. 函数类型：参数类型、返回值类型、可选参数。
3. `type` 和 `interface`。
4. 联合类型：`A | B`。
5. 类型收窄：`if` 判断后类型变具体。
6. 泛型：`Promise<T>`、`Array<T>`、自定义 `<T>`。
7. 异步：`async` / `await` / `Promise`。
8. 异步迭代：`async function*` 和 `for await ... of`。
9. 类：`class`、字段、方法、构造函数。
10. 模块：`import`、`export`、路径引用。

读代码时如果遇到这些语法，不要强行跳过。先用一个小例子解释语法，再回到 Pi 的源码。

## 学完后的验收标准

学完 8 轮后，你应该能做到：

- 说清 Pi 五个核心 package 的职责。
- 从 `pi` CLI 入口追踪到 `AgentSession`。
- 理解 `Agent` 和 `agent-loop` 的区别。
- 解释模型 provider 抽象为什么在 `packages/ai`。
- 追踪一个工具从注册到执行再到结果返回的过程。
- 说明 TUI 层和 agent 决策层为什么要分开。
- 判断二次开发时应该改 extension、coding-agent、agent、ai 还是 tui。

## 和 Claude Code 的简短对比

- Pi 更适合学习：包边界清晰，核心链路短，agent loop 更容易单独理解。
- Claude Code 功能更强：权限、工具、UI、IDE、MCP、远程、多 agent 等产品能力更完整。
- 学习顺序建议：先用 Pi 建立 agent mental model，再看 Claude Code 的复杂产品实现。
