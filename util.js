var width = $(window).width(),
    height = $(window).height();

function update_size() {
	width = $(window).width();
	height = $(window).height();

	$("body").width(width * 0.99);
	$("body").height(height * 0.96);
    $(".col-7").width(width * 7 / 12.5);
    $(".col-7").height(height * 0.95);
    $(".col-5").width(width * 5 / 12.5);
    $(".col-5").height(height * 0.95);

    var tWidth = $("#tree").width();
    d3.select("#year").attr("width", tWidth * 0.95);
}

update_size();

$(window).resize(function() {
    update_size();
});

