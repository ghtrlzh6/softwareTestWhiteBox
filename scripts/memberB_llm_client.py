import os
import argparse
import json
from openai import OpenAI

def call_llm(prompt_version, source_file, model, output_file):
    client = OpenAI(
        api_key=os.environ.get("OPENAI_API_KEY"),
        base_url=os.environ.get("OPENAI_BASE_URL", "https://openrouter.ai/api/v1"),
        default_headers={"HTTP-Referer": "http://localhost:3000", "X-Title": "WhiteboxTests"},
        timeout=180.0
    )
    
    with open(source_file, "r", encoding="utf-8") as f:
        source_code = f.read()

    prompt_path = f"prompts/{prompt_version}.txt"
    if not os.path.exists(prompt_path):
        prompt_content = f"Generate tests for the following TypeScript code:\n\n<SOURCE_CODE>\n{source_code}\n</SOURCE_CODE>"
    else:
        with open(prompt_path, "r", encoding="utf-8") as f:
            prompt_content = f.read()
            prompt_content = prompt_content.replace("<SOURCE_CODE>", source_code)
            prompt_content = prompt_content.replace("<FUNCTION_NAME>", "getRequestFunction")
            prompt_content = prompt_content.replace("<FILE_PATH>", "source/core/options.ts")

    print(f"Calling LLM ({model}) using prompt {prompt_version}...")
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are an expert software tester. Output valid JSON only, obeying the schema."},
                {"role": "user", "content": prompt_content + "\n\nCRITICAL: RETURN RAW JSON ONLY. DO NOT USE MARKDOWN CODE BLOCKS."}
            ]
        )
        
        result_text = response.choices[0].message.content
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(result_text)
            
        print(f"LLM response saved to {output_file}")
    except Exception as e:
        print(f"Error calling LLM: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt-version", required=True)
    parser.add_argument("--source-file", required=True)
    parser.add_argument("--model", default="openai/gpt-5.3-codex")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    
    call_llm(args.prompt_version, args.source_file, args.model, args.output)