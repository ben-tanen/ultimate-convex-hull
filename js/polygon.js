/******************/
/* INIT VARIABLES */
/******************/

var width  = $('.main').width() - 2,
    height = 400;

var vertices = [ ];

var line = d3.line()
             .x(function(d) { return d[0] })
             .y(function(d) { return d[1] });

/******************/
/* POLY FUNCTIONS */
/******************/

function redrawVerticies() {
    svg.selectAll("circle")
        .data(vertices).enter()
        .append("circle")
        .attr("r", 5)
        .attr("cx", function(d) { return d[0] })
        .attr("cy", function(d) { return d[1] });
}

function drawPath(points) {
    if (!points || points.length < 2) return;

    var line = d3.line()
                 .x(function(d) { return d[0] })
                 .y(function(d) { return d[1] });

    svg.append('path')
        .attr('d', line(points) + 'Z')
        .style('stroke-width', 1)
        .style('stroke', 'steelblue')
        .style('fill', 'none')
        .style('opacity', 0);

    svg.selectAll('path').transition(400).style('opacity', 1);
}

function unzip(points) {
    var xs = [ ],
        ys = [ ];

    for (var i = 0; i < points.length; i++) {
        xs.push(points[i][0]);
        ys.push(points[i][1]);
    }

    return [xs,ys];
}

/********************/
/* LESSON FUNCTIONS */
/********************/

function updateInstructions(text1, text2) {
    if (text1 != null) $('#instruction1').fadeOut(300, function() {
        $(this).html(text1).fadeIn(300);
    });
    if (text1 != null && text2 != null) $('#instruction2').fadeOut(300, function() {
        $(this).html(text2).delay(800).fadeIn(300);
    });
    else if (text2 != null) $('#instruction2').fadeOut(300, function() {
        $(this).html(text2).fadeIn(300);
    });

    setTimeout(function() { MathJax.Hub.Queue(["Typeset",MathJax.Hub]); }, 350);
}

/*************/
/* BUILD SVG */
/*************/

var svg = d3.select(".svg-container").append("svg")
    .attr("width", width)
    .attr("height", height)
    .on("click", function() {
        if (vertices.length == 0) updateInstructions(null, "Press the Spacebar when you're done adding vertices");
        if (fxn_i == 0) {
            vertices.push(d3.mouse(this));
            redrawVerticies();
        }
    });

var fxns = [
    // SHOW HULL DIVIDER
    function() {
        var [xs, ys] = unzip(vertices);

        var x_min = [width, 0],
            x_max = [0, 0];
        for (var i = 0; i < vertices.length; i++) {
            if (vertices[i][0] < x_min[0]) x_min = vertices[i];
            if (vertices[i][0] > x_max[0]) x_max = vertices[i];
        }

        svg.append('path')
            .attr('id', 'hull-divider')
            .attr('d', line([x_min, x_max]) + 'Z')
            .style('stroke-width', 0.5)
            .style('stroke', 'steelblue')
            .style('fill', 'none')
            .style('opacity', 0);

        svg.select('#hull-divider').transition(400).style('opacity', 1);

        updateInstructions("This algorithm works by computing the upper or lower hulls of our points individually. If we want the full convex hull, we can just join the upper and lower hulls. For now, let's focus on the upper half of our points (i.e., those above the segment between $x_{min}$ and $x_{max}$).", "Press the Spacebar to continue");
    },

    // FOCUS ON UPPER HULL
    function() {
        var [xs, ys] = unzip(vertices);

        // find x_min and x_max
        var x_min = [width, 0],
            x_max = [0, 0];
        for (var i = 0; i < vertices.length; i++) {
            if (vertices[i][0] < x_min[0]) x_min = vertices[i];
            if (vertices[i][0] > x_max[0]) x_max = vertices[i];
        }

        // make test if point is above or below divider
        var sl = (x_max[1] - x_min[1]) / (x_max[0] - x_min[0]);
        var inLowerHull = function(d) {
            return d[1] > (d[0] - x_min[0]) * sl + x_min[1]
        } 

        d3.selectAll("circle")
            .each(function(d) {
                if (inLowerHull(d)) {
                    d3.select(this)
                        .transition(400).style('opacity', 0)
                        .delay(400).remove();

                    var i = vertices.indexOf(d);
                    if (i > -1) vertices.splice(i, i + 1);
                }
            });

        d3.select('#hull-divider')
            .transition(400).delay(800)
            .style('opacity', 0).remove();

        //
        // center and scale upper hull
        //
        var [xs, ys] = unzip(vertices);
        var dx  = (width  / 2) - ((d3.max(xs) - d3.min(xs)) / 2 + d3.min(xs));
        var dy  = (height / 2) - ((d3.max(ys) - d3.min(ys)) / 2 + d3.min(ys));
        var sc  = 0.6 * width / (d3.max(xs) - d3.min(xs));
        if ((d3.max(ys) - d3.min(ys)) > (d3.max(xs) - d3.min(xs))) sc = 0.6 * height / (d3.max(ys) - d3.min(ys));

        // erase vertices (to update for new centered positions)
        vertices = [ ];

        d3.selectAll("circle")
            .each(function(d) {
                var p  = d3.select(this)
                var cx = parseFloat(p.attr("cx")),
                    cy = parseFloat(p.attr("cy"));

                // first center, then scale
                p.transition(400).delay(1200)
                    .attr("cx", cx + dx)
                    .attr("cy", cy + dy)
                    .transition(400).delay(400)
                    .attr("cx", width  * (0.5 - (sc / 2)) + sc * (cx + dx))
                    .attr("cy", height * (0.5 - (sc / 2)) + sc * (cy + dy));

                // add new centered position
                if (!inLowerHull(d)) {
                    vertices.push([width  * (0.5 - (sc / 2)) + sc * (cx + dx), height * (0.5 - (sc / 2)) + sc * (cy + dy)]);
                }
            });

        updateInstructions("Now that we are working with just the upper points, we can begin computing the upper hull. This is a divide and conquer algorithm so we will first <b>divide</b> our points into two sets using the median $x$ value.", "Press the Spacebar to continue");
    },

    // DRAW FIRST MEDIAN
    function() {
        var [xs, ys] = unzip(vertices);

        svg.append('path')
            .attr('id', 'median')
            .attr('d', line([[d3.median(xs), 15], [d3.median(xs), height - 15]]) + 'Z')
            .style('stroke-width', 0.5)
            .style('stroke', 'steelblue')
            .style('fill', 'none')
            .style('opacity', 0)
            .transition(400)
            .style('opacity', 1);

        d3.selectAll("circle")
            .transition(400).delay(400)
            .style("fill", function() {
                var cx = d3.select(this).attr("cx");
                if (cx < d3.median(xs)) return "#00adff";
                else return "#f95968";
            });

        svg.select('#median').transition(400).delay(1200).style('opacity', 0).remove(); 

        updateInstructions("With our points now divided into two sets, we want to find a <i>bridge</i> edge that will connect one hull point from our left set of points to another hull point in our right set of points. This bridge edge will be part of our convex hull and it will <b>merge</b> our divided sets.", "Press the Spacebar to continue");     
    },

    // UPDATE INSTRUCTIONS BEFORE FIRST RANDOM PAIRING
    function() {
        var [xs, ys] = unzip(vertices);
        var ch = d3.polygonHull(vertices);
        for (var i = 1; i < ch.length; i++) {
            if (ch[i][0] < d3.median(xs) && ch[i-1][0] >= d3.median(xs)) {
                svg.append('path')
                    .attr('id', 'bridge')
                    .attr('d', line([ch[i], ch[i-1]]) + 'Z')
                    .style('stroke-width', 0.5)
                    .style('stroke', 'grey')
                    .style('fill', 'none')
                    .style('opacity', 0);

                svg.select('#bridge').transition(400).style('opacity', 1);
            }
        }

        updateInstructions("This is the bridge edge that we are looking for, but how can we find it in $O(n)$ time? We want an edge with the same slope of $k$ so let's try drawing random edges between our points and see if we get an edge with slope of $k$.", "Press the Spacebar to continue");
    },
];

var fxn_i = 0;

$(document).keyup(function(e) {
    if (e.keyCode == 32 && fxn_i < fxns.length) {
        fxns[fxn_i]();
        fxn_i++;
    }
});