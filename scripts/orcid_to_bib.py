orcid = '0000-0003-3683-8764' # Fill your orcid here

import requests
import os
import re

response = requests.get('https://pub.orcid.org/v3.0/{}/works'.format(orcid),
                        headers={"Accept": "application/orcid+json" })
record = response.json()

put_codes = []
for work in record['group']:
    put_code = work['work-summary'][0]['put-code']
    put_codes.append(put_code)

citations = []
for put_code in put_codes:
    response = requests.get('https://pub.orcid.org/v3.0/{}/work/{}'.format(orcid, put_code),
                            headers={"Accept": "application/orcid+json" })
    work = response.json()
    doi = work['external-ids']['external-id'][0]['external-id-value']
    url = f"https://doi.org/{doi}"
    headers = {"Accept": "application/x-bibtex"}
    r = requests.get(url, headers=headers)
    bibtex_entry = re.sub(r.text[r.text.find('{')+1:r.text.find(',')], r.text[r.text.find('{')+1:r.text.find(',')]+'_'+doi.replace('/', '_').replace('.', '-'), r.text)
    # if not re.search(r"\bpages\s*=\s*[{\"].+?[}\"].*", bibtex_entry, re.IGNORECASE):
    #     print("Pages field is missing")
    citations.append(bibtex_entry)

# Ensure the folder exists
os.makedirs('../_bibliography', exist_ok=True)

with open('../_bibliography/output.bib', 'w+') as bibfile:
    for citation in citations:
        bibfile.write(citation)
        bibfile.write('\n')