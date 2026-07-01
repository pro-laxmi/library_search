let allResults = [];

async function search() {

    const query =
        document.getElementById("query").value;

    const k =
        document.getElementById("topk").value;

    const response =
        await fetch(
            `http://localhost:5000/search?q=${encodeURIComponent(query)}&k=${k}`
        );

    const data = await response.json();

    allResults = data.data;

    renderResults(allResults);

    document.getElementById("stats").innerHTML =
        `Retrieved ${allResults.length} papers`;
}


function applyFilters() {

    let results = allResults;

    const year =
        document.getElementById("year").value;

    const journal =
        document.getElementById("journal").value.toLowerCase();

    const publisher =
        document.getElementById("publisher").value.toLowerCase();

    if (year) {

        results =
            results.filter(
                x => String(x.year) === year
            );
    }

    if (journal) {

        results =
            results.filter(
                x =>
                    (x.journal || "")
                        .toLowerCase()
                        .includes(journal)
            );
    }

    if (publisher) {

        results =
            results.filter(
                x =>
                    (x.publisher || "")
                        .toLowerCase()
                        .includes(publisher)
            );
    }

    renderResults(results);
}


function renderResults(results) {

    const div =
        document.getElementById("results");

    div.innerHTML = "";

    results.forEach(doc => {

        div.innerHTML += `
        <div class="card mb-3">

            <div class="card-body">

                <h5>${doc.title || ""}</h5>

                <p>
                    ${doc.author || ""}
                </p>

                <p>
                    ${doc.journal || ""}
                    (${doc.year || ""})
                </p>

                <p>
                    Score:
                    ${doc.score.toFixed(3)}
                </p>

            </div>

        </div>
        `;
    });
}