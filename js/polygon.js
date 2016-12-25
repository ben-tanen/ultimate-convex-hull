/******************/
/* INIT VARIABLES */
/******************/

var width  = $('.main').width() - 2,
    height = 400;

var vertices = [ ],
    vertices_backup = { }

var line = d3.line()
             .x(function(d) { return d[0] })
             .y(function(d) { return d[1] });

var fxn_i = 0;

var instructions = [
    "Click on the canvas to add vertices - we'll be computing the convex hull of those points!",
    "This algorithm works by computing the upper or lower hulls of our points individually. If we want the full convex hull, we can just join the upper and lower hulls. For now, let's focus on the upper half of our points (i.e., those above the segment between $x_{min}$ and $x_{max}$).",
    "Now that we are working with just the upper points, we can begin computing the upper hull. This is a divide and conquer algorithm so we will first <b>divide</b> our points into two sets using the median $x$ value.",
    "With our points now divided into two sets, we want to find a <i>bridge</i> edge that will connect one hull point from our left set of points to another hull point in our right set of points. This bridge edge will be part of our convex hull and it will <b>merge</b> our divided sets.",
    "This is the bridge edge that we are looking for, but how can we find it in $O(n)$ time? We want an edge with the same slope of $k$ so let's try drawing random edges between our points and see if we get an edge with slope of $k$."
];

/******************/
/* POLY FUNCTIONS */
/******************/

function redrawVerticies() {
    svg.selectAll("circle")
        .data(vertices).enter()
        .append("circle")
        .attr("class", "vertex")
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

function centerPoints(points) {
    // find current center of points
    var [xs,ys] = unzip(points);
    var x_c     = (d3.max(xs) - d3.min(xs)) / 2 + d3.min(xs),
        y_c     = (d3.max(ys) - d3.min(ys)) / 2 + d3.min(ys);
    
    // define the translation vector
    var translate_x = (width / 2)  - x_c,
        translate_y = (height / 2) - y_c;

    // clear current points, to be replaced with new locations
    vertices = [ ]

    // translate every point (for center)
    d3.selectAll("circle")
        .each(function(d) {
            var p = d3.select(this);
            p.transition(400)
                .attr("cx", parseFloat(p.attr("cx")) + translate_x)
                .attr("cy", parseFloat(p.attr("cy")) + translate_y);

            if (!p.classed("removed")) vertices.push([parseFloat(p.attr("cx")) + translate_x, parseFloat(p.attr("cy")) + translate_y]);
        });
}

function scalePoints(points, scale) {
    // find current center of points
    var [xs,ys] = unzip(points);
    var x_c     = (d3.max(xs) - d3.min(xs)) / 2 + d3.min(xs),
        y_c     = (d3.max(ys) - d3.min(ys)) / 2 + d3.min(ys);

    // clear current points, to be replaced with new locations
    vertices = [ ]

    // translate every point (for scale)
    d3.selectAll("circle")
        .each(function(d) {
            var p  = d3.select(this);
            var dx = x_c - parseFloat(p.attr("cx")),
                dy = y_c - parseFloat(p.attr("cy"));

            p.transition(400)
                .attr("cx", x_c - dx * scale)
                .attr("cy", y_c - dy * scale);

            if (!p.classed("removed")) vertices.push([x_c - dx * scale, y_c - dy * scale]);
        });
}

// given a set of points,
// calculate the scale
function calcScale(points, portion) {
    var [xs, ys] = unzip(points);
    var p_width  = d3.max(xs) - d3.min(xs),
        p_height = d3.max(ys) - d3.min(ys);

    if ((p_width / width) > (p_height / height)) {
        return portion / (p_width  / width);
    } else {
        return portion / (p_height / height);
    }
}

/*************/
/* BUILD SVG */
/*************/

var svg = d3.select(".svg-container").append("svg")
    .attr("width", width)
    .attr("height", height)
    .on("click", function() {
        if (vertices.length == 0) $('.next-button').removeClass('disabled');
        if (fxn_i == 0) {
            vertices.push(d3.mouse(this));
            redrawVerticies();
        }
    });

/********************/
/* LESSON FUNCTIONS */
/********************/

function updateInstructions(text) {
    if (text != null) {
        $('#instruction').fadeOut(200, function() {
            $(this).delay(200).html(text).fadeIn(400);
        });
    }

    setTimeout(function() { MathJax.Hub.Queue(["Typeset",MathJax.Hub]); }, 300);
}

var fxns = [
    {   // (adding points)                 => (draw hull divider)
        next: function() {
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
                .style('opacity', 0)
                .transition(400)
                .style('opacity', 1);
        },
        prev: function() { }        
    },{ // (draw hull divider)             => (remove lower hull and refocus)
        next: function() {
            // disable next button (while animating)
            $('.next-button').addClass("disabled");
            $('.prev-button').addClass("disabled");

            // find x_min and x_max
            var [xs, ys] = unzip(vertices);
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

            // store backup of vertices (if user goes back)
            // and clear vertices so we can store new locations (after centering / scaling)
            vertices_backup["all"] = vertices;
            vertices = [ ];

            // remove lower hull points
            d3.selectAll("circle")
                .each(function(d) {
                    if (inLowerHull(d)) {
                        d3.select(this)
                            .classed("removed", true)
                            .attr("id", "lower-hull")
                    } else {
                        vertices.push(d);
                    }
                });

            d3.select('#hull-divider')
                .transition(400).delay(800)
                .style('opacity', 0).remove();

            // center and scale points
            setTimeout(function() {
                centerPoints(vertices);
            }, 1200);
            setTimeout(function() {
                scalePoints(vertices, calcScale(vertices, 0.75));
            }, 2000);

            // re-enable next step button
            setTimeout(function() {
                $('.next-button').removeClass("disabled");
                $('.prev-button').removeClass("disabled");
            }, 2400);
        },
        prev: function() {
            svg.select('#hull-divider').transition(400).style('opacity', 0).delay(400).remove();
        }        
    },{ // (remove lower hull and refocus) => (first median and coloring)
        next: function() {
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
        },
        prev: function() {
            // fade out all vertices
            svg.selectAll('circle').classed('removed', true);

            setTimeout(function() {
                // delete all circles and add back original point set
                svg.selectAll('circle').remove();
                vertices = vertices_backup["all"];
                redrawVerticies();

                // recalc x_min and x_max so we can redraw hull divider
                var x_min = [width, 0],
                    x_max = [0, 0];
                for (var i = 0; i < vertices.length; i++) {
                    if (vertices[i][0] < x_min[0]) x_min = vertices[i];
                    if (vertices[i][0] > x_max[0]) x_max = vertices[i];
                }

                // redraw hull divider
                svg.append('path')
                    .attr('id', 'hull-divider')
                    .attr('d', line([x_min, x_max]) + 'Z')
                    .style('stroke-width', 0.5)
                    .style('stroke', 'steelblue')
                    .style('fill', 'none')
                    .style('opacity', 1);
            }, 400);
        } 
    },{ // (first median and coloring)     => (draw first bridge)
        next: function() {
            var [xs, ys] = unzip(vertices);
            var ch = d3.polygonHull(vertices);
            for (var i = 1; i < ch.length; i++) {
                if (ch[i][0] < d3.median(xs) && ch[i-1][0] >= d3.median(xs)) {
                    svg.append('path')
                        .attr('class', 'bridge')
                        .attr('id', 'a1')
                        .attr('d', line([ch[i], ch[i-1]]) + 'Z')
                        // .style('stroke-width', 0.5)
                        // .style('stroke', 'grey')
                        // .style('fill', 'none')
                        .style('opacity', 0);

                    svg.select('.bridge#a1').transition(400).style('opacity', 1);
                }
            }
        },
        prev: function() { 
            d3.selectAll("circle")
                .transition(400)
                .style("fill", "black");
        } 
    },{
        next: function() { },
        prev: function() { 
            svg.select('.bridge#a1').transition(400).style('opacity', 0).delay(400).remove();
        },
    }
];

$(document).ready(function() {
    $('.next-button').click(function() {
        if (fxn_i < fxns.length - 1) {
            fxns[fxn_i].next();
            fxn_i++;

            updateInstructions(instructions[fxn_i]);
        }

        if (fxn_i == fxns.length - 1) $('.next-button').addClass('disabled');
        $('.prev-button').removeClass('disabled');
    });

    $('.prev-button').click(function() {
        if (fxn_i > 0) {
            fxns[fxn_i].prev();
            fxn_i--;

            updateInstructions(instructions[fxn_i]);
        }

        if (fxn_i == 0) $('.prev-button').addClass('disabled');
        $('.next-button').removeClass('disabled');
    });
});