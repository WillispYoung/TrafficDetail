var width = $(window).width(),
    height = $(window).height();

function update_size() {
	width = $(window).width();
	height = $(window).height();

	$("body").width(width * 0.99);
	$("body").height(height * 0.96);
}

update_size();

$(window).resize(function() {
    update_size();
});

