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
    "So we were able to find our bridge edge and we can see that this is the first edge in the convex hull. So how do we find the rest? Well, before moving forward, let's get rid of some vertices that we know won't be on the convex hull.",
    "We can see that all of the points in this region will not be on the convex hull. So to speed up our search, let's remove these points and then recurse on our left and right sides.",
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

function drawMedianTrialBridge(id) {
    var actual_bridge = $('.bridge.actual#' + id.split("-").splice(0,2).join("-"))[0],
        trial_bridges = $('.bridge.trial#' + id);
    var k  = getLineSlope(actual_bridge);
        ks = [ ];

    // accumulate slopes to use for median
    for (var i = 0; i < trial_bridges.length; i++) {
        ks.push(getLineSlope(trial_bridges[i]));
    }

    var bbox   = actual_bridge.getBBox();
    var bbox_c = [bbox.x + bbox.width / 2, bbox.y + bbox.height / 2];

    var l_min = [bbox_c[0] - (bbox.width / 2), bbox_c[1] + (bbox.width / 2) * d3.median(ks)],
        l_max = [bbox_c[0] + (bbox.width / 2), bbox_c[1] - (bbox.width / 2) * d3.median(ks)];

    // draw median test
    svg.append('path')
        .classed('bridge', true)
        .classed('test', true)
        .attr('id', id)
        .attr('d', line([l_min, l_max]) + 'Z')
        .style('opacity', 0)
        .transition(400)
        .style('opacity', 1);
}

function defocusExtremeVertices(id) {
    var actual_bridge = $('.bridge.actual#' + id.split("-").splice(0,2).join("-"))[0],
        test_bridge   = $('.bridge.test#' + id)[0];

    var ep = 0.0000001

    for (var i = 0; i < pairs.length; i++) {
        var pair_slope = -(pairs[i][0][1] - pairs[i][1][1]) / (pairs[i][0][0] - pairs[i][1][0]);
        
        var p_defocus = [ ]
        if (pair_slope - ep <= getLineSlope(test_bridge) && getLineSlope(test_bridge) < getLineSlope(actual_bridge)) {
            p_defocus = (pairs[i][0][0] < pairs[i][1][0] ? pairs[i][1] : pairs[i][0]);
        } else if (pair_slope + ep >= getLineSlope(test_bridge) && getLineSlope(test_bridge) > getLineSlope(actual_bridge)) {
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
            // calc position of median test
            drawMedianTrialBridge('a-1-1');

            // update instructions based on results
            var k = getLineSlope($('.bridge.actual#a-1')[0]);
            var t = getLineSlope($('.bridge.test#a-1-1')[0]);
            if (t == k) {
                updateInstructions("As we can see, our test edge is a perfect match!");
            } else if (t < k) {
                updateInstructions("As we can see, our median slope is too shallow so we will have to try again. In order to prune our search, we should get rid of $\\frac{1}{4}$ of our points by ignoring the right endpoints of our shallow lines. With fewer points, hopefully we'll have better luck!");
            } else {
                updateInstructions("As we can see, our median slope is too steep so we will have to try again. In order to prune our search, we should get rid of $\\frac{1}{4}$ of our points by ignoring the left endpoints of our steep lines. With fewer points, hopefully we'll have better luck!");
            }

            // store backups
            vertices_backup["a-1-1"] = vertices.slice(0);
            pairs_backup['a-1-1'] = pairs.slice(0);
        },
    },{ // step 7: median test on second pairing 
        prev: function() { 
            svg.selectAll('.bridge.test')
                .classed('removed', true)
                .transition()
                .delay(400)
                .remove();
        },
        next: function() {
            var actual_bridge = $('.bridge.actual#a-1')[0],
                test_bridge   = $('.bridge.test#a-1-1')[0];

            // if previous iteration was a success, skip this step
            if (getLineSlope(test_bridge) == getLineSlope(actual_bridge)) {
                fxn_i++;
                $(".next-button").trigger("click");
                return;
            }

            // defocus extreme vertices and hide trial / test bridges
            defocusExtremeVertices("a-1-1");
            svg.selectAll('.bridge.trial#a-1-1').classed('removed', true);
            svg.selectAll('.bridge.test#a-1-1').classed('removed', true);

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
                    .delay(800)
                    .style('opacity', 1);
            }

            updateInstructions("");

            // calc position of median test
            setTimeout(function() {
                drawMedianTrialBridge('a-1-2');

                // update instructions based on results
                var k = getLineSlope($('.bridge.actual#a-1')[0]);
                var t = getLineSlope($('.bridge.test#a-1-2')[0]);
                if (t == k) {
                    updateInstructions("As we can see, our median slope is a perfect match so we found our bridge!");
                } else if (t < k) {
                    updateInstructions("Unfortunately, our median slope again isn't quite right, but we're getting closer. Let's prune and try again, this time ignoring the right endpoints of our shallow edges.");
                } else {
                    updateInstructions("Unfortunately, our median slope again isn't quite right, but we're getting closer. Let's prune and try again, this time ignoring the left endpoints of our steeper edges.");
                }

                // store backups
                vertices_backup["a-1-2"] = vertices.slice(0);
                pairs_backup['a-1-2'] = pairs.slice(0);
            }, 1600);
        },
    },{ // step 8: median test on third pairing 
        prev: function() {
            // remove current iteration of bridges
            svg.selectAll('.bridge.test#a-1-2')
                .classed('removed', true)
                .transition().delay(400).remove();
            svg.selectAll('.bridge.trial#a-1-2')
                .classed('removed', true)
                .transition().delay(400).remove();

            // revert to older backups
            vertices = vertices_backup['a-1-1'].slice(0);
            pairs    = pairs_backup['a-1-1'];

            // update instructions to previous step
            var k = getLineSlope($('.bridge.actual#a-1')[0]);
            var t = getLineSlope($('.bridge.test#a-1-1')[0]);
            if (t == k) {
                updateInstructions("Success! Our median slope is a perfect match so we found our bridge!");
            } else if (t < k) {
                updateInstructions("As we can see, our median slope is too shallow so we will have to try again. In order to prune our search, we should get rid of $\\frac{1}{4}$ of our points by ignoring the right endpoints of our shallow lines. With fewer points, hopefully we'll have better luck!");
            } else {
                updateInstructions("As we can see, our median slope is too steep so we will have to try again. In order to prune our search, we should get rid of $\\frac{1}{4}$ of our points by ignoring the left endpoints of our steep lines. With fewer points, hopefully we'll have better luck!");
            }

            // reveal bridges from previous step
            setTimeout(function() {
                svg.selectAll('.vertex.defocused').classed('defocused', false);

                svg.selectAll('.bridge.test#a-1-1')
                    .classed('removed', false);

                svg.selectAll('.bridge.trial#a-1-1')
                    .classed('removed', false);
            }, 800);
        },
        next: function() {
            var actual_bridge = $('.bridge.actual#a-1')[0],
                test1_bridge  = $('.bridge.test#a-1-1')[0],
                test2_bridge  = $('.bridge.test#a-1-2')[0];

            // if previous iteration was a success, skip this step
            if (getLineSlope(test1_bridge) == getLineSlope(actual_bridge) ||
                getLineSlope(test2_bridge) == getLineSlope(actual_bridge)) {
                fxn_i++;
                $(".next-button").trigger("click");
                return;
            }

            // defocus extreme vertices and hide trial / test bridges
            defocusExtremeVertices("a-1-2");
            svg.selectAll('.bridge.trial#a-1-2').classed('removed', true);
            svg.selectAll('.bridge.test#a-1-2').classed('removed', true);

            // find new random pairings
            pairs = randomlyPairPoints(vertices.slice(0));
            for (var i = 0; i < pairs.length; i++) {
                svg.append('path')
                    .classed('bridge', true)
                    .classed('trial', true)
                    .attr('id', 'a-1-3')
                    .attr('d', line([pairs[i][0], pairs[i][1]]) + 'Z')
                    .style('opacity', 0)
                    .transition(400)
                    .delay(800)
                    .style('opacity', 1);
            }

            updateInstructions("");

            // calc position of median test
            setTimeout(function() {
                drawMedianTrialBridge('a-1-3');

                // update instructions based on results
                var k = getLineSlope($('.bridge.actual#a-1')[0]);
                var t = getLineSlope($('.bridge.test#a-1-3')[0]);
                if (t == k) {
                    updateInstructions("Success! Our median slope is a perfect match so we found our bridge!");
                } else {
                    updateInstructions("Unfortunately, this recursive process can take a number of iterations so let's skip to actually finding our bridge edge.");
                }
            }, 1600);
        },
    },{ // step 9: skip to final match 
        prev: function() { 
            // remove current iteration of bridges
            svg.selectAll('.bridge.test#a-1-3')
                .classed('removed', true)
                .transition().delay(400).remove();
            svg.selectAll('.bridge.trial#a-1-3')
                .classed('removed', true)
                .transition().delay(400).remove();

            // revert to older backups
            vertices = vertices_backup['a-1-2'].slice(0);
            pairs    = pairs_backup['a-1-2'];

            // update instructions based on results
            var k = getLineSlope($('.bridge.actual#a-1')[0]);
            var t = getLineSlope($('.bridge.test#a-1-2')[0]);
            if (t == k) {
                updateInstructions("Success! Our median slope is a perfect match so we found our bridge!");
            } else if (t < k) {
                updateInstructions("Unfortunately, our median slope again isn't quite right, but we're getting closer. Let's prune and try again, this time ignoring the right endpoints of our shallow edges.");
            } else {
                updateInstructions("Unfortunately, our median slope again isn't quite right, but we're getting closer. Let's prune and try again, this time ignoring the left endpoints of our steeper edges.");
            }

            // reveal bridges from previous step
            setTimeout(function() {
                svg.selectAll('.vertex.defocused').classed('defocused', false);

                svg.selectAll('.bridge.test#a-1-2')
                    .classed('removed', false);

                svg.selectAll('.bridge.trial#a-1-2')
                    .classed('removed', false);
            }, 800);
        },
        next: function() {
            vertices = vertices_backup['a-1-1'];

            svg.selectAll('.vertex')
                .classed('defocused', false)
                .transition(400)
                .style('fill', 'black');

            svg.selectAll('.bridge.trial').classed('removed', true);
            svg.selectAll('.bridge.test').classed('removed', true);
            svg.selectAll('.bridge.actual').classed('found', true);

            // remove ability to step back (gets confusing)
            $('.prev-button').addClass('disabled');
        },
    },{ // step 10: 
        prev: function() { 
            console.log('should not be triggered....');
        },
        next: function() { 
            // re-enable previous button
            $('.prev-button').removeClass('disabled');

            // find x_min and x_max
            var [xs, ys] = unzip(vertices),
                x_max    = [ ],
                x_min    = [ ];
            for (var i = 0; i < vertices.length; i++) {
                if (vertices[i][0] == d3.min(xs)) x_min = vertices[i];
                if (vertices[i][0] == d3.max(xs)) x_max = vertices[i];
            }

            // find vertices of new bridge
            var bridge  = $('.bridge.actual#a-1')[0],
                bbox    = bridge.getBBox(),
                slope   = getLineSlope(bridge),
                v_left  = [bbox.x, bbox.y + (slope >= 0 ? bbox.height : 0)],
                v_right = [bbox.x + bbox.width, bbox.y + (slope >= 0 ? 0 : bbox.height)];

            svg.append('path')
                .attr('class', 'bounding-poly')
                .attr('id', 'a-1')
                .attr('d', line([v_left, x_min, x_max, v_right]))
                .style('stroke-width', 1)
                .style('stroke', 'steelblue')
                .style('fill', 'none')
                .style('opacity', 0)
                .transition(400)
                .style('opacity', 1);
        },
    },{ // step ...:
        prev: function() {
            // disenable previous button
            $('.prev-button').addClass('disabled');
        },
        next: function() {
            // find x_min and x_max
            var [xs, ys] = unzip(vertices),
                x_max    = [ ],
                x_min    = [ ];
            for (var i = 0; i < vertices.length; i++) {
                if (vertices[i][0] == d3.min(xs)) x_min = vertices[i];
                if (vertices[i][0] == d3.max(xs)) x_max = vertices[i];
            }

            // find vertices of new bridge
            var bridge  = $('.bridge.actual#a-1')[0],
                bbox    = bridge.getBBox(),
                slope   = getLineSlope(bridge),
                v_left  = [bbox.x, bbox.y + (slope >= 0 ? bbox.height : 0)],
                v_right = [bbox.x + bbox.width, bbox.y + (slope >= 0 ? 0 : bbox.height)];

            svg.selectAll('.vertex')
                .each(function(d) {
                    var p = d3.select(this);
                    if (d3.polygonContains([x_min, v_left, v_right, x_max, x_min], d) && !p.classed('removed')) {
                        p.classed('removed', true).attr('id', 'a-1-bounding');
                    }
                });

            setTimeout(function() {
                svg.selectAll('.bounding-poly#a-1').classed('removed', true);
            }, 800);
        },
    },{ // step ...:
        prev: function() {
            svg.selectAll('.vertex#a-1-bounding').classed('removed', false);
            svg.selectAll('.bounding-poly#a-1').classed('removed', false);
        },
        next: function() { },
    }
];

// enable forward and back step buttons
$(document).ready(function() {
    $('.next-button').click(function() {
        console.log(fxn_i);

        if (fxn_i < fxns.length - 1 && !$('.next-button').hasClass('disabled')) {
            updateInstructions(instructions[fxn_i + 1]);
            fxns[fxn_i].next();
            fxn_i++;
        }

        if (fxn_i == fxns.length - 1) $('.next-button').addClass('disabled');
        if (fxn_i == 1) $('.prev-button').removeClass('disabled');
    });    

    $('.prev-button').click(function() {
        console.log(fxn_i);

        if (fxn_i > 0 && !$('.prev-button').hasClass('disabled')) {
            updateInstructions(instructions[fxn_i - 1]);
            fxns[fxn_i].prev();
            fxn_i--;
        }

        if (fxn_i == 0) $('.prev-button').addClass('disabled');
        if (fxn_i == fxns.length - 2) $('.next-button').removeClass('disabled');
    });

    $(document).keyup(function(e) {
        if      (e.keyCode == 39) $(".next-button").trigger("click");
        else if (e.keyCode == 37) $(".prev-button").trigger("click");
    });
});