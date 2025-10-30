import os
import re
import requests

ROOT_PATH = "../_publications/"  # root folder containing year subfolders

def get_semantic_scholar_id_from_doi(doi: str) -> str | None:
    url = f"https://api.semanticscholar.org/graph/v1/paper/DOI:{doi}?fields=paperId"
    r = requests.get(url)

    if r.status_code != 200:
        print(f"⚠️ Semantic Scholar request failed for DOI {doi}: HTTP {r.status_code}")
        return None

    data = r.json()
    return data.get("paperId")


def insert_ss_id(md_path: str, paper_id: str) -> bool:
    with open(md_path, "r") as f:
        lines = f.readlines()

    # Already present?
    if any("semantic_scholar_id:" in line for line in lines):
        print(f"⏩ Already has semantic_scholar_id: {md_path}")
        return False

    new_lines = []
    inserted = False

    for line in lines:
        new_lines.append(line)

        # Insert below pub_date:
        if line.strip().startswith("pub_date:") and not inserted:
            new_lines.append(f"semantic_scholar_id: {paper_id}\n")
            inserted = True

    if not inserted:
        print(f"⚠️ No pub_date found in {md_path} → skipping")
        return False

    with open(md_path, "w") as f:
        f.writelines(new_lines)

    print(f"✅ Inserted for {md_path}")
    return True


def process_publications():
    for root, _, files in os.walk(ROOT_PATH):
        for filename in files:
            if not filename.endswith(".md"):
                continue

            md_path = os.path.join(root, filename)

            with open(md_path, "r") as f:
                text = f.read()

            # Extract DOI from YAML
            match = re.search(r"DOI:\s*(https?://(?:dx\.)?doi\.org/)?([^\s]+)", text, re.IGNORECASE)
            if not match:
                print(f"⚠️ No DOI found in {md_path}")
                continue

            doi = match.group(2).strip()

            paper_id = get_semantic_scholar_id_from_doi(doi)
            if not paper_id:
                print(f"❌ Could not fetch ID for DOI {doi}")
                continue

            insert_ss_id(md_path, paper_id)


if __name__ == "__main__":
    process_publications()
    print("\n🎉 All done!")
