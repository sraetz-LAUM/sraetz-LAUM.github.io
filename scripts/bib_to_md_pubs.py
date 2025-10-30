# Adapted from Publications markdown generator for academicpages


from pybtex.database.input import bibtex
import pybtex.database.input.bibtex
from time import strptime
import string
import html
import os
import re

bibfile = 'output.bib'

# publist = {
#     "proceeding": {
#         "file" : "proceedings.bib",
#         "venuekey": "booktitle",
#         "venue-pretext": "In the proceedings of ",
#         "collection" : {"name":"publications",
#                         "permalink":"/publication/"}
#
#     },
#     "journal":{
#         "file": "_bibliography/papers.bib",
#         "venuekey" : "journal",
#         "venue-pretext" : "",
#         "collection" : {"name":"publications",
#                         "permalink":"/publication/"}
#     }
# }
publist = {
    "journal": {
        "file": "../_bibliography/" + bibfile,
        "venuekey": "journal",
        "venue-pretext": "",
        "collection": {"name": "publications",
                       "permalink": "/publication/"},
        "category": {"name": "manuscripts"}
    }
}

html_escape_table = {
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;"
}


def html_escape(text):
    """Produce entities within text."""
    return "".join(html_escape_table.get(c, c) for c in text)


for pubsource in publist:
    parser = bibtex.Parser()
    bibdata = parser.parse_file(publist[pubsource]["file"])

    #loop through the individual references in a given bibtex file
    for bib_id in bibdata.entries:
        #reset default date
        pub_year = "1900"
        pub_month = "01"
        pub_day = "01"

        b = bibdata.entries[bib_id].fields

        try:

            pub_year = f'{b["year"]}'

            #todo: this hack for month and day needs some cleanup
            if "month" in b.keys():
                if (len(b["month"]) < 3):
                    pub_month = "0" + b["month"]
                    pub_month = pub_month[-2:]
                elif (b["month"] not in range(12)):
                    tmnth = strptime(b["month"][:3], '%b').tm_mon
                    pub_month = "{:02d}".format(tmnth)
                else:
                    pub_month = str(b["month"])
            if "day" in b.keys():
                pub_day = str(b["day"])

            pub_date = pub_year + "-" + pub_month + "-" + pub_day

            #strip out {} as needed (some bibtex entries that maintain formatting)
            clean_title = b["title"].replace("{", "").replace("}", "").replace("\\", "")#.replace(" ", "-")

            # url_slug = re.sub("\\[.*\\]|[^a-zA-Z0-9_-]", "", clean_title)
            # url_slug = url_slug.replace("--", "-")

            md_filename = bib_id + ".md" #(str(pub_date) + "-" + url_slug + ".md").replace("--", "-")
            # html_filename = bib_id#(str(pub_date) + "-" + url_slug).replace("--", "-")

            #Build Citation from text
            citation = ""

            # #citation authors - todo - add highlighting for primary author?
            # for author in bibdata.entries[bib_id].persons["author"]:
            #     citation = citation + author.first_names[0] + " " + author.last_names[0] + ", "

            # #citation title
            # citation = citation + html_escape(clean_title) + ", "

            # # add venue logic depending on citation type
            # venue = publist[pubsource]["venue-pretext"] + b[publist[pubsource]["venuekey"]].replace("{", "").replace(
            #     "}", "").replace("\\", "")
            #
            # citation = citation + html_escape(venue)

            # journal
            citation = citation + html_escape(b["journal"]) + " "

            # volume
            citation = citation + b["volume"]

            # number
            if 'number' in b.keys():
                citation = citation + "(" + b["number"] + ")"

            # pages
            if 'pages' in b.keys():
                citation = citation + ": " + b["pages"].replace('--', '-')

            # #year
            # citation = citation + " (" + pub_year + ")."

            ## YAML variables
            md = "---\n" + "title: \"" + html_escape(clean_title) + "\"\n"

            md += "date: " + pub_date + " 12:00:00 +0100" + "\n"

            md += "selected: false" + "\n"

            md += "pub: \"" + citation + "\"\n"

            md += "pub_date: \"" + pub_year + "\"\n"

            md += "abstract: >-\n" + " \n"

            md += "#cover: /assets/images/covers/Cover_" + md_filename[:-3] + ".png\n"

            md += "authors:" + "\n"
            for author in bibdata.entries[bib_id].persons["author"]:
                if len(author.middle_names) > 0:
                    md += "  - " + author.first_names[0] + " " + author.middle_names[0] + " " + author.last_names[0] + "\n"
                else:
                    md += "  - " + author.first_names[0] + " " + author.last_names[0] + "\n"

            md += "links:" + "\n"

            md += "  DOI: " + b["url"] + "\n"

            md += "#  PDF: /assets/publications_pdf/" + md_filename[:-3] + ".pdf\n"

            md += "\n---"

            path_pub_year = '../_publications/' + pub_year + '/'
            path_md_file = "../_publications/" + pub_year + '/' + md_filename
            os.makedirs(path_pub_year, exist_ok=True)

            if not os.path.exists(path_md_file):
                with open(path_md_file, 'w+', encoding="utf-8") as f:
                    f.write(md)
                print(f'SUCCESSFULLY PARSED {bib_id}: \"', b["title"][:60], "..." * (len(b['title']) > 60), "\"")
        # field may not exist for a reference
        except KeyError as e:
            print(f'WARNING Missing Expected Field {e} from entry {bib_id}: \"', b["title"][:30],
                  "..." * (len(b['title']) > 30), "\"")
            continue
