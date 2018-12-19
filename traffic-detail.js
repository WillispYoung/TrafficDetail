const svg = d3.select("#everything");

async function drawTree() {
    const data = await d3.json("data/tree-short-formatted.json");
    
}

drawTree();
