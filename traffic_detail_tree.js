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

var nodes = [];
var id = 0;

function getNodes(root) {
    var keys = Object.keys(root);
    for (index in keys) {
        nodes.push({"id": id++, "name": keys[index]});
        getNodes(root[keys[index]]);
    }

    // console.log(nodes);
    
}

async function drawTree() {
    const data = await d3.json("data/tree-short.json");

    nodes.push({"id": id++, "name": data["name"]});
    getNodes(data["children"]);

    // console.log(nodes);
}

drawTree();