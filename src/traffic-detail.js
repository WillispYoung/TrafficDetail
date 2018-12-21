const pixelW = 2000;
const pixelH = 2797;
var width, height, lblockW, rblockW;

const svg = d3.select("#everything");

var title = svg.append("text")
    .attr("id", "title")
    .text("清华流量助手")
    .style("user-select", "none")
    .on("mouseover", function() {
        d3.select(this).attr("cursor", "pointer");
    });

var map = svg.append("image").attr("xlink:href", "src/map.jpg");

// update elements size and position
function updateSize() {
    width = $(window).width() * 0.97;
    height = $(window).height() * 0.96;
    lblockW = width * 7 / 12;
    rblockW = width * 5 / 12;

    svg.attr("width", width).attr("height", height);

    // place text in the center of left block
    titleW = document.getElementById("title").getBBox().width;
    titleX = (lblockW - titleW) / 2;
    title.attr("x", titleX).attr("y", height * 0.1);

    // place map in the center of right block
    imageW = rblockW;
    imageH = imageW * pixelH / pixelW;
    if (imageH > height) {
        imageH = height;
        imageW = imageH * pixelW / pixelH;
    }
    imageX = lblockW + (rblockW - imageW) / 2;
    imageY = (height - imageH) / 2;
    map.attr("x", imageX).attr("y", imageY).attr("width", imageW);
}

updateSize();

$(window).resize(function() { updateSize(); });

// generate gradient color based on fraction
function gradient(index) {
    
}

async function drawTree() {
    data = {
        year: [2015, 2016, 2017, 2018],
        month: [5, 6, 7, 8, 9, 10],
    };

    // no .length property for dictionary!
    weekdata = {
        1: [1, 2],
        2: [3, 4, 5, 6, 7, 8, 9],
        3: [10, 11, 12, 13, 14, 15, 16],
        4: [17, 18, 19, 20, 21, 22, 23],
        5: [24, 25, 26, 27, 28, 29, 30],
        6: [31]
    };

    center = {
        year: 0, // index in array
        month: 0, // index in array
        week: 1 // key value in dict, init as first
    };

    metric = {
        year: [],
        month: []
    }

    // record current state and chosen element
    status = "y"; // "ym", "ymw", "ymwd"
    selected_element = undefined;

    // cosine model: initialization
    for (var key in data) {
        unit = height / (2 * data[key].length);
        center[key] = Math.floor(data[key].length / 2);
        for (var i in data[key]) {
            v = Math.cos(((i - center[key]) / data[key].length) * (Math.PI / 2));
            metric[key].push(v * unit);
        }
    }

    function computeYearWidth() {
        unit = height / (2 * data.year.length)
        for (var i in data.year) {
            v = Math.cos(((i - center.year) / data.year.length) * (Math.PI / 2));
            metric.year[i] = v * unit;
        }
    }

    function computeMonthWidth() {
        unit = height / (2 * data.month.length)
        for (var i in data.month) {
            v = Math.cos(((i - center.month) / data.month.length) * (Math.PI / 2));
            metric.month[i] = v * unit;
        }
    }

    function repositionYears() {
        computeYearWidth();

        d3.selectAll(".year")
            .each(function() {
                id = d3.select(this).attr('id');
                index = data.year.indexOf(parseInt(id));
                rect = d3.select(this).select(".year-rect");
                // name = d3.select(this).select(".year-name");

                yearX = lblockW / 3;
                yearY = (height - metric.year[center.year]) / 2;
                if (index < center.year)
                    for (var j = index; j < center.year; j++)
                        yearY -= metric.year[j] + 5;
                else
                    for (var j = center.year; j < index; j++)
                        yearY += metric.year[j] + 5;

                rect.attr("x", yearX + 5 * Math.abs(index - center.year))
                    .attr("y", yearY)
                    .attr("width", lblockW / 3 - 10 * Math.abs(index - center.year))
                    .attr("height", metric.year[index])
                    .attr("fill", index == center.year ? "#077" : "#0bb");

                // name.attr("x", yearX)
                //     .attr("y", yearY);
            });
    }

    function repositionMonthes() {
        computeMonthWidth();

        d3.selectAll(".month")
            .each(function() {
                id = d3.select(this).attr("id");
                index = data.month.indexOf(parseInt(id.split("-")[1]));
                rect = d3.select(this).select(".month-rect");

                monthX = lblockW / 3;
                monthY = (height - metric.month[center.month]) / 2;
                if (index < center.month)
                    for (var j = index; j < center.month; j++)
                        monthY -= metric.month[j] + 2;
                else
                    for (var j = center.month; j < index; j++)
                        monthY += metric.month[j] + 2;

                rect.attr("x", monthX + 3 * Math.abs(index - center.month))
                    .attr("y", monthY)
                    .attr("width", lblockW / 3 - 6 * Math.abs(index - center.month))
                    .attr("height", metric.month[index])
                    .attr("fill", index == center.month ? "#077" : "#0bb");
            });
    }

    function expandMonthes() {
        // expand according to center.year
        d3.selectAll(".year")
            .attr("transform", `translate(${-lblockW*0.15},${height*0.2}) scale(0.6)`);

        // restore center.month
        status = "ym";
        center.month = data.month.length / 2;
        computeMonthWidth();

        // data.month -> data.month[center.year] in real case
        for (var i in data.month) {
            month = svg.append("g")
                .attr("class", "month")
                .attr("id", data.year[center.year].toString() + "-" + data.month[i].toString())
                .on("mouseover", function() {
                    d3.select(this).attr("cursor", "pointer");
                })
                .on("click", function() {
                    id = d3.select(this).attr('id');
                    // expand calendar
                    if (status == "ym" && id == selected_element.attr("id")) {
                        status = "ymw";
                        expandWeeks();
                    }
                    // reposition monthes according to center.month
                    else if (status == "ym" && id != selected_element.attr("id")) {
                        selected_element = d3.select(this);
                        center.month = data.month.indexOf(parseInt(id.split("-")[1]));
                        repositionMonthes();
                    }
                    // collapse calendar and repositon monthes
                    else {
                        status = "ym";
                        selected_element = d3.select(this);
                        center.month = data.month.indexOf(parseInt(id.split("-")[1]));
                        collapseCalendar();
                        repositionMonthes();
                    }
                });

            if (i == center.month)
                selected_element = month;

            monthX = lblockW / 3;
            monthY = (height - metric.month[center.month]) / 2;
            if (i < center.month)
                for (var j = i; j < center.month; j++)
                    monthY -= metric.month[j] + 2;
            else
                for (var j = center.month; j < i; j++)
                    monthY += metric.month[j] + 2;

            month.append("rect")
                .attr("class", "month-rect")
                .attr("x", monthX + 3 * Math.abs(i - center.month))
                .attr("y", monthY)
                .attr("width", lblockW / 3 - 6 * Math.abs(i - center.month))
                .attr("height", metric.month[i])
                .attr("fill", i == center.month ? "#077" : "#0bb");

            month.append("text")
                .attr("class", "month-name")
                .attr("x", monthX)
                .attr("y", monthY)
                .attr("dx", 100)
                .attr("dy", 40)
                .text(data.month[i].toString());
        }
    }

    function expandWeeks() {
        d3.selectAll(".year")
            .attr("transform", `translate(${-lblockW*0.05},${height*0.35}) scale(0.3)`);
        d3.selectAll(".month")
            .attr("transform", `translate(0,${height*0.2}) scale(0.6)`);

        unit = lblockW / (3 * 8);
        for (var k in weekdata) {
            id_week = data.year[center.year].toString() + "-" +
                data.month[center.month].toString() + "-" + k.toString();
            week = svg.append("g")
                .attr("class", "week")
                .attr("id", id_week)
                .on("mouseover", function() {
                    d3.select(this).attr("cursor", "pointer");
                })
                .on("click", function() {
                    if (status == "ymw" && id_week != selected_element.attr("id")) {
                        selected_element = d3.select(this);
                        // change week focus

                    }
                });

            if (parseInt(k) == center.week)
                selected_element = week;

            for (var i in weekdata[k]) {
                dayX = parseInt(k) == 1 ? 
                    lblockW / 2 + (parseInt(i) + 7 - weekdata[k].length) * (unit + 5) :
                    lblockW / 2 + parseInt(i) * (unit + 5);
                // 6 == weekdata.length, yet dictionary lack length property.
                dayY = height / 2 + (parseInt(k) - 6 / 2 - 1) * (unit + 5) - 2.5;

                week.append("rect")
                    .attr("class", "day")
                    .attr("id", id_week + "-" + weekdata[k][i].toString())
                    .attr("x", dayX)
                    .attr("y", dayY)
                    .attr("width", unit)
                    .attr("height", unit)
                    .attr("fill", "#0bb")
                    .on("mouseover", function() {
                        d3.select(this).attr("cursor", "pointer");
                    })
                    .on("click", function() {
                        id_day = d3.select(this).attr("id");
                        if (status == "ymw") {
                            // select day in a week
                            status = "ymwd";
                            selected_element = d3.select(this);
                            d3.select(this).attr("fill", "#077");
                        } else if (status == "ymwd" && id_day == selected_element.attr("id")) {
                            // focus on this day

                        } else {
                            // change selected day
                            selected_element.attr("fill", "#0bb");
                            selected_element = d3.select(this);
                            d3.select(this).attr("fill", "#077");
                        }
                    });

                week.append("text")
                    .attr("class", "day-text")
                    .attr("id", id_week + "-" + weekdata[k][i].toString() + "T")
                    .attr("x", dayX)
                    .attr("y", dayY)
                    .attr("dx", unit / 2)
                    .attr("dy", unit / 2)
                    .text(weekdata[k][i]);
            }
        }
    }

    function collapseAll() {
        d3.selectAll(".month").remove();
        d3.selectAll(".calendar").remove();
        d3.selectAll(".year").attr("transform", null);
    }

    function collapseCalendar() {
        d3.selectAll(".week").remove();
        d3.selectAll(".month").attr("transform", null);
        d3.selectAll(".year").attr("transform", `translate(${-lblockW*0.15},${height*0.2}) scale(0.6)`);
    }

    for (var i in data.year) {
        yearX = lblockW / 3;
        yearY = (height - metric.year[center.year]) / 2;
        if (i < center.year)
            for (var j = i; j < center.year; j++)
                yearY -= metric.year[j] + 5;
        else
            for (var j = center.year; j < i; j++)
                yearY += metric.year[j] + 5;

        year = svg.append("g")
            .attr("class", "year")
            .attr("id", data.year[i].toString())
            .on("mouseover", function() {
                d3.select(this).attr("cursor", "pointer");
            })
            .on("click", function() {
                id = d3.select(this).attr("id");
                // expand monthes
                if (status == "y" && id == selected_element.attr("id")) {
                    status = "ym";
                    expandMonthes();
                }
                // reposition years
                else if (status == "y" && id == selected_element.attr("id")) {
                    selected_element = d3.select(this);
                    center.year = data.year.indexOf(parseInt(id));
                    repositionYears();
                }
                // shrink monthes and etc, then reposition years
                else {
                    status = "y";
                    selected_element = d3.select(this);
                    center.year = data.year.indexOf(parseInt(id));
                    collapseAll();
                    repositionYears();
                }
            });

        if (i == center.year)
            selected_element = year;

        year.append("rect")
            .attr("class", "year-rect")
            .attr("x", yearX + 5 * Math.abs(i - center.year))
            .attr("y", yearY)
            .attr("width", lblockW / 3 - 10 * Math.abs(i - center.year))
            .attr("height", metric.year[i])
            .attr("fill", i == center.year ? "#077" : "#0bb");

        year.append("text")
            .attr("class", "year-name")
            .attr("x", yearX)
            .attr("y", yearY)
            .attr("dx", 100)
            .attr("dy", 40)
            .text(data.year[i].toString());
    }
}

drawTree();