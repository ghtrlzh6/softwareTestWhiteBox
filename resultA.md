# 成员A白盒测试设计（Got）

## 1. 被测代码库与函数（含代码片段）

- 代码库：Got（Node.js HTTP client）
- 主测函数：Options.getRequestFunction 及其回退链
- 备选函数：Request._makeRequest、Request._onResponseBase

### 主测函数核心代码（source/core/options.ts，片段）

```ts
// 只展示主流程和关键分支
getRequestFunction() {
  const {request: customRequest} = this.#internals;
  if (!customRequest) {
    return this.#getFallbackRequestFunction();
  }
  const requestWithFallback: RequestFunction = (url, options, callback?) => {
    const result = customRequest(url, options, callback);
    if (is.promise(result)) {
      return this.#resolveRequestWithFallback(result, url, options, callback);
    }
    if (result !== undefined) {
      return result;
    }
    return this.#callFallbackRequest(url, options, callback);
  };
  return requestWithFallback;
}

// 回退分支
#getFallbackRequestFunction() {
  const url = this.#internals.url as (URL | undefined);
  if (!url) return;
  if (url.protocol === 'https:') {
    if (this.#internals.http2) {
      if (major < 15 || (major === 15 && minor < 10)) {
        const error = new Error('To use the `http2` option, install Node.js 15.10.0 or above');
        (error as NodeJS.ErrnoException).code = 'EUNSUPPORTED';
        throw error;
      }
      return http2wrapper.auto as RequestFunction;
    }
    return https.request;
  }
  return http.request;
}
```

---

## 2. 最佳 Prompt 策略

### Prompt 优化过程

#### V1（基线版）
```text
You are a white-box testing assistant.
Generate statement-coverage test cases for the given TypeScript function.
Return strict JSON.
```

问题：覆盖点不全，异常路径经常漏测。

#### V2（结构约束版）
```text
You are a professional white-box testing assistant.
Task: Generate statement-coverage-oriented test cases for the given TypeScript function.

Requirements:
1) Enumerate all executable statements and branches.
2) Include normal, boundary, and exception scenarios.
3) Output STRICT JSON only.
4) Mark unreachable statements with reasons.
```

改进：JSON 稳定性提升，但 Promise/fallback 分支仍偶尔遗漏。

#### V3（最终选用版）
```text
You are a professional white-box testing assistant specialized in TypeScript control-flow analysis.
Task: Generate statement-coverage-oriented tests for `getRequestFunction` in `source/core/options.ts`.

Hard requirements:
1) Cover all executable statements and key branches:
   - no customRequest -> fallback
   - customRequest returns value
   - customRequest returns undefined -> fallback
   - customRequest returns Promise resolved value
   - customRequest returns Promise resolved undefined -> TypeError
   - fallback missing/undefined -> TypeError
2) Include normal, boundary, and exception scenarios.
3) Output RAW JSON only (no markdown, no comments, no extra text).
4) Each case must include: input, expected_output, expected_exception, covered_statements, notes.
5) If any statement is unreachable, list it in `unreachable` with reason.
6) Do not invent APIs not present in source code.

Input:
- function_name: getRequestFunction
- target_file: source/core/options.ts
- source_code: <完整源码>
- test_framework: vitest

Output schema:
{
  "function": "getRequestFunction",
  "test_cases": [
    {
      "input": { ... },
      "expected_output": "...",
      "expected_exception": "...",
      "covered_statements": [ ... ],
      "notes": "..."
    }
  ],
  "unreachable": [
    { "statement": ..., "reason": "..." }
  ]
}
```

最终选用：V3（最终选用版）。

---

## 3. 模型选择

- 推荐模型：GPT-4.0（或更高版本）

---

## 4. 核心测试逻辑设计

1. 解析目标函数源码，提取所有可执行语句和分支。
2. 用上述 Prompt 生成结构化 JSON 测试用例，确保覆盖所有分支（同步、异步、异常、回退）。
3. 将 JSON 转为 Vitest 测试脚本，mock 依赖（如 customRequest、Node 版本等）。
4. 执行测试并采集语句/分支覆盖率，回填真实覆盖行号。
5. 若有未覆盖语句，补充定向 Prompt 生成新用例，直至覆盖率达标。
6. 不可达语句需在报告中说明原因。

