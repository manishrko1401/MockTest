import re
import json

def clean_pdf_text(t):
    t = t.replace('/G30', '0').replace('/G31', '1').replace('/G32', '2').replace('/G33', '3').replace('/G34', '4').replace('/G35', '5').replace('/G36', '6').replace('/G37', '7').replace('/G38', '8').replace('/G39', '9')
    t = t.replace('/G3C', '\n').replace('/G6C', '\n')
    return t

def clean_prose(text):
    if not text:
        return ""
    # Remove exam source tags in parentheses at the end or middle
    text = re.sub(r'\(SSC[\s\S]*?\)', '', text)
    text = re.sub(r'\(FCI[\s\S]*?\)', '', text)
    text = re.sub(r'\(Constable[\s\S]*?\)', '', text)
    text = re.sub(r'SSC\s+CGL[\s\S]*?sitting\)', '', text, flags=re.IGNORECASE)
    text = re.sub(r'SSC[\s\S]*?Exam[\s\S]*?sitting\)?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Question No\.?\s*\([\d\-–\s\?]+\)\s*:?', '', text)
    text = re.sub(r'Directions\s*:[\s\S]*?given in bold\.', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Select the\s+option that means the\s+same as the given idiom\.?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Select the\s+most appropriate meaning of the given idiom\.?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Must Read Buy Today[\s\S]*?KNOWLEDGE', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Kiran’s ONE LINER APPROACH[\s\S]*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'/G\w+', '', text)
    # Join hyphenated words
    text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)
    # Replace newlines with spaces
    text = ' '.join(text.split())
    return text.strip()

# 1. PARSE CORRECT OPTIONS (1..1018)
with open("dump_correct.txt", encoding="utf-8") as f:
    text_c = clean_pdf_text(f.read())

matches_c = re.findall(r'(\d+)\s*\.\s*\(([1-4])\)', text_c)
correct_options_map = {int(k): int(v) for k, v in matches_c}

# 2. PARSE SOLUTIONS (1..1018)
with open("dump_solutions.txt", encoding="utf-8") as f:
    text_s = clean_pdf_text(f.read())

sol_splits = re.split(r'(?:^|\n)(\d+)\s*\.\s*\(([1-4])\)\s*', text_s)
solutions_map = {}
for i in range(1, len(sol_splits), 3):
    qnum = int(sol_splits[i])
    opt = int(sol_splits[i+1])
    stext = sol_splits[i+2].strip()
    stext = clean_prose(stext)
    solutions_map[qnum] = stext

# 3. PARSE QUESTIONS & OPTIONS (1..1018)
with open("dump_questions.txt", encoding="utf-8") as f:
    raw_q = clean_pdf_text(f.read())

raw_q = re.sub(r'(\d+)\s*-\s*(?=[A-Za-z])', r'\1. ', raw_q)
sanitized_q = re.sub(r'\d{1,2}\.\d{1,2}\.\d{2,4}', '', raw_q)

lines = sanitized_q.split('\n')
clean_lines = [l for l in lines if not (l.strip().startswith('--- PAGE') or l.strip().startswith('IDIOMS/PHRASES') or l.strip().startswith('SEE'))]
text_q = '\n'.join(clean_lines)

final_questions = []
missing_details = []

for num in range(1, 1019):
    pattern = rf'(?:^|\n)\s*{num}\s*\.\s*([\s\S]*?)(?=(?:\n)\s*{num+1}\s*\.|\Z)'
    match = re.search(pattern, text_q)
    if not match:
        missing_details.append(f"Missing Q{num} text block")
        continue
    
    qcontent = match.group(1).strip()
    
    # Extract 4 options (1)... (2)... (3)... (4)...
    # Option regex handling optional parenthesis like (1 or (1)
    opt_matches = list(re.finditer(r'\(([1-4])\)?\s*', qcontent))
    if len(opt_matches) < 4:
        opt_matches = list(re.finditer(r'\(?([1-4])\)\s*', qcontent))
        
    if len(opt_matches) >= 4:
        q_stem = qcontent[:opt_matches[0].start()].strip()
        opt1 = qcontent[opt_matches[0].end():opt_matches[1].start()].strip()
        opt2 = qcontent[opt_matches[1].end():opt_matches[2].start()].strip()
        opt3 = qcontent[opt_matches[2].end():opt_matches[3].start()].strip()
        opt4 = qcontent[opt_matches[3].end():].strip()
    else:
        q_stem = qcontent
        opt1, opt2, opt3, opt4 = "", "", "", ""
        missing_details.append(f"Q{num} options parse issue (found {len(opt_matches)})")

    q_stem_clean = clean_prose(q_stem)
    opt1_clean = clean_prose(opt1)
    opt2_clean = clean_prose(opt2)
    opt3_clean = clean_prose(opt3)
    opt4_clean = clean_prose(opt4)

    correct_1_based = correct_options_map.get(num, 1)
    correct_0_based = correct_1_based - 1 # 0-indexed for web portal
    
    sol_text = solutions_map.get(num, "")
    if not sol_text:
        # Fallback to option meaning if available
        sol_text = f"The correct answer is Option ({correct_1_based}): {[opt1_clean, opt2_clean, opt3_clean, opt4_clean][correct_0_based]}"

    item = {
        "id": f"idioms_q{num}",
        "questionText": {
            "en": q_stem_clean,
            "hi": q_stem_clean
        },
        "options": [
            { "en": opt1_clean, "hi": opt1_clean },
            { "en": opt2_clean, "hi": opt2_clean },
            { "en": opt3_clean, "hi": opt3_clean },
            { "en": opt4_clean, "hi": opt4_clean }
        ],
        "correctOption": correct_0_based,
        "explanation": {
            "en": sol_text,
            "hi": sol_text
        }
    }
    final_questions.append(item)

print(f"Generated {len(final_questions)} questions!")
print(f"Parse warnings/missing count: {len(missing_details)}")
if missing_details:
    print("Sample issues:", missing_details[:10])

# Save to questions_idioms_phrases_practice_default.json
output_filename = "questions_idioms_phrases_practice_default.json"
with open(output_filename, "w", encoding="utf-8") as f:
    json.dump(final_questions, f, indent=2, ensure_ascii=False)

print(f"Saved {output_filename} successfully!")
