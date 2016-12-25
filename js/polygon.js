/******************/
/* INIT VARIABLES */
/******************/

var width  = $('.main').width() - 2,
    height = 400;

var vertices = [ ],
    vertices_backup = { };

var pairs = [ ],
    pairs_backup = { };

var line = d3.line()
             .x(function(d) { return d[0] })
             .y(function(d) { return d[1] });

var fxn_i = 0;

var instructions = [
    "Click on the canvas to add vertices - we'll be computing the convex hull of those points!",
    "This algorithm works by computing the upper or lower hulls of our points individually. If we want the full convex hull, we can just join the upper and lower hulls. For now, let's focus on the upper half of our points (i.e., those above the segment between $x_{min}$ and $x_{max}$).",
    "Now that we are working with just the upper points, we can begin computing the upper hull. This is a divide and conquer algorithm so we will first <b>divide</b> our points into two sets using the median $x$ value.",
    "With our points now divided into two sets, we want to find a <i>bridge</i> edge that will connect one hull point from our left set of points to another hull point in our right set of points. This bridge edge will be part of our convex hull and it will <b>merge</b> our divided sets.",
    "This is the bridge edge that we are looking for, but how can we find it in $O(n)$ time? We want an edge with the same slope of $k$ so let's try drawing random edges between our points and see if we get an edge with slope of $k$.",
    "With our random pairings, let's try out the median slope of our pairings to see if it is equal to $k$.",
    "testing b",
    "testing c",
    "testing d",
    "testing e",
    "testing f",
    "testing g",
    "testing h",
];

/******************/
/* POLY FUNCTIONS */
/******************/

function unzip(points) {
    var xs = [ ],
        ys = [ ];

    for (var i = 0; i < points.length; i++) {
        xs.push(points[i][0]);
        ys.push(points[i][1]);
    }

    return [xs,ys];
}

function redrawVerticies() {
    svg.selectAll("circle")
        .data(vertices).enter()
        .append("circle")
        .attr("class", "vertex")
        .attr("r", 5)
        .attr("cx", function(d) { return d[0] })
        .attr("cy", function(d) { return d[1] });
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

function randomlyPairPoints(points) {
    var p_copy = points;
    var pairs  = [ ];

    while (p_copy.length >= 2) {
        var ix_1 = Math.floor(Math.random() * p_copy.length),
            p_1  = p_copy.splice(ix_1, 1),
            ix_2 = Math.floor(Math.random() * p_copy.length),
            p_2  = p_copy.splice(ix_2, 1);

        pairs.push([p_1[0], p_2[0]]);
    }

    return pairs;
}

function getLineSlope(line_path) {
    var bbox = line_path.getBBox();
        d    = $(line_path).attr('d'),
        d_a  = d.replace("M","").replace("Z","").replace("L","|").split("|"),
        d_b  = [d_a[0].split(','), d_a[1].split(',')],
        xPos = parseFloat(d_b[0][0]) < parseFloat(d_b[1][0]),
        yPos = parseFloat(d_b[0][1]) > parseFloat(d_b[1][1]),
        s    = (xPos ? 1 : -1) * (yPos ? 1 : -1);

    return s * bbox.height / bbox.width;
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
    {   // step 1: draw hull divider 
        // draw hull divider 
        next: function() {
            var [xs, ys] = unzip(vertices);

            var x_min = [width, 0],
                x_max = [0, 0];
            for (var i = 0; i < vertices.length; i++) {
                if (vertices[i][0] < x_min[0]) x_min = vertices[i];
                if (vertices[i][0] > x_max[0]) x_max = vertices[i];
            }

            svg.append('path')
                .classed('bridge', true)
                .attr('id', 'hull-divider')
                .attr('d', line([x_min, x_max]) + 'Z')
                .style('opacity', 0)
                .transition(400)
                .style('opacity', 1);
        },       
    },{ // step 2: focus on upper hull 
        // delete hull divider
        prev: function() {
            svg.selectAll('#hull-divider')
                .classed("removed", true)
                .transition()
                .delay(400)
                .remove();  
        },

        // remove lower hull and refocus 
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
                            .classed("lower-hull", true)
                    } else {
                        vertices.push(d);
                    }
                });

            d3.select('#hull-divider')
                .classed('removed', true);         

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
        }     
    },{ // step 3: first coloring 
        // re-add lower hull and divider
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
                svg.select('#hull-divider')
                    .classed("removed", false);
            }, 400);
        },

        // draw first median and color
        next: function() {
            var [xs, ys] = unzip(vertices);

            svg.append('path')
                .classed('median', true)
                .attr('d', line([[d3.median(xs), 15], [d3.median(xs), height - 15]]) + 'Z')
                .style('opacity', 0)
                .transition(400)
                .style('opacity', 1);

            d3.selectAll("circle")
                .transition(400)
                .delay(400)
                .style("fill", function() {
                    var cx = d3.select(this).attr("cx");
                    if (cx < d3.median(xs)) return "#00adff";
                    else return "#f95968";
                });

            svg.select('.median')
                .transition(400)
                .delay(800)
                .style('opacity', 0)
                .remove(); 
        } 
    },{ // step 4: show first bridge 
        // recolor all vertices black
        prev: function() { 
            d3.selectAll("circle")
                .transition(400)
                .style("fill", "black");
        },

        // draw first bridge 
        next: function() {
            var [xs, ys] = unzip(vertices);
            var ch = d3.polygonHull(vertices);
            for (var i = 1; i < ch.length; i++) {
                if (ch[i][0] < d3.median(xs) && ch[i-1][0] >= d3.median(xs)) {
                    svg.append('path')
                        .classed('bridge', true)
                        .classed('actual', true)
                        .attr('id', 'a-1')
                        .attr('d', line([ch[i], ch[i-1]]) + 'Z')
                        .style('opacity', 0)
                        .transition(400)
                        .style('opacity', 1);
                }
            }
        }
    },{ // step 5: first random pairing 
        // remove first bridge
        prev: function() { 
            svg.select('.bridge.actual#a-1')
                .classed('removed',true)
                .transition()
                .delay(400)
                .remove();
        },

        // randomly pair points
        next: function() {
            // find random pairings
            pairs = randomlyPairPoints(vertices.slice(0));
            for (var i = 0; i < pairs.length; i++) {
                svg.append('path')
                    .classed('bridge', true)
                    .classed('trial', true)
                    .attr('id', 'a-1-1')
                    .attr('d', line([pairs[i][0], pairs[i][1]]) + 'Z')
                    .style('opacity', 0)
                    .transition(400)
                    .style('opacity', 1);
            }
        }
    },{ // step 6: median test on first pairing 
        // show first bridge and remove random pairings
        prev: function() { 
            // delete all other bridges
            svg.selectAll('.bridge.trial')
                .classed('removed', true)
                .transition()
                .delay(400)
                .remove();
        },

        // show median test
        next: function() {
            var actual_bridge = $('.bridge.actual#a-1')[0],
                trial_bridges = $('.bridge.trial#a-1-1');
            var k  = getLineSlope(actual_bridge);
                ks = [ ];

            // accumulate slopes to use for median
            for (var i = 0; i < trial_bridges.length; i++) {
                ks.push(getLineSlope(trial_bridges[i]));
            }

            // calc position of median test
            var l_min = [actual_bridge.getBBox().x, actual_bridge.getBBox().y + (k > 0 ? actual_bridge.getBBox().height : 0)],
                l_max = [l_min[0] + actual_bridge.getBBox().width, l_min[1] - actual_bridge.getBBox().width * d3.median(ks)]

            // draw median test
            svg.append('path')
                .classed('bridge', true)
                .classed('test', true)
                .attr('id', 'a-1-1')
                .attr('d', line([l_min, l_max]) + 'Z')
                .style('opacity', 0)
                .transition(400)
                .style('opacity', 1);

            // update instructions based on results
            if (getLineSlope($('.bridge.test#a-1-1')[0]) == k) {
                updateInstructions("As we can see, our test edge is a perfect match!");
            } else if (getLineSlope($('.bridge.test#a-1-1')[0]) < k) {
                updateInstructions("As we can see, our median slope is too shallow so we will have to try again. In order to prune our search, we should get rid of $\\frac{1}{4}$ of our points by ignoring the right endpoints of our shallow lines. With fewer points, hopefully we'll have better luck!");
            } else {
                updateInstructions("As we can see, our median slope is too steep so we will have to try again. In order to prune our search, we should get rid of $\\frac{1}{4}$ of our points by ignoring the left endpoints of our steep lines. With fewer points, hopefully we'll have better luck!");
            }
        },
    },{ // step 7: median test on second paring 
        prev: function() { 
            svg.selectAll('.bridge.test')
                .classed('removed', true)
                .transition()
                .delay(400)
                .remove();
        },
        next: function() {
            var actual_bridge = $('.bridge.actual')[0]
                k             = getLineSlope(actual_bridge);

            // if previous iteration was a success, skip this step
            if (getLineSlope($('.bridge.test')[0]) == k) {
                fxn_i++;
                $(".next-button").trigger("click");
                return;
            }

            // store backup
            vertices_backup["a-1-1"] = vertices.slice(0);

            for (var i = 0; i < pairs.length; i++) {
                var pair_slope = -(pairs[i][0][1] - pairs[i][1][1]) / (pairs[i][0][0] - pairs[i][1][0]);
                var test_slope = getLineSlope($('.bridge.test#a-1-1')[0]);

                var p_defocus = [ ]
                if (pair_slope <= test_slope && test_slope < k) {
                    p_defocus = (pairs[i][0][0] < pairs[i][1][0] ? pairs[i][1] : pairs[i][0]);
                } else if (pair_slope >= test_slope && test_slope > k) {
                    p_defocus = (pairs[i][0][0] < pairs[i][1][0] ? pairs[i][0] : pairs[i][1]);
                }

                if (p_defocus.length != 0) vertices.splice(vertices.indexOf(p_defocus), 1);

                svg.selectAll("circle")
                    .each(function(d) {
                        var p         = d3.select(this),
                            [p_x,p_y] = [parseFloat(p.attr("cx")), parseFloat(p.attr("cy"))];
                        if (p_x == p_defocus[0] && p_y == p_defocus[1]) p.classed('defocused', true);
                    });
            }

            svg.selectAll('.bridge.trial#a-1-1')
                .classed('removed', true);

            svg.selectAll('.bridge.test#a-1-1')
                .classed('removed', true);

            pairs_backup['a-1-1'] = pairs.slice(0)

            // find new random pairings
            pairs = randomlyPairPoints(vertices.slice(0));
            for (var i = 0; i < pairs.length; i++) {
                svg.append('path')
                    .classed('bridge', true)
                    .classed('trial', true)
                    .attr('id', 'a-1-2')
                    .attr('d', line([pairs[i][0], pairs[i][1]]) + 'Z')
                    .style('opacity', 0)
                    .transition(400)
                    .delay(1200)
                    .style('opacity', 1);
            }

            var actual_bridge = $('.bridge.actual#a-1')[0],
                trial_bridges = $('.bridge.trial#a-1-2');
            var k  = getLineSlope(actual_bridge);
                ks = [ ];

            // accumulate slopes to use for median
            for (var i = 0; i < trial_bridges.length; i++) {
                ks.push(getLineSlope(trial_bridges[i]));
            }

            // calc position of median test
            var l_min = [actual_bridge.getBBox().x, actual_bridge.getBBox().y + (k > 0 ? actual_bridge.getBBox().height : 0)],
                l_max = [l_min[0] + actual_bridge.getBBox().width, l_min[1] - actual_bridge.getBBox().width * d3.median(ks)]

            // draw median test
            svg.append('path')
                .classed('bridge', true)
                .classed('test', true)
                .attr('id', 'a-1-2')
                .attr('d', line([l_min, l_max]) + 'Z')
                .style('opacity', 0)
                .transition(400)
                .delay(1200)
                .style('opacity', 1);

            // update instructions based on results
            if (getLineSlope($('.bridge.test#a-1-2')[0]) == k) {
                updateInstructions("As we can see, our test edge is a perfect match!");
            } else if (getLineSlope($('.bridge.test#a-1-2')[0]) < k) {
                updateInstructions("As we can see, our median slope is too shallow so we will have to try again. In order to prune our search, we should get rid of $\\frac{1}{4}$ of our points by ignoring the right endpoints of our shallow lines. With fewer points, hopefully we'll have better luck!");
            } else {
                updateInstructions("As we can see, our median slope is too steep so we will have to try again. In order to prune our search, we should get rid of $\\frac{1}{4}$ of our points by ignoring the left endpoints of our steep lines. With fewer points, hopefully we'll have better luck!");
            }
        },
    },{ // step ...:
        prev: function() {
            vertices = vertices_backup['a-1-1'].slice(0);
            pairs    = pairs_backup['a-1-1'];

            var k = getLineSlope($('.bridge.actual#a-1')[0]);
            var t = getLineSlope($('.bridge.test#a-1-1')[0]);

            if (t == k) {
                updateInstructions("As we can see, our test edge is a perfect match!");
            } else if (t < k) {
                updateInstructions("As we can see, our test edge is too shallow so we will have to try again. In order to prune our search, we should get rid of $\\frac{1}{4}$ of our points by ignoring the right endpoints of our shallow lines. With fewer points, hopefully we'll have better luck!");
            } else {
                updateInstructions("As we can see, our test edge is too steep so we will have to try again. In order to prune our search, we should get rid of $\\frac{1}{4}$ of our points by ignoring the left endpoints of our steep lines. With fewer points, hopefully we'll have better luck!");
            }

            setTimeout(function() {
                svg.selectAll('.vertex.defocused').classed('defocused', false);

                svg.selectAll('.bridge.test#a-1-1')
                    .classed('removed', false);

                svg.selectAll('.bridge.trial#a-1-1')
                    .classed('removed', false);
            }, 800);

            svg.selectAll('.bridge.test#a-1-2')
                .classed('removed', true)
                .transition()
                .delay(400)
                .remove();

            svg.selectAll('.bridge.trial#a-1-2')
                .classed('removed', true)
                .transition()
                .delay(400)
                .remove();
        },
        next: function() {

        },
    },{ // step ...:
        prev: function() { },
        next: function() { },
    },{ // step ...:
        prev: function() { },
        next: function() { },
    },{ // step ...:
        prev: function() { },
        next: function() { },
    },{ // step ...:
        prev: function() { },
        next: function() { },
    }
];

// enable forward and back step buttons
$(document).ready(function() {
    $('.next-button').click(function() {
        if (fxn_i < fxns.length - 1 && !$('.next-button').hasClass('disabled')) {
            console.log('updating forward', fxn_i);

            updateInstructions(instructions[fxn_i + 1]);
            fxns[fxn_i].next();
            fxn_i++;
        }

        if (fxn_i == fxns.length - 1) $('.next-button').addClass('disabled');
        $('.prev-button').removeClass('disabled');
    });    

    $('.prev-button').click(function() {
        if (fxn_i > 0 && !$('.prev-button').hasClass('disabled')) {
            updateInstructions(instructions[fxn_i - 1]);
            fxns[fxn_i].prev();
            fxn_i--;
        }

        if (fxn_i == 0) $('.prev-button').addClass('disabled');
        $('.next-button').removeClass('disabled');
    });

    $(document).keyup(function(e) {
        if      (e.keyCode == 39) $(".next-button").trigger("click");
        else if (e.keyCode == 37) $(".prev-button").trigger("click");
    });
});