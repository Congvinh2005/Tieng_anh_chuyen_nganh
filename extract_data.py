import zipfile
import xml.etree.ElementTree as ET
import re
import json

with zipfile.ZipFile("Phiếu ôn tập cuối kỳ.docx") as z:
    t1 = ET.fromstring(z.read("word/document.xml"))
with zipfile.ZipFile("Đáp án đề cương TACN.docx") as z:
    t2 = ET.fromstring(z.read("word/document.xml"))

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
b1 = t1.find(f"{W}body")
b2 = t2.find(f"{W}body")

# ==============================================================
# PART 1: Match terms and definitions
# ==============================================================
# In P1: table 5 has Column A (Term) and Column B (Definition)
# In P2: table 1 has Term, Definition, Vietnamese Translation
part1_items = []
tbl1_p2 = b2[1]
for row in tbl1_p2.findall(f"{W}tr")[1:]:
    cells = row.findall(f"{W}tc")
    c0 = "".join([elem.text for elem in cells[0].iter(f"{W}t") if elem.text]).strip()
    c1 = "".join([elem.text for elem in cells[1].iter(f"{W}t") if elem.text]).strip()
    c2 = "".join([elem.text for elem in cells[2].iter(f"{W}t") if elem.text]).strip() if len(cells) > 2 else ""
    term_clean = re.sub(r"^\d+\.\s*", "", c0).strip()
    part1_items.append({
        "id": len(part1_items) + 1,
        "term": term_clean,
        "definition": c1,
        "vietnamese": c2
    })

print(f"Extracted {len(part1_items)} items for Part 1.")

# ==============================================================
# PART 2: Fill in the blank
# ==============================================================
tbl2_p1 = b1[8]
p1_blanks = []
for row in tbl2_p1.findall(f"{W}tr"):
    cells = row.findall(f"{W}tc")
    num = "".join([elem.text for elem in cells[0].iter(f"{W}t") if elem.text]).strip()
    txt = "".join([elem.text for elem in cells[1].iter(f"{W}t") if elem.text]).strip()
    p1_blanks.append((num, txt))

p2_sentences = []
for i in range(4, 54):
    p = b2[i]
    txt = "".join([elem.text for elem in p.iter(f"{W}t") if elem.text]).strip()
    p2_sentences.append(txt)

part2_items = []
for idx, (num, q_raw) in enumerate(p1_blanks):
    full_sent = p2_sentences[idx]
    
    # Extract the blank by comparing q_raw with full_sent
    # The blank in q_raw is marked by dots (..., ....., or …)
    parts = re.split(r"[.]{3,}|…+", q_raw)
    
    norm_full = " ".join(full_sent.split())
    if len(parts) >= 2:
        prefix = " ".join(parts[0].strip().split())
        suffix = " ".join(parts[1].strip().split())
        
        # Find prefix location
        p_idx = 0
        if prefix:
            pos_p = norm_full.lower().find(prefix.lower())
            if pos_p != -1:
                p_idx = pos_p + len(prefix)
            else:
                # try last few words
                words = prefix.split()
                if len(words) > 1:
                    pos_p = norm_full.lower().find(" ".join(words[-2:]).lower())
                    if pos_p != -1:
                        p_idx = pos_p + len(" ".join(words[-2:]))
        
        # Find suffix location
        s_idx = len(norm_full)
        if suffix:
            pos_s = norm_full.lower().find(suffix[:25].lower(), p_idx)
            if pos_s != -1:
                s_idx = pos_s
            else:
                words = suffix.split()
                if words:
                    pos_s = norm_full.lower().find(words[0].lower(), p_idx)
                    if pos_s != -1:
                        s_idx = pos_s
        
        blank_ans = norm_full[p_idx:s_idx].strip()
        blank_ans = re.sub(r"^[,.:;\s]+|[,.:;\s]+$", "", blank_ans)
    else:
        blank_ans = ""
    
    part2_items.append({
        "id": int(num) if num.isdigit() else idx + 1,
        "question": q_raw,
        "answer": blank_ans,
        "full_sentence": full_sent
    })

print(f"Extracted {len(part2_items)} items for Part 2.")

# ==============================================================
# PART 3: True / False
# ==============================================================
tbl3_p1 = b1[10]
p1_part3 = []
for row in tbl3_p1.findall(f"{W}tr"):
    cells = row.findall(f"{W}tc")
    num = "".join([elem.text for elem in cells[0].iter(f"{W}t") if elem.text]).strip()
    txt = "".join([elem.text for elem in cells[1].iter(f"{W}t") if elem.text]).strip()
    txt_clean = re.sub(r"^_{2,}\s*", "", txt).strip()
    p1_part3.append((num, txt_clean))

p2_part3_raw = []
for i in range(56, 106):
    p = b2[i]
    txt = "".join([elem.text for elem in p.iter(f"{W}t") if elem.text]).strip()
    p2_part3_raw.append(txt)

# Match Part 3 questions with answers
part3_items = []

# Special known cases from our analysis:
# Line 61 in p2 was just "F" for question 6 ("A field is a group of records holding large amount of information.")
# Swapped 13 & 14 in p2: 13 in p1 is Personal Database, 14 is Personal Digital Assistant.
for idx, (num, q_txt) in enumerate(p1_part3):
    q_num = int(num) if num.isdigit() else idx + 1
    
    # Find matching answer in p2_part3_raw
    matched_ans = None
    if q_num == 6:
        matched_ans = "F A field is a group of records holding large amount of information. (A field is a single piece of information, while a record is a group of fields)"
    else:
        # search by question substring
        q_sub = " ".join(q_txt.split()[:4]).lower()
        for a_txt in p2_part3_raw:
            if q_sub in a_txt.lower():
                matched_ans = a_txt
                break
        if not matched_ans:
            # fallback by index
            matched_ans = p2_part3_raw[idx]
    
    # Parse T or F
    is_true = matched_ans.strip().startswith("T")
    # Parse explanation (often in parentheses)
    explanation = ""
    m_exp = re.search(r"\((.+)\)$", matched_ans)
    if m_exp:
        explanation = m_exp.group(1).strip()
    elif not is_true and q_num == 6:
        explanation = "A field is a single piece of data, while a record is a group of related fields."
    
    part3_items.append({
        "id": q_num,
        "statement": q_txt,
        "answer": "T" if is_true else "F",
        "explanation": explanation,
        "raw_answer": matched_ans
    })

print(f"Extracted {len(part3_items)} items for Part 3.")

# Save everything to a JSON file
all_data = {
    "part1": {
        "title": "Phần I: Nối từ và định nghĩa (Matching Terms & Definitions)",
        "description": "Học 48 thuật ngữ CNTT, định nghĩa tiếng Anh và dịch nghĩa tiếng Việt.",
        "items": part1_items
    },
    "part2": {
        "title": "Phần II: Điền từ vào chỗ trống (Fill in the blanks)",
        "description": "50 câu điền từ/cụm từ thích hợp dựa theo đề cương.",
        "items": part2_items
    },
    "part3": {
        "title": "Phần III: Quyết định Đúng/Sai (True or False)",
        "description": "50 câu phán đoán Đúng (T) hay Sai (F) kèm giải thích chi tiết.",
        "items": part3_items
    }
}

with open("study_data.json", "w", encoding="utf-8") as f:
    json.dump(all_data, f, ensure_ascii=False, indent=2)

print("Saved successfully to study_data.json!")
