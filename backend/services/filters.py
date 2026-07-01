def apply_filters(
    docs,
    year=None,
    publisher=None,
    journal=None,
    language=None
):
    results = docs
    if year:
        results = [
            x for x in results
            if str(x.get("year")) == str(year)
        ]
        
    if publisher:
        results = [
            x for x in results
            if publisher.lower()
            in str(
                x.get("publisher", "")
            ).lower()
        ]

    if journal:
        results = [
            x for x in results
            if journal.lower()
            in str(
                x.get("journal", "")
            ).lower()
        ]

    if language:
        results = [
            x for x in results
            if str(
                x.get("language", "")
            ).lower()
            == language.lower()
        ]

    return results