import argparse
import json
import os
import jsonschema

SCHEMA = {
    "type": "object",
    "required": ["function", "test_cases"],
    "properties": {
        "function": {"type": "string"},
        "test_cases": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["input", "expected_output", "covered_statements"],
                "properties": {
                    "input": {"type": "object"},
                    "expected_output": {},
                    "covered_statements": {
                        "type": "array",
                        "items": {"type": "integer"}
                    }
                }
            }
        }
    }
}

def parse_and_save(input_file, output_file):
    with open(input_file, "r", encoding="utf-8") as f:
        raw_text = f.read()

    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON: {e}")
        return

    try:
        jsonschema.validate(instance=data, schema=SCHEMA)
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Validated and saved: {output_file}")
    except jsonschema.exceptions.ValidationError as err:
        print(f"JSON validation failed: {err.message}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    
    parse_and_save(args.input, args.output)