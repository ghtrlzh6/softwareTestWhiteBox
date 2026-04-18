import argparse
import os

def extract_code(got_dir: str, output_path: str):
    target_file = os.path.join(got_dir, "source", "core", "options.ts")
    
    if not os.path.exists(target_file):
        print(f"File not found: {target_file}")
        return

    with open(target_file, "r", encoding="utf-8") as f:
        lines = f.readlines()

    extracted_lines = []
    capture = False
    
    for i, line in enumerate(lines):
        if "getRequestFunction" in line or "fallback" in line.lower():
            capture = True
        
        if capture:
            extracted_lines.append(f"{i + 1}: {line}")
            
        if capture and line.strip() == "}":
            capture = False 

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.writelines(extracted_lines)
    
    print(f"Source code extracted to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--got-dir", required=True, help="Path to got source directory")
    parser.add_argument("--output", required=True, help="Output file path")
    args = parser.parse_args()
    
    extract_code(args.got_dir, args.output)