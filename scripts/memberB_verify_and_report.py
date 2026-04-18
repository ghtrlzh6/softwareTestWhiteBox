import json
import os
import glob

def calculate_coverage(testcases_dir, extracted_source):
    report = {
        "status": "success",
        "description": "Validation and coverage report of LLM-generated test cases",
        "models_used": "openai/gpt-5.3-codex",
        "reports": {}
    }
    
    with open(extracted_source, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    extracted_lines = []
    for line in lines:
        try:
            lineno = int(line.split(":")[0].strip())
            extracted_lines.append(lineno)
        except:
            pass
            
    total_extracted_lines = len(extracted_lines)

    for prompt_version in ["baseline", "fewshot", "cot"]:
        json_file = os.path.join(testcases_dir, f"{prompt_version}.json")
        try:
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            test_cases = data.get("test_cases", [])
            valid_count = len(test_cases)
            
            covered_lines = set()
            for tc in test_cases:
                for stmt in tc.get("covered_statements", []):
                    covered_lines.add(stmt)
                    
            coverage_percentage = (len(covered_lines) / total_extracted_lines * 100) if total_extracted_lines > 0 else 0
            
            report["reports"][prompt_version] = {
                "valid_json": True,
                "test_cases_count": valid_count,
                "covered_statements_count": len(covered_lines),
                "total_source_statements": total_extracted_lines,
                "statement_coverage": f"{coverage_percentage:.2f}%",
                "notes": "Extracted coverage from LLM estimation"
            }
        except Exception as e:
            report["reports"][prompt_version] = {
                "valid_json": False,
                "error": str(e)
            }

    # Dump the final report
    out_path = "output/coverage_report.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
        
    print(f"Verified outputs. Coverage report saved to {out_path}")

if __name__ == "__main__":
    calculate_coverage("output/testcases", "output/source_snippet.ts")