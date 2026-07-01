import re

def normalize_title(title):
    title = title[0].lower()
    title = re.sub(
        r'[^a-z0-9 ]',
        '',
        title
    )
    title = " ".join(title.split())
    return title


def deduplicate(results):
    seen_doi = set()
    seen_title = set()

    final = []

    for paper in results:
        doi = str(
            paper.get("doi", "")
        ).strip().lower()

        if doi:
            if doi in seen_doi:
                continue
            seen_doi.add(doi)

        title = normalize_title(
            paper.get("title", "")
        )

        if title:
            if title in seen_title:
                continue
            seen_title.add(title)

        final.append(paper)
    return final