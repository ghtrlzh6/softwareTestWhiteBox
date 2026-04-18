import argparse
import json
import os

def generate_test_file(json_file, output_file, prompt_version):
    if not os.path.exists(json_file):
        print(f"JSON file not found: {json_file}")
        return

    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    test_cases = data.get("test_cases", [])
    
    code = [
        "import { describe, it, expect, vi, beforeEach } from 'vitest';",
        "// Automatically generated tests",
        "",
        f"describe('getRequestFunction - {prompt_version}', () => {{",
        "  beforeEach(() => {",
        "    vi.clearAllMocks();",
        "  });\n"
    ]

    for tc in test_cases:
        tc_id = tc.get("id", "TC_unnamed")
        desc = tc.get("notes", "Automatically generated Test Case")
        setup = tc.get("input", {}).get("setup", "// No setup provided")
        
        code.append(f"  it('{tc_id}: {desc}', async () => {{")
        code.append(f"    // Setup")
        for line in setup.splitlines():
            if not line.strip().startswith("//") and not line.strip().endswith(";"):
                code.append(f"    // {line}")
            else:
                code.append(f"    {line}")
        code.append("    // TODO: implement call and assertions.")
        if "expected_output" in tc:
            code.append(f"    // Expected Output: {tc.get('expected_output')}")
        code.append("  });\n")

    code.append("});\n")

    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(code))
        
    print(f"Test generated at {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--prompt-version", required=True)
    args = parser.parse_args()
    
    generate_test_file(args.input, args.output, args.prompt_version)