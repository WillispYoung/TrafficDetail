const gTree = d3.select("#tree"),
    gMap = d3.select("#map"),
    gYear = d3.select("#year"),
    gMonth = d3.select("#month"),
    gCalendar = d3.select("#calendar");

async function drawTree() {
    const data = await d3.json("data/tree-short-formatted.json");
    
}

drawTree();