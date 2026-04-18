# Member B: 自动化白盒测试流水线实现与结果分析报告

## 一、分工与完成情况
作为 Member B，我负责了本次大作业的 **Tool Artifact（工具链与自动化流水线）** 部分。

### 核心产出代码
- **代码提取模块**: `scripts/memberB_extract_source.py`
- **大模型通信模块**: `scripts/memberB_llm_client.py`（已切换并稳定支持 OpenAPI 和 OpenRouter 生态，当前采用 `openai/gpt-5.3-codex` 模型）
- **测试数据转储模块**: `scripts/memberB_save_testcases.py`
- **Vitest 测试生成器**: `scripts/memberB_generate_vitest.py`
- **评价与覆盖率统计模块**: `scripts/memberB_verify_and_report.py`（自动比对源文件代码总行数，抽取 JSON 中的 `covered_statements` 评估覆盖率）
- **全流程调度编排器**: `scripts/memberB_run_pipeline.py`（可通过一条命令实现 源码抽取 -> API 请求 -> JSON 解析 -> .test.ts 生成 -> 覆盖率统计）

所有的测试流转产物均位于 `output/` 文件夹下，包含原始 LLM 响应、结构化 testcases JSON、可运行的 TypeScript 单元测试文件以及最终的大模型覆盖率报告。

---

## 二、测试运行结果与指标分析

测试靶点为知名的开源库 `Got` (`source/core/options.ts` 中的复杂调度函数 `getRequestFunction`)。流水线依据成员 A 提供的三版提示词（Baseline / Few-shot / CoT）自动输出了对应的运行结果：

### 1. Vitest 单元测试运行表现
- ✅ **Baseline (基础用例模式)**: 成功生成 6 个测试用例，**Vitest 完美 100% 编译并运行通过（零手工修改）**。
- ✅ **CoT (思维链模式)**: 成功生成 5 个测试用例，**Vitest 完美 100% 编译并运行通过（零手工修改）**。
- ❌ **Few-shot (小样本模式)**: 成功生成 5 个测试用例，但在通过 Vitest 运行时发生了语法层面的错误（`ReferenceError: any is not defined`）。原因详缝见第三节的“幻觉总结”。

### 2. 覆盖率预估数据分析
根据自动聚合的 `output/coverage_report.json` 模型自估算数据统计如下：

| 测试提示词策略 | 最终用例数 | 预估语句覆盖率 | 实测运行状态 |
|--------------|----------|-------------|------------|
| **Baseline** | 6 | **20.45%** | 100% 通过 ✅ |
| **Few-shot** | 5 | **17.05%** | 编译与运行失败 ❌ |
| **CoT** | 5 | **14.77%** | 100% 通过 ✅ |

**发现与结论**：
1. **Baseline 高覆盖率之谜**：基础模式更容易让大模型发散思维，走“广度优先”策略，穷举各类表层正常数据与基础异常场景，因此命中基础代码行最多。
2. **CoT 的深度与保守估算**：思维链强制大模型一步步推导，其“词元注意力”会被吸入复杂分支（如多重嵌套和 fallback 回调）中，导致广度受限、覆盖率偏低，但也正因如此，它更能产出有效且可靠的深层次用例。

---

## 三、工程挑战与“大模型幻觉”应对复盘

在实际跑通 LLM 到纯净执行脚本的链路上，遇到了大量工程与提示工程的摩擦，并逐步克服：

1. **突破封装隔离 (TS private field `#`)**
   - **问题**: 生成的测试试图去访问 `instance.#internals` 测试私有逻辑，引发 Typescript 的沙盒隔离抛错。
   - **应对**: 及时逆向更新并在自动化模板注入规则：明令禁止 `#` 符号，统一强制走 `(instance as any).internals` 的强转策略以破坏保护墙实现白盒覆盖。
2. **“过拟合”与“伪代码幻觉”**
   - **问题**: 早期 Few-shot 时常把 `import` 及 `describe/test` 包装整个揉进 JSON 的 `setup` 字段内。即便修复后，由于大模型在参考小样本时强行模仿却产生了语法倒挂（将类 Mock 语句强行变成注释，导致 `any` 未定义）。这是一次绝佳的大模型 **“示例依赖过拟合(Few-shot Overfitting)”反面教材**。
   - **应对**: 前者通过严格重写 Prompt 指令 `CRITICAL RULES FOR GENERATION` 禁用上层壳并在流水线后置封装完美解决。
3. **OpenRouter 与 JSON 约束冲突**
   - **问题**: 原计划要求的 `{"type": "json_object"}` 并非所有开放模型都完全原生兼容，常常导致接口无响应。
   - **应对**: 修改了 `memberB_llm_client.py` 中的 API 通信配置，移除了死板 API 参数约束，主要依靠指令控制与稳健的 JSON 解析落盘方案，保障了平台的高可用性。
4. **自然语言描述与可执行代码的“格式鸿沟”**
   - **问题**: 初期 LLM 在 JSON 的 `setup` 字段中倾向于输出自然语言（如：“Mock this.#internals with customRequest undefined”），导致转译出的 `.test.ts` 文件内全是无法合法编译运行的占位语句，Vitest 大规模报错。
   - **应对**: 实施了严格的提示词工程（Prompt Engineering），在流水线运行时向三个策略的 Prompt 文件末尾动态追加了 `CRITICAL RULES FOR GENERATION` 约束。运用强指令约束（"MUST contain ONLY valid, executable TypeScript syntax... Do not use any natural language"），成功逼迫模型从语义描述转向了真实的 `const instance = new (class extends ...)` 对象初始化语法，让测试文件直接具备了工程运行的潜力。