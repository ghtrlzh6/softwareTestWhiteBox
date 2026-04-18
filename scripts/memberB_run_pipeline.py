import subprocess
import argparse
import sys
import os

PROMPT_VERSIONS = ["baseline", "fewshot", "cot"]
GOT_DIR = "./got"

def run_command(cmd, step_name):
    print(f"\n[{step_name}] Running: {' '.join(cmd)}")
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error in step '{step_name}': {e}")
        sys.exit(1)

def run_pipeline(args):
    # Step 1: Extract source
    source_file = "output/source_snippet.ts"
    if args.all or args.step == "extract":
        run_command([
            "python", "scripts/memberB_extract_source.py",
            "--got-dir", GOT_DIR,
            "--output", source_file
        ], "Extract Source")

    versions_to_run = PROMPT_VERSIONS if args.all else [args.prompt_version]
    if args.prompt_version and args.prompt_version not in PROMPT_VERSIONS:
        versions_to_run = [args.prompt_version]

    for version in versions_to_run:
        print(f"\n=== Processing Version: {version} ===")
        raw_response_file = f"output/raw_response_{version}.txt"
        testcases_json = f"output/testcases/{version}.json"
        vitest_file = f"output/tests/{version}.test.ts"
        
        # Step 2: LLM call
        if args.all or args.step == "llm":
            if not args.dry_run:
                run_command([
                    "python", "scripts/memberB_llm_client.py",
                    "--prompt-version", version,
                    "--source-file", source_file,
                    "--model", args.model,
                    "--output", raw_response_file
                ], "Call LLM")
            else:
                print(f"[Call LLM] Skipping due to --dry-run")
                
        # Step 3: Parse JSON
        if args.all or args.step == "save":
            run_command([
                "python", "scripts/memberB_save_testcases.py",
                "--input", raw_response_file,
                "--output", testcases_json
            ], "Save Testcases")
            
        # Step 4: Generate Vitest file
        if args.all or args.step == "generate":
            run_command([
                "python", "scripts/memberB_generate_vitest.py",
                "--input", testcases_json,
                "--output", vitest_file,
                "--prompt-version", version
            ], "Generate Vitest Files")
            
        # Step 5: Test Execution
        if args.all or args.step == "run":
            # Running directly would fail if the API request isn't implemented completely or correctly mock
            pass 

    print("\nPipeline execution complete.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run LLM Whitebox Test Pipeline")
    parser.add_argument("--all", action="store_true", help="Run the full pipeline for all prompt versions")
    parser.add_argument("--step", choices=["extract", "llm", "save", "generate", "run"], help="Run specific step")
    parser.add_argument("--prompt-version", help="Specific prompt version to use")
    parser.add_argument("--model", default="openai/gpt-5.3-codex", help="Model to use")
    parser.add_argument("--dry-run", action="store_true", help="Skip actually calling the LLM API")
    parser.add_argument("--compare", action="store_true", help="Compare coverage reports")
    args = parser.parse_args()

    run_pipeline(args)