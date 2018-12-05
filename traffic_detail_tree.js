// 4. draw the tree

const width = $(document).width(),
    height = $(document).height(),
    margin = { top: 10, bottom: 10, right: 120, left: 40 },
    dx = 20,
    dy = width / 8;

const tree = d3.tree().nodeSize([dx, dy]);
const diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x);

const svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-margin.left, -margin.top, width, dx])
    .style("font", "14px arial")
    .style("user-select", "none");

async function drawTree() {
    const data = await d3.json("data/tree.json");
    const root = d3.hierarchy(data);
    const links = root.links();

    console.log(links);

    for (key in data) {
        console.log(key + ":" + data[key]);

    }
}

drawTree();
