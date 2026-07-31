import json

with open("speech_all_questions.json", encoding="utf-8") as f:
    sample2 = json.load(f)

print("Speech sample question:\n", json.dumps(sample2[0], indent=2))
