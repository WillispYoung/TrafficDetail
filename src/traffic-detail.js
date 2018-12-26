const pixelW = 4160;
const pixelH = 4702;
const colorSet = [
    [16, 76, 181],
    [181, 207, 255],
    [23, 86, 49],
    [204, 255, 225],
    [14, 46, 61],
    [84, 166, 206]
];

var width, height, lblockW, rblockW;
var ipTextX = -30,
    ipTextY = -80;

const svg = d3.select("#everything");
var title = svg.append("image").attr("xlink:href", "src/title.png");
var map = svg.append("image").attr("xlink:href", "src/map-cut-2.png");
var statistics = svg.append("text").attr("id", "statistics");

width = $(window).width() * 0.97;
height = $(window).height() * 0.96;
lblockW = width * 8 / 13;
rblockW = width * 5 / 13;

var nodeColor = "white",
    nodeHoverColor = "red";
var nodeR = 5,
    nodeHoverR = 10;
var rectBorder = "black";

var chart = svg.append("g").attr("class", "chart")
    .attr("transform", "translate(50," + height * 0.7 + ")");

function getNode(root, date) {
    //date = [year, month, week, day]'s any prefix
    node = root;
    nullNode = { "stat": { "out": "0B", "Time": "00:00:00", "in": "0B" }, "block": [] };
    if (date.length >= 1) {
        node = node["" + date[0]];
    }
    for (var i = 1; i < date.length; i++) {
        if (typeof(node) == "undefined")
            return nullNode;

        node = node["children"]["" + date[i]];
    }
    //node may be undefined: non-existing date
    if (typeof(node) == "undefined") {
        return nullNode;
    } else {
        return node;
    }
}

svg.attr("width", width).attr("height", height);

title.attr("width", lblockW * 0.4)
    .attr("x", lblockW * 0.3)
    .attr("y", lblockW * 0.05);

imageW = rblockW;
imageH = imageW * pixelH / pixelW;
if (imageH > height) {
    imageH = height;
    imageW = imageH * pixelW / pixelH;
}
imageX = lblockW + (rblockW - imageW) / 2;
imageY = (height - imageH) / 2;
map.attr("x", imageX).attr("y", imageY).attr("width", imageW);

statistics.attr("x", lblockW / 2).attr("y", height * 0.88);

//const diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x);
const transition = svg.transition()
    .duration(500)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"));

function gradient(fraction, type) {
    ans = "#";
    for (var i = 0; i < 3; i++) {
        v = colorSet[type][i] + fraction * (colorSet[type + 1][i] - colorSet[type][i]);
        ans += ('00' + (v & 255).toString(16)).slice(-2);
    }
    return ans;
}

function updateStatistics(stat, date) {
    statistics.selectAll("tspan").remove();

    if (status != "ymwd") {
        time = "";
        for (var i in date) {
            if (i == 0)
                time += date[i].toString() + "年";
            else if (i == 1)
                time += date[i].toString() + "月";
            else if (i == 2)
                time += "第" + date[i].toString() + "周";
            else
                time += date[i].toString() + "日";
        }
        period = stat.Time.split(":");

        statistics.append("tspan")
            .text(time + "联网总时长为" +
                period[0].toString() + "小时" +
                period[1].toString() + "分钟" +
                period[2].toString() + "秒，");
        statistics.append("tspan")
            .text("其中入校流量为" + stat.in +
                "，出校流量为" + stat.out + "。");
        statistics.selectAll("tspan")
            .attr("x", lblockW / 2)
            .attr("dy", "1.2em");
    }

    d3.selectAll(".ipText").remove();
    d3.selectAll("defs").remove();
    d3.selectAll("marker").remove();
    d3.selectAll(".route").remove();
    d3.selectAll(".link").remove();
    d3.selectAll(".node").remove();
    d3.selectAll(".gantt-chart").remove();
    d3.selectAll(".xAxis").remove();
    d3.selectAll(".yAxis").remove();
    drawEdge();
    if (status == "ymwd")
        drawChart();
}

// ========================================================================//
function getCurrentFocus() {
    if (status == "y" || status == "ym")
        return [lblockW * 0.67, height / 2];
    else if (status == "ymw")
        return [lblockW * 0.9, parseFloat(selected_item.select(".week-circle").attr("cy"))];
    else
        return [lblockW * 0.9, lblockW / 48 + parseFloat(selected_item.select(".day-rect").attr("y"))];
}

function getIpPosition(ip) {
    return [imageX + ip2pos[ip].x / pixelW * imageW, imageY + ip2pos[ip].y / pixelH * imageH];
}

function flowStr2Float(flow) {
    var type = flow[flow.length - 1];

    num = parseFloat(flow.slice(0, flow.length - 1));
    if (type == 'B')
        return num;
    else if (type == 'K')
        return num * 1024;
    else if (type == 'M')
        return num * 1024 ** 2;
    else if (type == 'G')
        return num * 1024 ** 3;

    return num;
}

function curvePoint(a, b) {
    var shift = 20;
    var mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    var verti = [b[1] - a[1], a[0] - b[0]];
    var lenVer = Math.sqrt(verti[0] ** 2 + verti[1] ** 2);
    verti = [verti[0] / lenVer * shift, verti[1] / lenVer * shift];
    return [mid[0] + verti[0], mid[1] + verti[1]];
}

function drawEdge() {
    var curNode = getNode(tree, selected_item.attr("id").split("-"));
    if (curNode["block"].length == 0)
        return;

    var edgeTree = {}
    edgeTree["name"] = "";
    edgeTree["children"] = curNode["block"];

    var d3Tree = d3.hierarchy(edgeTree);
    var curFocus = getCurrentFocus();
    d3Tree["x"] = curFocus[0];
    d3Tree["y"] = curFocus[1];
    var edges = [];
    var routes = [];

    var allIn = 0;
    d3Tree["children"].forEach(function(d) {
        allIn += flowStr2Float(d.data["in"]);
    });

    var lastPos = [];
    d3Tree["children"].forEach(function(d) {
        var curPos = getIpPosition(d.data["ip"]);
        d["x"] = curPos[0];
        d["y"] = curPos[1];
        cenX = (curFocus[0] + curPos[0]) / 2;
        cenY = (curFocus[1] + curPos[1]) / 2;
        edges.push({
            "p": [curFocus,
                [(cenX + curFocus[0]) / 2, curFocus[1]],
                [cenX, cenY],
                [(cenX + curPos[0]) / 2, curPos[1]],
                curPos
            ],
            "frac": (1 - Math.log10(1 + 9 * flowStr2Float(d.data["in"]) / allIn))
        });
        if (lastPos.length > 0 && lastPos.toString() != curPos.toString())
            routes.push([lastPos,
                curvePoint(lastPos, curPos),
                curPos
            ]);
        lastPos = curPos;
    });

    if (status == "ymwd") {
        var line = d3.line()
            .x(function(d) { return d[0]; })
            .y(function(d) { return d[1]; })
            .curve(d3.curveCardinal.tension(0.5));

        var defs = svg.append("defs");

        var arrowMarker = defs.append("marker")
            .attr("id", "arrow")
            .attr("markerUnits", "strokeWidth")
            .attr("markerWidth", "6")
            .attr("markerHeight", "6")
            .attr("viewBox", "0 0 6 6")
            .attr("refX", "3")
            .attr("refY", "3")
            .attr("orient", "auto");

        var arrow_path = "M1,1 L5,3 L1,5 L3,3 L1,1";

        arrowMarker.append("path")
            .attr("d", arrow_path)
            .attr("fill", "#0e2e3d");

        var route = svg.append("g").selectAll(".route")
            .data(routes)
            .enter().append("path")
            .attr("class", "route")
            .attr("d", line)
            .attr("stroke", "red")
            //.attr("marker-start", "url(#arrow)")
            .attr("marker-mid", "url(#arrow)")
        //.attr("marker-end", "url(#arrow)");
    }
    var link = svg.append("g").selectAll(".link"),
        node = svg.append("g").selectAll(".node");

    link = link
        .data(edges)
        .enter().append("path")
        .attr("class", "link")
        .attr("d", function(d) {
            var e = d["p"]
            return `M${e[0][0]} ${e[0][1]} 
        S${e[1][0]} ${e[1][1]} ${e[2][0]} ${e[2][1]} 
        S${e[3][0]} ${e[3][1]} ${e[4][0]} ${e[4][1]}`;
        })
        .attr('stroke', function(d) {
            return gradient(d["frac"], 4);
        });

    ipText = d3.select("body")
        .append("div")
        .attr("class", "ipText")
        .style("opacity", 0.0);

    node = node
        .data(d3Tree.leaves())
        .enter().append("circle")
        .attr("class", "node")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("fill", nodeColor)
        .attr("r", nodeR)
        .on("mouseover", function(d) {
            d3.select(this)
                .attr("cursor", "pointer")
                .attr("fill", nodeHoverColor)
                .attr("r", nodeHoverR);

            ipText.html(d.data.ip + "<br>" + d.data.Time + "<br>" + d.data.in)
                .style("left", (ipTextX + d3.event.pageX) + "px")
                .style("top", (ipTextY + d3.event.pageY) + "px")
                .style("opacity", 1.0);

            chart.selectAll(".gantt-chart").selectAll("rect")
                .attr("stroke", function(dd) {
                    if (dd.ip == d.data.ip)
                        return rectBorder;
                    else
                        return null;
                })
                .attr("stroke-width", function(dd) {
                    if (dd.ip == d.data.ip)
                        return 2;
                    else
                        return null;
                });
        }).on("mousemove", function(d) {
            ipText.style("left", (ipTextX + d3.event.pageX) + "px")
                .style("top", (ipTextY + d3.event.pageY) + "px");
        }).on("mouseout", function(d) {
            ipText.style("opacity", 0.0)
                .style("left", "0px")
                .style("top", "0px");
            d3.select(this)
                .attr("fill", nodeColor)
                .attr("r", nodeR);
            chart.selectAll(".gantt-chart").selectAll("rect")
                .attr("stroke", null)
                .attr("stroke-width", null);
        });
}

// ========================================================================//


// ========================================================================//
d3.gantt = function() {
    var FIT_TIME_DOMAIN_MODE = "fit";
    var FIXED_TIME_DOMAIN_MODE = "fixed";

    var margin = {
        top: 20,
        right: 40,
        bottom: 20,
        left: 50
    };
    var selector = 'body';
    var timeDomainStart = d3.timeDay.offset(new Date(), -3);
    var timeDomainEnd = d3.timeHour.offset(new Date(), +3);
    var timeDomainMode = FIT_TIME_DOMAIN_MODE; // fixed or fit
    var taskTypes = [];
    var taskStatus = [];
    var chartHeight = height * 0.3; //document.body.clientHeight - margin.top - margin.bottom-5;
    var chartWidth = lblockW * 0.9; //document.body.clientWidth - margin.right - margin.left-5;

    var linePad = chartHeight / 4;
    var lineHeight = linePad;

    var tickFormat = "%H:%M";

    var keyFunction = function(d) {
        return d ? d.startDate + d.taskName + d.endDate : "";
    };

    var rectTransform = function(d) {
        return "translate(" + xd(d.startDate) + "," +
            (parseFloat(d["#device"]) * linePad + lineHeight * (0.5 - 0.5 * d.hRatio) - linePad).toString() + ")";
    };

    var initTimeDomain = function(tasks) {
        if (timeDomainMode === FIT_TIME_DOMAIN_MODE) {
            if (tasks === undefined || tasks.length < 1) {
                timeDomainStart = d3.timeDay.offset(new Date(), -3);
                timeDomainEnd = d3.timeHour.offset(new Date(), +3);
                return;
            }
            tasks.sort(function(a, b) {
                return a.endDate - b.endDate;
            });
            timeDomainEnd = tasks[tasks.length - 1].endDate;
            tasks.sort(function(a, b) {
                return a.startDate - b.startDate;
            });
            timeDomainStart = tasks[0].startDate;
        }
    };
    var xd, yd, xAxis, yAxis;
    var initAxis = function() {
        xd = d3.scaleTime().domain([timeDomainStart, timeDomainEnd]).range([0, chartWidth]).clamp(true);

        yd = d3.scaleBand().domain(taskTypes).range([0, chartHeight - margin.top - margin.bottom]).padding(0.1);

        xAxis = d3.axisBottom().scale(xd).ticks(7).tickFormat(d3.timeFormat(tickFormat))
            .tickSize(8).tickPadding(8);

        yAxis = d3.axisLeft().scale(yd).tickSize(0);
    };
    initAxis();

    function gantt(tasks) {
        initTimeDomain(tasks);
        initAxis();

        chart.append("g")
            .attr("class", "xAxis")
            .attr("transform", "translate(0, " + (chartHeight - margin.top - margin.bottom) + ")")
            .transition()
            .call(xAxis);

        chart.append("g").attr("class", "yAxis").transition().call(yAxis);

        chart
            .append("g").attr("class", "gantt-chart")
            .selectAll(".gantt-chart")
            .data(tasks, keyFunction)
            .enter()
            .append("rect")
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("class", function(d) {
                if (taskStatus[d.status] == null)
                    return "bar";
                return taskStatus[d.status];
            })
            //.attr("y", 0)
            //.attr("title", "test")
            //.append("title").text(function(d) { return "test"; })
            //.on("mouseover",function(d,i){
            //  d3.select(this)
            //      .attr("fill","yellow");
            //})
            .attr("transform", rectTransform)
            .attr("height", function(d) {
                return lineHeight * d.hRatio;
            })
            .attr("width", function(d) {
                return Math.max(1, (xd(d.endDate) - xd(d.startDate)));
            })

            .on("mouseover", function(d) {
                d3.select(this)
                    .attr("cursor", "pointer")
                    .attr("stroke", rectBorder)
                    .attr("stroke-width", 2);

                ipText.html(d.status + "<br>" + d.inflow +
                        "<br>" + d.begin + "-" + d.end)
                    .style("left", (ipTextX + d3.event.pageX) + "px")
                    .style("top", (ipTextY + d3.event.pageY) + "px")
                    .style("opacity", 1.0);

                d3.selectAll(".node")
                    .attr("fill", function(dd) {
                        if (dd.data.ip == d.ip)
                            return nodeHoverColor;
                        else
                            return nodeColor;
                    })
                    .attr("r", function(dd) {
                        if (dd.data.ip == d.ip)
                            return nodeHoverR;
                        else
                            return nodeR;
                    });
            }).on("mousemove", function(d) {
                ipText.style("left", (ipTextX + d3.event.pageX) + "px")
                    .style("top", (ipTextY + d3.event.pageY) + "px");
            }).on("mouseout", function(d) {
                d3.select(this)
                    .attr("stroke", null)
                    .attr("stroke-width", null);

                ipText.style("opacity", 0.0)
                    .style("left", "0px")
                    .style("top", "0px");

                d3.selectAll(".node")
                    .attr("fill", nodeColor)
                    .attr("r", nodeR);
            });

        return gantt;
    };

    gantt.margin = function(value) {
        if (!arguments.length)
            return margin;
        margin = value;
        return gantt;
    };

    gantt.timeDomain = function(value) {
        if (!arguments.length)
            return [timeDomainStart, timeDomainEnd];
        timeDomainStart = +value[0], timeDomainEnd = +value[1];
        return gantt;
    };

    gantt.timeDomainMode = function(value) {
        if (!arguments.length)
            return timeDomainMode;
        timeDomainMode = value;
        return gantt;

    };

    gantt.taskTypes = function(value) {
        if (!arguments.length)
            return taskTypes;
        taskTypes = value;
        return gantt;
    };

    gantt.taskStatus = function(value) {
        if (!arguments.length)
            return taskStatus;
        taskStatus = value;
        return gantt;
    };

    gantt.width = function(value) {
        if (!arguments.length)
            return chartWidth;
        chartWidth = +value;
        return gantt;
    };

    gantt.height = function(value) {
        if (!arguments.length)
            return chartHeight;
        chartHeight = +value;
        return gantt;
    };

    gantt.tickFormat = function(value) {
        if (!arguments.length)
            return tickFormat;
        tickFormat = value;
        return gantt;
    };

    gantt.selector = function(value) {
        if (!arguments.length)
            return selector;
        selector = value;
        return gantt;
    };

    return gantt;
};

function drawChart() {
    var curNode = getNode(tree, selected_item.attr("id").split("-"));
    if (curNode["block"].length == 0)
        return;

    var maxIn = 1;
    flowStr2Float(curNode["stat"]["in"]);
    curNode["block"].forEach(function(d) {
        maxIn = Math.max(maxIn, flowStr2Float(d["in"]))
    });
    var tasks = [];
    curNode["block"].forEach(function(d) {
        tasks.push({
            "startDate": new Date("Sun Dec 09 " + d["begin"] + " GMT+0800 (中国标准时间)"),
            "endDate": new Date("Sun Dec 09 " + d["end"] + " GMT+0800 (中国标准时间)"),
            "#device": d["device#"],
            "status": d["device"],
            "ip": d["ip"],
            "inflow": d["in"],
            "begin": d["begin"],
            "end": d["end"],
            "hRatio": flowStr2Float(d["in"]) / maxIn + 0.05
        });
    });

    var taskStatus = {
        "Windows": "bar",
        "Smartphones/PDAs/Tablets": "bar-failed",
        "Macintosh": "bar-running",
        "???": "bar-killed"
    };

    var taskNames = ["1", "2", "3"];

    var format = "%H:%M";

    var gantt = d3.gantt().taskTypes(taskNames).taskStatus(taskStatus).tickFormat(format);

    gantt(tasks);

}
// ========================================================================//

async function drawTree() {

    tree = await d3.json("data/tree-reformatted.json");
    ip2pos = await d3.json("data/ip2pos.json");
    status = "y"; // "ym", "ymw", "ymwd"
    selected_item = undefined;

    metric = {
        year: [],
        month: []
    };

    center = {
        year: 0,
        month: 6
    };

    yearLength = Object.keys(tree).length;
    unit = height / (2 * yearLength);
    for (var key in tree) {
        v = Math.cos((parseInt(tree[key].id) / yearLength) * (Math.PI / 2));
        metric.year.push(v * unit);
    }

    monthLength = 12;
    for (var i = 0; i < 12; i++)
        metric.month.push(0);

    function computeYearWidth() {
        unit = height / (2 * yearLength);
        for (var i in metric.year) {
            v = Math.cos(((i - center.year) / yearLength) * (Math.PI / 2));
            metric.year[i] = v * unit;
        }
    }

    function computeMonthWidth() {
        unit = height / (2 * monthLength);
        for (var i in metric.month) {
            v = Math.cos(((i - center.month) / monthLength) * (Math.PI / 2));
            metric.month[i] = v * unit;
        }
    }

    function repositionYears() {
        computeYearWidth();

        d3.selectAll(".year")
            .each(function() {
                id = d3.select(this).attr("id");
                index = parseInt(tree[id].id);

                if (index == center.year) {
                    updateStatistics(tree[id].stat, [parseInt(id)]);
                }

                yearX = lblockW / 3;
                yearY = (height - metric.year[center.year]) / 2;
                if (index < center.year)
                    for (var j = index; j < center.year; j++)
                        yearY -= metric.year[j] + 5;
                else
                    for (var j = center.year; j < index; j++)
                        yearY += metric.year[j] + 5;
                yearW = lblockW / 3 - 10 * Math.abs(index - center.year);

                d3.select(this).select(".year-rect")
                    .transition(transition)
                    .attr("x", yearX + 5 * Math.abs(index - center.year))
                    .attr("y", yearY)
                    .attr("width", lblockW / 3 - 10 * Math.abs(index - center.year))
                    .attr("height", metric.year[index])
                    .attr("fill", gradient(Math.abs(index - center.year) / yearLength, 4));

                d3.select(this).select(".year-name")
                    .transition(transition)
                    .attr("x", yearX + 5 * Math.abs(index - center.year))
                    .attr("y", yearY)
                    .attr("dx", yearW / 2)
                    .attr("dy", metric.year[index] * 0.5)
                    .attr("font-size", Math.floor(metric.year[index] * 0.375).toString() + "px");
            });
    }

    function repositionMonthes() {
        computeMonthWidth();

        d3.selectAll(".month")
            .each(function() {
                id = d3.select(this).attr("id");
                index = parseInt(id.split("-")[1]) - 1;

                if (index == center.month) {
                    root = getNode(tree, id.split("-"));
                    updateStatistics(root.stat, [originYear, index + 1]);
                }

                monthX = lblockW / 3;
                monthY = (height - metric.month[center.month]) / 2;
                if (index < center.month)
                    for (var j = index; j < center.month; j++)
                        monthY -= metric.month[j] + 2;
                else
                    for (var j = center.month; j < index; j++)
                        monthY += metric.month[j] + 2;
                monthW = lblockW / 3 - 6 * Math.abs(index - center.month);

                d3.select(this).select(".month-rect")
                    .transition(transition)
                    .attr("x", monthX + 3 * Math.abs(index - center.month))
                    .attr("y", monthY)
                    .attr("width", lblockW / 3 - 6 * Math.abs(index - center.month))
                    .attr("height", metric.month[index])
                    .attr("fill", gradient(Math.abs(index - center.month) / monthLength, 4));

                d3.select(this).select(".month-name")
                    .transition(transition)
                    .attr("x", monthX + 3 * Math.abs(index - center.month))
                    .attr("y", monthY)
                    .attr("dx", monthW / 2)
                    .attr("dy", metric.month[index] * 0.5)
                    .attr("font-size", Math.floor(metric.month[index] * 0.7).toString() + "px");
            });
    }

    function expandMonthes() {
        d3.selectAll(".year")
            .transition(transition)
            .attr("transform", `translate(${-lblockW*0.15},${height*0.2}) scale(0.6)`);

        status = "ym";
        center.month = 6;
        computeMonthWidth();

        originYear = selected_item.attr("id");
        for (var i = 0; i < 12; i++) {
            index = i;
            month = svg.append("g")
                .attr("class", "month")
                .attr("id", originYear + "-" + (index + 1).toString())
                .on("mouseover", function() {
                    d3.select(this).attr("cursor", "pointer");
                    d3.select(this).select(".month-rect")
                        .attr("stroke", "pink")
                        .attr("stroke-width", 2);
                })
                .on("mouseout", function() {
                    d3.select(this).select(".month-rect")
                        .attr("stroke", null)
                        .attr("stroke-width", null);
                })
                .on("click", function() {
                    id = d3.select(this).attr('id');
                    // expand calendar
                    if (status == "ym" && id == selected_item.attr("id")) {
                        expandWeeks();
                    }
                    // reposition monthes according to center.month
                    else if (status == "ym" && id != selected_item.attr("id")) {
                        selected_item = d3.select(this);
                        center.month = parseInt(selected_item.attr("id").split("-")[1]) - 1;
                        repositionMonthes();
                    }
                    // collapse calendar and repositon monthes
                    else {
                        status = "ym";
                        selected_item = d3.select(this);
                        center.month = parseInt(selected_item.attr("id").split("-")[1]) - 1;
                        collapseCalendar();
                        repositionMonthes();
                    }
                });

            if (index == center.month) {
                selected_item = month;
                root = getNode(tree, [originYear, index + 1]);
                updateStatistics(root.stat, [originYear, index + 1]);
            }

            monthX = lblockW / 3;
            monthY = (height - metric.month[center.month]) / 2;
            if (index < center.month)
                for (var j = index; j < center.month; j++)
                    monthY -= metric.month[j] + 2;
            else
                for (var j = center.month; j < index; j++)
                    monthY += metric.month[j] + 2;
            monthW = lblockW / 3 - 6 * Math.abs(index - center.month);

            month.append("rect")
                .attr("class", "month-rect")
                .attr("x", monthX + 3 * Math.abs(index - center.month))
                .attr("y", monthY)
                .attr("width", monthW)
                .attr("height", metric.month[index])
                .attr("fill", gradient(Math.abs(index - center.month) / monthLength, 4));

            month.append("text")
                .attr("class", "month-name")
                .attr("x", monthX + 3 * Math.abs(index - center.month))
                .attr("y", monthY)
                .attr("dx", monthW / 2)
                .attr("dy", metric.month[index] * 0.5)
                .attr("font-size", Math.floor(metric.month[i] * 0.7).toString() + "px")
                .text((index + 1).toString());
        }
    }

    function expandWeeks() {
        d3.selectAll(".year")
            .transition(transition)
            .attr("transform", `translate(${-lblockW*0.05},${height*0.35}) scale(0.3)`);
        d3.selectAll(".month")
            .transition(transition)
            .attr("transform", `translate(${lblockW*0.02},${height*0.2}) scale(0.6)`);

        status = "ymw";

        previousID = selected_item.attr("id");
        date = previousID.split("-").map(x => parseInt(x));

        // Monday: 0, Tuesday: 1, ...
        firstDay = (new Date(date[0], date[1] - 1, 1).getDay() + 6) % 7;
        daysInMonth = new Date(date[0], date[1], 0).getDate();
        weeksInMonth = Math.floor((firstDay + daysInMonth - 1) / 7) + 1;

        weeks = [
            []
        ];
        for (var i = 0; i < weeksInMonth - 1; i++) weeks.push([]);
        for (var i = 0; i < daysInMonth; i++) {
            weekIndex = Math.floor((firstDay + i) / 7);
            weeks[weekIndex].push(i + 1);
        }

        unit = lblockW / (3 * 8);
        for (var i in weeks) {
            weekId = previousID + "-" + (parseInt(i) + 1).toString();
            week = svg.append("g")
                .attr("class", "week")
                .attr("id", weekId)
                .on("mouseover", function() {
                    d3.select(this).attr("cursor", "pointer");
                })
                .on("click", function() {
                    weekId = d3.select(this).attr("id");
                    if (status == "ymw" && selected_item.attr("id") != weekId) {
                        selected_item.select(".week-circle")
                            .attr("stroke", "#566b8c")
                            .attr("stroke-width", 3);

                        selected_item = d3.select(this);
                        selected_item.select(".week-circle")
                            .attr("stroke", "#639eff")
                            .attr("stroke-width", 4);

                        root = getNode(tree, weekId.split("-"));
                        updateStatistics(root.stat, weekId.split("-"));
                    } else if (status == "ymwd") {
                        selected_item.select(".day-rect")
                            .attr("stroke", null)
                            .attr("stroke-width", null);

                        status = "ymw";
                        selected_item = d3.select(this);
                        selected_item.select(".week-circle")
                            .attr("stroke", "#639eff")
                            .attr("stroke-width", 4);

                        root = getNode(tree, weekId.split("-"));
                        updateStatistics(root.stat, weekId.split("-"));
                    }
                });

            dayY = height / 2 + (i - weeks.length / 2) * (unit + 5) - 2.5;
            week.append("circle")
                .attr("class", "week-circle")
                .attr("r", unit * 0.25)
                .attr("cx", lblockW / 2)
                .attr("cy", dayY + unit / 2)
                .attr("fill", "#d3f0ff")
                .attr("stroke", "#566b8c")
                .attr("stroke-width", 3);

            if (i == 0) {
                selected_item = week;
                selected_item.select(".week-circle")
                    .attr("stroke", "#639eff")
                    .attr("stroke-width", 4);

                root = getNode(tree, weekId.split("-"));
                updateStatistics(root.stat, weekId.split("-"));
            }

            for (var j in weeks[i]) {
                dayX = i == 0 ?
                    lblockW / 2 + (parseInt(j) + 7 - weeks[i].length) * (unit + 5) :
                    lblockW / 2 + j * (unit + 5);

                dayX += unit * 0.8;

                day = svg.append("g")
                    .attr("class", "day")
                    .attr("id", weekId + "-" + weeks[i][j].toString())
                    .on("mouseover", function() {
                        d3.select(this).attr("cursor", "pointer");
                    })
                    .on("click", function() {
                        dayId = d3.select(this).attr("id");
                        if (status == "ymw") {
                            // change from week to day
                            selected_item.select(".week-circle")
                                .attr("stroke", "#566b8c")
                                .attr("stroke-width", 3);

                            status = "ymwd";
                            selected_item = d3.select(this);
                            selected_item.select(".day-rect")
                                .attr("stroke", "#ff5151")
                                .attr("stroke-width", 3);

                            date = dayId.split("-");
                            updateStatistics(getNode(tree, date).stat, date);
                        } else if (status == "ymwd" && dayId != selected_item.attr("id")) {
                            // change day
                            selected_item.select(".day-rect")
                                .attr("stroke", null)
                                .attr("stroke-width", null);

                            selected_item = d3.select(this);
                            selected_item.select(".day-rect")
                                .attr("stroke", "#ff5151")
                                .attr("stroke-width", 3);

                            date = dayId.split("-");
                            updateStatistics(getNode(tree, date).stat, date);
                        }
                    });

                day.append("rect")
                    .attr("class", "day-rect")
                    .attr("x", dayX)
                    .attr("y", dayY)
                    .attr("width", unit)
                    .attr("height", unit)
                    .attr("fill", gradient(i / weeks.length, 4));

                day.append("text")
                    .attr("class", "day-text")
                    .attr("x", dayX)
                    .attr("y", dayY)
                    .attr("dx", unit / 2)
                    .attr("dy", unit / 2)
                    .text(weeks[i][j]);
            }
        }
    }

    function collapseAll() {
        d3.selectAll(".week")
            .transition(transition)
            .attr("opacity", "0.3")
            .attr("transform", `translate(${lblockW/3},0)`)
            .remove();
        d3.selectAll(".day")
            .transition(transition)
            .attr("opacity", "0.3")
            .attr("transform", `translate(${lblockW/3},0)`)
            .remove();
        d3.selectAll(".month")
            .transition(transition)
            .attr("opacity", "0.5")
            .attr("transform", `translate(${lblockW/3},0)`)
            .remove();
        d3.selectAll(".year")
            .transition(transition)
            .attr("transform", null);
    }

    function collapseCalendar() {
        d3.selectAll(".week")
            .transition(transition)
            .attr("opacity", "0.3")
            .attr("transform", `translate(${lblockW/3},0)`)
            .remove();
        d3.selectAll(".day")
            .transition(transition)
            .attr("opacity", "0.3")
            .attr("transform", `translate(${lblockW/3},0)`)
            .remove();
        d3.selectAll(".month")
            .transition(transition)
            .attr("transform", null);
        d3.selectAll(".year")
            .transition(transition)
            .attr("transform", `translate(${-lblockW*0.15},${height*0.2}) scale(0.6)`);
    }

    for (var key in tree) {
        index = parseInt(tree[key].id);
        year = svg.append("g")
            .attr("class", "year")
            .attr("id", key)
            .on("mouseover", function() {
                d3.select(this).attr("cursor", "pointer");
                d3.select(this).select(".year-rect")
                    .attr("stroke", "pink")
                    .attr("stroke-width", 4);
            })
            .on("mouseout", function() {
                d3.select(this).select(".year-rect")
                    .attr("stroke", null)
                    .attr("stroke-width", null);
            })
            .on("click", function() {
                id = d3.select(this).attr("id");
                // expand monthes
                if (status == "y" && id == selected_item.attr("id")) {
                    expandMonthes();
                }
                // reposition years
                else if (status == "y" && id != selected_item.attr("id")) {
                    selected_item = d3.select(this);
                    center.year = parseInt(tree[selected_item.attr("id")].id);
                    repositionYears();
                }
                // shrink monthes and etc, then reposition years
                else {
                    status = "y";
                    selected_item = d3.select(this);
                    center.year = parseInt(tree[selected_item.attr("id")].id);
                    collapseAll();
                    repositionYears();
                }
            });

        yearX = lblockW / 3;
        yearY = (height - metric.year[0]) / 2;
        for (var j = 0; j < index; j++)
            yearY += metric.year[0] + 5;
        yearW = lblockW / 3 - 10 * index;

        if (index == center.year) {
            selected_item = year;
            updateStatistics(tree[key].stat, [parseInt(key)]);
        }

        year.append("rect")
            .attr("class", "year-rect")
            .attr("x", yearX + 5 * index)
            .attr("y", yearY)
            .attr("width", yearW)
            .attr("height", metric.year[index])
            .attr("fill", gradient(index / yearLength, 4));

        year.append("text")
            .attr("class", "year-name")
            .attr("x", yearX + 5 * index)
            .attr("y", yearY)
            .attr("dx", yearW / 2)
            .attr("dy", metric.year[index] * 0.5)
            .attr("font-size", Math.floor(metric.year[index] * 0.375).toString() + "px")
            .text(key);
    }
}

drawTree();