import json

with open("active_passive_all_questions.json", encoding="utf-8") as f:
    sample = json.load(f)

print("Total questions in sample:", len(sample))
print("First question object keys:", sample[0].keys())
print("First question sample:\n", json.dumps(sample[0], indent=2))
