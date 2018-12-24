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

const svg = d3.select("#everything");
var title = svg.append("image").attr("xlink:href", "src/title.png");
var map = svg.append("image").attr("xlink:href", "src/map-cut-2.png");
var statistics = svg.append("text").attr("id", "statistics");

width = $(window).width() * 0.97;
height = $(window).height() * 0.96;
lblockW = width * 8 / 13;
rblockW = width * 5 / 13;

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

const diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x);
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

function getStartPosition() {
	if (status == "y" || status == "ym") {
		x = lblockW * 0.75;
		y = height / 2;
		return [x, y];
	}
	else {
		unit = lblockW / 24;
		x = lblockW * 0.9;
		y = parseInt(selected_item.attr("y")) + unit / 2;
		return [x, y];
	}
}

function updateStatistics(stat, date) {
    statistics.selectAll("tspan").remove();

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

async function drawTree() {
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

    tree = await d3.json("data/tree-reformatted.json");
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
        firstDay = (new Date(date[0], date[1] - 1, 1).getDay() + 7) % 8;
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