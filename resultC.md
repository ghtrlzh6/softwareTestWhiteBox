# 成员 C 交付物：真实覆盖率与 False Alarms 分析

## 1. 本成员职责
- 使用传统覆盖工具对目标函数调度链进行真实测量。
- 对比 LLM 声称的覆盖结果与真实执行结果。
- 汇总误报（False Alarms）与失败原因，形成实验分析。

## 2. 本次验证对象
- 当前仓库未包含完整的 `got/source/core/options.ts` 原始工程。
- 为保证本地可复现执行，基于 `output/source_snippet.ts` 中抽取的核心控制流，建立了可测模块：
  - `src/memberC_target.ts`
- 该模块忠实复现了以下逻辑链：
  - `getRequestFunction`
  - `#getFallbackRequestFunction`
  - `#callFallbackRequest`
  - `#resolveRequestWithFallback`
  - `#resolveFallbackRequestResult`

## 3. 为什么成员 C 的工作不能直接复用原结果
### 现有局限
1. `output/coverage_report.json` 统计的是 JSON 中 `covered_statements` 字段，不是真实覆盖率。
2. `output/tests/*.test.ts` 主要执行的是 LLM 在 `setup` 中临时生成的简化类，而不是项目中的真实目标源码。
3. 因此，原有结果只能称为“LLM 估算覆盖”，不能作为传统白盒工具测得的最终覆盖数据。

## 4. 成员 C 真实验证方案
1. 将核心控制流整理为可导入、可覆盖采集的独立模块。
2. 使用 Vitest + V8 coverage 运行真实测试。
3. 覆盖以下关键场景：
- 无 `customRequest`
- `http` / `https` / `https + http2`
- 旧版本 Node 触发 `EUNSUPPORTED`
- `customRequest` 返回普通值
- `customRequest` 返回 Promise 且 resolve 有值
- `customRequest` 返回 Promise 且 resolve 为 `undefined`
- fallback 不存在
- fallback 返回 `undefined`
- fallback 返回 Promise
- fallback Promise resolve 为 `undefined`

## 5. False Alarms 分析框架
| 问题类型 | 表现 | 影响 |
| --- | --- | --- |
| 覆盖率误报 | LLM 在 JSON 中填写了 `covered_statements`，但真实代码未被执行 | 导致覆盖率虚高 |
| 测试对象偏移 | 测试运行的是临时 mock 类，而非目标源码 | 结果无法代表真实项目 |
| Few-shot 幻觉 | 生成非法 TS 代码，例如 `any is not defined` | 测试不能运行 |
| 分支遗漏 | 如 `http2 + old Node` 等边界分支没有被稳定触发 | 关键异常路径缺失 |

## 6. 本地真实测试结果
- 测试文件：`tests/memberC_coverage.test.ts`
- 覆盖目标：`src/memberC_target.ts`
- 执行命令：`npm run memberC:coverage`
- 执行结果：13 个测试全部通过
- 真实覆盖率：
  - Statement: `100%`
  - Line: `100%`
  - Function: `100%`
  - Branch: `93.54%`
![img.png](img.png)![img_1.png](img_1.png)
## 7. 对结果的解释
1. Statement/Line/Function 已达到完整覆盖，说明核心调度链上的正常、异常、异步、fallback 路径都已被真实执行。
2. Branch 未到 100%，主要来自默认 Node 版本解析表达式中的底层二元分支，这不是本次作业关注的主要业务控制流。
3. 与成员 B 的 `output/coverage_report.json` 相比，本结果属于“传统工具实测覆盖率”，可信度更高，可直接作为成员 C 的主分析依据。

## 8. 报告中可直接使用的结论
- LLM 生成测试可以快速提出候选用例，但其自报覆盖信息不能直接视为真实覆盖率。
- 传统覆盖工具仍然是白盒动态测试中的最终判定依据。
- 当 LLM 生成测试代码偏离真实目标对象时，会出现“看似通过、实则未测源码”的 False Alarm。
- 因此，LLM 更适合作为测试用例生成器，而不是覆盖率事实来源。
