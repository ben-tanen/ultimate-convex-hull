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
    "Click on the canvas to add vertices - we'll be computing the convex hull of those points so add a few! You can also hit the spacebar to add random points.",
    "This algorithm works by computing the upper or lower hulls of our points individually. If we want the full convex hull, we can just join the upper and lower hulls. For now, let's focus on the upper half of our points (i.e., those above the segment between $x_{min}$ and $x_{max}$).",
    "Now that we are working with just the upper points, we can begin computing the upper hull. This is a divide and conquer algorithm so we will first <b>divide</b> our points into two sets using the median $x$ value.",
    "With our points now divided into two sets, we want to find a <i>bridge</i> edge that will connect one hull point from our left set of points to another hull point in our right set of points. This bridge edge will be part of our convex hull and it will <b>merge</b> our divided sets.",
    "We can see this is the bridge edge that we are looking for, but how can we calculate this edge deterministically in $O(n)$ time? If we say our ideal edge has a slope of $k$, we can try out different values for $k^*$ and see if these form a bridge edge. To get some test values for $k^*$, let's try drawing random edges between our points and see what we get.",
    "Now that we have a random pairing, let's see if the median slope of our pairings might get us our ideal slope $k$. To test, we can make a line with slope $k_{median}$ and sweep it vertically. Based on this sweep, we can determine if we've found $k$.",
    "median trial 1 - you should not be seeing this... if you are, please let Ben know",
    "median trial 2 - you should not be seeing this... if you are, please let Ben know",
    "median trial 3 - you should not be seeing this... if you are, please let Ben know",
    "So we were able to find our bridge edge and we can see that this is the first edge in the convex hull. So how do we find the rest? Well, before moving forward, let's get rid of some vertices that we know won't be on the convex hull.",
    "We can see that all of the points in this region will not be on the convex hull since the convex hull is at least as big as this bounding box. So to speed up our search, let's remove these points and then recurse on our left and right sides to find more bridges.",
    "Now that we found our first bridge that connects two divided sets, we can now see that we've reduced our problem (by removing unnecessary points) so that we can recurse on two smaller sub-problems. Essentially, we can just repeat the same process on our blue points and our red points to get the convex hull of those sets. So let's see what it looks like when we recurse on one of these sub-problems.",
    "With a fraction of the original points, we can again partition our subproblem and arbitrarily pair our points in a search for for our next bridge. So first let's partition them, this time into orange and green sets.",
    "Now that we have our orange and green sets divided, let's find a bridge edge between the two. Since we're using the same process as before, let's fast forward through it.",
    "",
    "",
    ""

];

var color_pairs = [
    ["#00ADFF", "#F95968"],
    ["#FF8552", "#61E8AE"],
    ["#B5438F", "#7FD1B9"],
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

function samePoint(p1, p2) {
    return p1[0] == p2[0] && p1[1] == p2[1];
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
        .attr("r", 0)
        .attr("cx", function(d) { return d[0] })
        .attr("cy", function(d) { return d[1] })
        .transition()
        .duration(100)
        .attr("r", 5);
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
            p.transition()
                .duration(400)
                .attr("cx", parseFloat(p.attr("cx")) + translate_x)
                .attr("cy", parseFloat(p.attr("cy")) + translate_y);

            if (!p.classed("removed") && !p.classed("defocused")) {
                vertices.push([parseFloat(p.attr("cx")) + translate_x, parseFloat(p.attr("cy")) + translate_y]);
            }
        });

    // also translate any bridges
    d3.selectAll(".bridge")
        .transition()
        .duration(400)
        .attr("transform", "translate(" + translate_x + "," + translate_y + ")");
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

            p.transition()
                .duration(400)
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

function drawMedianTrialBridge(id, speed, delay1, delay2) {
    var actual_bridge = $('.bridge.actual#' + id.split("-").splice(0,2).join("-"))[0],
        trial_bridges = $('.bridge.trial#' + id);
    var k  = getLineSlope(actual_bridge);
        ks = [ ];

    // accumulate slopes to use for median
    for (var i = 0; i < trial_bridges.length; i++) {
        ks.push(getLineSlope(trial_bridges[i]));
    }

    // calculate median slope (forced to be actual value, not average of two)
    var k_med = (ks.length % 2 == 0 ? ks.sort()[Math.ceil(ks.length / 2)] : d3.median(ks));

    // find edge with same slope
    for (var i = 0; i < trial_bridges.length; i++) {
        if (getLineSlope(trial_bridges[i]) == k_med) med_bridge = trial_bridges[i];
    }

    // compute center of median bridge
    var bbox   = med_bridge.getBBox();
    var bbox_c = [bbox.x + bbox.width / 2, bbox.y + bbox.height / 2];

    // extend median bridge
    var l_min = [bbox_c[0] - width, bbox_c[1] + width * k_med],
        l_max = [bbox_c[0] + width, bbox_c[1] - width * k_med];

    // compute offset to animate test bridge
    var a_bbox = actual_bridge.getBBox()
    if (k_med >= k) {
        var actual_x = a_bbox.x;
        var actual_y = (getLineSlope(actual_bridge) >= 0 ? a_bbox.y + a_bbox.height : a_bbox.y);
    } else {
        var actual_x = a_bbox.x + a_bbox.width;
        var actual_y = (getLineSlope(actual_bridge) >= 0 ? a_bbox.y : a_bbox.y + a_bbox.height);
    }
    var med_x    = bbox_c[0] + (actual_x - bbox_c[0]);
    var med_y    = bbox_c[1] - (actual_x - bbox_c[0]) * k_med;
    var offset_y = actual_y - med_y;

    // draw median test
    svg.append('path')
        .classed('bridge', true)
        .classed('test', true)
        .attr('id', id)
        .attr('d', line([l_min, l_max]) + 'Z')
        .style('opacity', 0)
        .transition()
        .delay(delay2)
        .style('opacity', 1)
        .transition()
        .delay(delay1)
        .duration(speed)
        .attr('transform', 'translate(0,' + offset_y + ')');
}

function defocusExtremeVertices(id, delay) {
    var actual_bridge = $('.bridge.actual#' + id.split("-").splice(0,2).join("-"))[0],
        test_bridge   = $('.bridge.test#' + id)[0];

    var pairs = pairs_backup[id];

    var ep = 0.000005;

    setTimeout(function() {
        for (var i = 0; i < pairs.length; i++) {
            var k      = getLineSlope(actual_bridge);
            var k_med  = getLineSlope(test_bridge);
            var k_pair = -(pairs[i][0][1] - pairs[i][1][1]) / (pairs[i][0][0] - pairs[i][1][0]);
            
            var p_defocus = [ ]
            if (k_pair - ep <= k_med && k_med < k) {
                p_defocus = (pairs[i][0][0] < pairs[i][1][0] ? pairs[i][1] : pairs[i][0]);
            } else if (k_pair + ep >= k_med && k_med > k) {
                p_defocus = (pairs[i][0][0] < pairs[i][1][0] ? pairs[i][0] : pairs[i][1]);
            }

            if (p_defocus.length != 0) vertices.splice(vertices.indexOf(p_defocus), 1);

            svg.selectAll("circle")
                .each(function(d) {
                    var p         = d3.select(this),
                        [p_x,p_y] = [parseFloat(p.attr("cx")), parseFloat(p.attr("cy"))];
                    if (p_x == p_defocus[0] && p_y == p_defocus[1]) {
                        p.classed('defocused', true).attr('id', id);
                    }
                });
        }
    }, delay);
}

function animateBridgeFinding_recursive(vertices, id, trial) {
    var e = 0.000005;
    var k = getLineSlope($('.bridge.actual#' + id)[0]);
    var trial_delay = 2000;

    // hide previous pairings and median test
    svg.selectAll('.bridge.trial#' + id + '-' + (trial - 1))
        .transition()
        .style('opacity', 0);
    svg.selectAll('.bridge.test#' + id + '-' + (trial - 1))
        .transition()
        .style('opacity', 0);

    // form random pairs
    var pairs = randomlyPairPoints(vertices.slice(0));
    pairs_backup[id + '-' + trial] = pairs;

    // draw pair bridges
    for (var i = 0; i < pairs.length; i++) {
        svg.append('path')
            .classed('bridge', true)
            .classed('trial', true)
            .attr('id', id + '-' + trial)
            .attr('d', line([pairs[i][0], pairs[i][1]]) + 'Z')
            .style('opacity', 0)
            .transition()
            .style('opacity', 1);
    }

    drawMedianTrialBridge(id + '-' + trial, 500, 400, 200);

    setTimeout(function() {
        var k_med = getLineSlope($('.bridge.test#' + id + '-' + trial)[0]);
        if (k_med - e > k || k_med + e < k) defocusExtremeVertices(id + '-' + trial, 0);
    }, 1200);

    setTimeout(function() {
        var k_med = getLineSlope($('.bridge.test#' + id + '-' + trial)[0]);
        if (k_med - e > k || k_med + e < k) animateBridgeFinding_recursive(vertices, id, trial + 1);
        else {
            // reveal actual bridge
            svg.select('.bridge.actual#' + id)
                .classed('removed', false)
                .classed('found', true);

            // refocus vertices
            svg.selectAll('.vertex')
                .filter(function() {
                    var p = d3.select(this);
                    return p.attr('id') == null || p.attr('id').includes(id);
                })
                .classed('defocused', false);

            // remove all test and trial bridges
            svg.selectAll('.bridge')
                .filter(function() {
                    var b = d3.select(this);
                    return (b.classed('test') || b.classed('trial')) && b.attr('id').includes(id);
                })
                .classed('removed', true)
                .transition()
                .delay(400)
                .remove();
        }
    }, trial_delay);
}

function animateBridgeFinding(vertices, id) {
    var trial = 1;
    var [xs, ys] = unzip(vertices);

    // calculate actual bridge slope
    var ch = d3.polygonHull(vertices);
    for (var i = 1; i < ch.length; i++) {
        if (ch[i][0] < d3.median(xs) && ch[i-1][0] >= d3.median(xs)) {
            svg.append('path')
                .classed('bridge', true)
                .classed('actual', true)
                .classed('removed', true)
                .attr('id', id)
                .attr('d', line([ch[i], ch[i-1]]) + 'Z');
            var k = -(ch[i][1] - ch[i-1][1]) / (ch[i][0] - ch[i-1][0]);
        }
    }

    animateBridgeFinding_recursive(vertices, id, 1);    
}

function animateRemainingRecursion(vertices) {
    if (vertices.length == 2) {
        svg.append('path')
            .classed('bridge', true)
            .classed('actual', true)
            .classed('found', true)
            .attr('id', 'remaining')
            .attr('d', line(vertices) + 'Z')
            .style('opacity', 0)
            .transition()
            .delay(400)
            .style('opacity', 1);
        return;
    }

    var [xs,ys] = unzip(vertices);
    var ch = d3.polygonHull(vertices);
    var p_max = [0, 0],
        p_min = [width, 0];
    for (var i = 0; i < vertices.length; i++) {
        if (vertices[i][0] > p_max[0]) p_max = vertices[i];
        if (vertices[i][0] < p_min[0]) p_min = vertices[i];
    }

    var ixs = d3.shuffle(Array.apply(null, {length: ch.length}).map(Number.call, Number));
    for (var i = 0; i < ch.length; i++) {
        var ix1 = ixs[i];
        var ix2 = (ix1 == 0 ? ch.length - 1 : ix1 - 1)

        // don't draw lower hull edge
        if ((samePoint(ch[ix1], p_max) && samePoint(ch[ix2], p_min)) || 
            (samePoint(ch[ix1], p_min) && samePoint(ch[ix2], p_max))) {
            continue;
        }

        svg.append('path')
            .classed('bridge', true)
            .classed('actual', true)
            .classed('found', true)
            .attr('id', 'remaining')
            .attr('d', line([ch[ix1], ch[ix2]]) + 'Z')
            .style('opacity', 0)
            .transition()
            .delay((i - 1) * 400)
            .style('opacity', 1); 
    }
}

/*************/
/* BUILD SVG */
/*************/

var svg = d3.select(".svg-container").append("svg")
    .attr("width", width)
    .attr("height", height)
    .on("click", function() {
        if (fxn_i == 0) {
            vertices.push(d3.mouse(this));
            redrawVerticies();

            // check if at least 5 edges in convex hull
            var ch = d3.polygonHull(vertices);
            if (ch && ch.length >= 8) $('.next-button').removeClass('disabled');
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

function disableProgressButtons(time) {
    $('.next-button').addClass("disabled");
    $('.prev-button').addClass("disabled");

    setTimeout(function() {
        if (fxn_i < fxns.length - 1) $('.next-button').removeClass("disabled");
        if (fxn_i > 0) $('.prev-button').removeClass("disabled");
    }, time);
}

var fxns = [
    {   // step 1: draw hull divider 
        // draw hull divider 
        next: function() {
            disableProgressButtons(400);

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
                .style('opacity', 0)
                .transition()
                .style('opacity', 1);

            // disable pointer cursor
            $('.svg-container').css('cursor', 'auto')
        },       
    },{ // step 2: focus on upper hull 
        // delete hull divider
        prev: function() {
            disableProgressButtons(400);

            svg.selectAll('#hull-divider')
                .classed("removed", true)
                .transition()
                .delay(400)
                .remove();  

            // enable pointer cursor
            $('.svg-container').css('cursor', 'pointer')
        },

        // remove lower hull and refocus 
        next: function() {
            // disable progress buttons while animating
            disableProgressButtons(2400);

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
        }     
    },{ // step 3: first coloring 
        // re-add lower hull and divider
        prev: function() {
            disableProgressButtons(800);

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
            disableProgressButtons(1200);

            var [xs, ys] = unzip(vertices);

            svg.append('path')
                .classed('median', true)
                .attr('d', line([[d3.median(xs), 15], [d3.median(xs), height - 15]]) + 'Z')
                .style('opacity', 0)
                .transition()
                .style('opacity', 1);

            d3.selectAll("circle")
                .transition()
                .duration(400)
                .delay(400)
                .style("fill", function() {
                    var cx = d3.select(this).attr("cx");
                    if (cx < d3.median(xs)) return color_pairs[0][0];
                    else return color_pairs[0][1];
                });

            svg.select('.median')
                .transition()
                .delay(800)
                .style('opacity', 0)
                .remove(); 
        } 
    },{ // step 4: show first bridge 
        // recolor all vertices black
        prev: function() { 
            disableProgressButtons(400);

            d3.selectAll("circle")
                .transition()
                .duration(400)
                .style("fill", "black");
        },

        // draw first bridge 
        next: function() {
            disableProgressButtons(400);

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
                        .transition()
                        .style('opacity', 1);
                }
            }
        }
    },{ // step 5: first random pairing 
        // remove first bridge
        prev: function() { 
            disableProgressButtons(400);

            svg.select('.bridge.actual#a-1')
                .classed('removed',true)
                .transition()
                .delay(400)
                .remove();
        },

        // randomly pair points
        next: function() {
            disableProgressButtons(400);

            // find random pairings
            pairs = randomlyPairPoints(vertices.slice(0));
            for (var i = 0; i < pairs.length; i++) {
                svg.append('path')
                    .classed('bridge', true)
                    .classed('trial', true)
                    .attr('id', 'a-1-1')
                    .attr('d', line([pairs[i][0], pairs[i][1]]) + 'Z')
                    .style('opacity', 0)
                    .transition()
                    .style('opacity', 1);
            }
        }
    },{ // step 6: median test on first pairing 
        // show first bridge and remove random pairings
        prev: function() { 
            disableProgressButtons(400);

            // delete all other bridges
            svg.selectAll('.bridge.trial')
                .classed('removed', true)
                .transition()
                .delay(400)
                .remove();
        },

        // show median test
        next: function() {
            disableProgressButtons(1300);

            // calc position of median test
            drawMedianTrialBridge('a-1-1', 500, 800, 0);

            // update instructions based on results
            var k = getLineSlope($('.bridge.actual#a-1')[0]);
            var t = getLineSlope($('.bridge.test#a-1-1')[0]);
            var e = 0.000005;
            if (t - e <= k && t + e >= k) {
                updateInstructions("As we can see, our test edge with slope $k_{median}$ does form a bridge between red and blue points. So we found our bridge edge!");
            } else if (t < k) {
                updateInstructions("As we can see, our median slope is too shallow so we will have to try again. In order to prune our search, we should get rid of $\\frac{1}{4}$ of our points by ignoring the right endpoints of our shallow lines since they appear to be skewing $k_{median}$. With fewer points, hopefully we'll have better luck!");
            } else {
                updateInstructions("As we can see, our median slope is too steep so we will have to try again. In order to prune our search, we should get rid of $\\frac{1}{4}$ of our points by ignoring the left endpoints of our steep lines since they appear to be skewing $k_{median}$. With fewer points, hopefully we'll have better luck!");
            }

            // store backups
            vertices_backup["a-1-1"] = vertices.slice(0);
            pairs_backup['a-1-1'] = pairs.slice(0);
        },
    },{ // step 7: median test on second pairing 
        prev: function() {
            disableProgressButtons(400);

            svg.selectAll('.bridge.test')
                .classed('removed', true)
                .transition()
                .delay(400)
                .remove();
        },
        next: function() {
            disableProgressButtons(3000);

            var actual_bridge = $('.bridge.actual#a-1')[0],
                test_bridge   = $('.bridge.test#a-1-1')[0];

            // if previous iteration was a success, skip this step
            if (getLineSlope(test_bridge) == getLineSlope(actual_bridge)) {
                fxn_i++;
                $(".next-button").trigger("click");
                return;
            }

            // defocus extreme vertices and hide trial / test bridges
            defocusExtremeVertices("a-1-1", 0);
            svg.selectAll('.bridge.trial#a-1-1').classed('removed', true);
            svg.selectAll('.bridge.test#a-1-1').classed('removed', true);

            setTimeout(function() {
                vertices = [ ]
                svg.selectAll('.vertex')
                    .each(function() {
                        var p = d3.select(this);
                        if (!p.classed('removed') && !p.classed('defocused')) vertices.push([p.attr('cx'), p.attr('cy')]);
                    });

                // find new random pairings
                pairs = randomlyPairPoints(vertices.slice(0));
                for (var i = 0; i < pairs.length; i++) {
                    svg.append('path')
                        .classed('bridge', true)
                        .classed('trial', true)
                        .attr('id', 'a-1-2')
                        .attr('d', line([pairs[i][0], pairs[i][1]]) + 'Z')
                        .style('opacity', 0)
                        .transition()
                        .delay(800)
                        .style('opacity', 1);
                }

                updateInstructions("");
            }, 1);

            // calc position of median test
            setTimeout(function() {
                drawMedianTrialBridge('a-1-2', 500, 800, 0);

                // update instructions based on results
                var k = getLineSlope($('.bridge.actual#a-1')[0]);
                var t = getLineSlope($('.bridge.test#a-1-2')[0]);
                var e = 0.000005;
                if (t - e <= k && t + e >= k) {
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
            disableProgressButtons(1200);

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
            var e = 0.000005;
            if (t - e <= k && t + e >= k) {
                updateInstructions("As we can see, our test edge with slope $k_{median}$ does form a bridge between red and blue points. So we found our bridge edge!");
            } else if (t < k) {
                updateInstructions("As we can see, our median slope is too shallow so we will have to try again. In order to prune our search, we should get rid of $\\frac{1}{4}$ of our points by ignoring the right endpoints of our shallow lines since they appear to be skewing $k_{median}$. With fewer points, hopefully we'll have better luck!");
            } else {
                updateInstructions("As we can see, our median slope is too steep so we will have to try again. In order to prune our search, we should get rid of $\\frac{1}{4}$ of our points by ignoring the left endpoints of our steep lines since they appear to be skewing $k_{median}$. With fewer points, hopefully we'll have better luck!");
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
            disableProgressButtons(3000);

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
            defocusExtremeVertices("a-1-2", 0);
            svg.selectAll('.bridge.trial#a-1-2').classed('removed', true);
            svg.selectAll('.bridge.test#a-1-2').classed('removed', true);

            setTimeout(function() {
                vertices = [ ]
                svg.selectAll('.vertex')
                    .each(function() {
                        var p = d3.select(this);
                        if (!p.classed('removed') && !p.classed('defocused')) vertices.push([p.attr('cx'), p.attr('cy')]);
                    });

                // find new random pairings
                pairs = randomlyPairPoints(vertices.slice(0));
                for (var i = 0; i < pairs.length; i++) {
                    svg.append('path')
                        .classed('bridge', true)
                        .classed('trial', true)
                        .attr('id', 'a-1-3')
                        .attr('d', line([pairs[i][0], pairs[i][1]]) + 'Z')
                        .style('opacity', 0)
                        .transition()
                        .delay(800)
                        .style('opacity', 1);
                }

                updateInstructions("");
            }, 1);

            // calc position of median test
            setTimeout(function() {
                drawMedianTrialBridge('a-1-3', 500, 800, 0);

                // update instructions based on results
                var k = getLineSlope($('.bridge.actual#a-1')[0]);
                var t = getLineSlope($('.bridge.test#a-1-3')[0]);
                var e = 0.000005;
                if (t - e <= k && t + e >= k) {
                    updateInstructions("Success! Our median slope is a perfect match so we found our bridge!");
                } else {
                    updateInstructions("Unfortunately, this recursive process can take a number of iterations. However, you can see that we will ignore more and more points until we are able to find $k$, likely when we just have two points left. Because it can take awhile, let's skip ahead to where we actually find our bridge edge.");
                }
            }, 1600);
        },
    },{ // step 9: skip to final match 
        prev: function() { 
            disableProgressButtons(1200);

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
            var e = 0.000005;
            if (t - e <= k && t + e >= k) {
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
            disableProgressButtons(400);

            vertices = vertices_backup['a-1-1'];

            svg.selectAll('.vertex')
                .classed('defocused', false)
                .transition()
                .duration(400)
                .style('fill', 'black');

            svg.selectAll('.bridge.trial').classed('removed', true);
            svg.selectAll('.bridge.test').classed('removed', true);
            svg.selectAll('.bridge.actual').classed('found', true);

            // remove ability to step back (it gets confusing)
            setTimeout(function() { $('.prev-button').addClass('disabled'); }, 450);
        },
    },{ // step 10: draw first bounding poly 
        prev: function() { 
            console.log('should not be triggered....');
        },
        next: function() {
            disableProgressButtons(400);

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
                .transition()
                .style('opacity', 1);
        },
    },{ // step 11: remove interior poly points and color 
        prev: function() {
            // disable previous button and remove poly
            $('.prev-button').addClass('disabled');
            svg.select('.bounding-poly#a-1')
                .classed('removed', true)
                .transition()
                .delay(400)
                .remove()
        },
        next: function() {
            disableProgressButtons(1200);

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

            // add buffer to polygon points
            v_left[0]  = v_left[0] + 0.1;
            v_right[0] = v_right[0] - 0.1;
            x_min[0]   = x_min[0] + 0.1;
            x_max[0]   = x_max[0] - 0.1;

            svg.selectAll('.vertex')
                .each(function(d) {
                    var p     = d3.select(this);
                    var coors = [parseFloat(p.attr("cx")), parseFloat(p.attr("cy"))];
                    var poly  = [x_min, v_left, v_right, x_max, x_min];

                    if (d3.polygonContains(poly, coors) 
                            && !p.classed('removed')
                            && poly.indexOf(coors) == -1) {
                        p.classed('removed', true).attr('id', 'a-1-bounding');
                    }
                });

            setTimeout(function() {
                svg.selectAll('.bounding-poly#a-1').classed('removed', true);

                var bbox = $('.bridge.actual#a-1')[0].getBBox();

                svg.selectAll('.vertex')
                    .style("fill", function() {
                        var p = d3.select(this);
                        if (parseFloat(p.attr("cx")) < bbox.x + bbox.width / 2) return color_pairs[0][0];
                        else return color_pairs[0][1];
                    });
            }, 800);


        },
    },{ // step 12: focus on subproblem 
        prev: function() {
            disableProgressButtons(400);
            svg.selectAll('.vertex#a-1-bounding').classed('removed', false);
            svg.selectAll('.bounding-poly#a-1').classed('removed', false);
            svg.selectAll('.vertex').style('fill', 'black');
        },
        next: function() {
            disableProgressButtons(400);

            // store back up
            vertices_backup['a-1'] = vertices.slice(0);
            vertices = [ ];

            // calculate center line so we can partition points 
            var bbox = $('.bridge.actual#a-1')[0].getBBox();
            var x_c  = bbox.x + bbox.width / 2;

            // attempt to focus on blue vertices
            svg.selectAll('.vertex')
                .each(function() { 
                    var p = d3.select(this);
                    var coor = [parseFloat(p.attr("cx")), parseFloat(p.attr("cy"))];
                    if (!p.classed('removed') && parseFloat(p.attr("cx")) < x_c) {
                        vertices.push(coor);
                    } else if (!p.classed('removed')) {
                        p.classed('defocused', true)
                            .attr('id', 'c-1')
                    }
                });

            // if fewer blue vertices left, focus on red vertices
            if (vertices.length < svg.selectAll('.vertex').filter(function() { return !d3.select(this).classed('removed'); }).size() / 2) {
                vertices = [ ];
                svg.selectAll('.vertex')
                    .each(function() { 
                        var p = d3.select(this);
                        var coor = [parseFloat(p.attr("cx")), parseFloat(p.attr("cy"))];
                        if (!p.classed('removed') && parseFloat(p.attr("cx")) > x_c) {
                            vertices.push(coor);
                            p.classed('defocused', false)
                                .attr('id', null);
                        } else if (!p.classed('removed')) {
                            p.classed('defocused', true)
                                .attr('id', 'c-1');
                        }
                    });
            }

            // defocus found bridge
            svg.select('.bridge.found#a-1').classed('defocused', true);
        },
    },{ // step 13: second coloring
        prev: function() {
            disableProgressButtons(400);

            // revert to back up
            vertices = vertices_backup['a-1'].slice(0);

            // refocus bridge and all vertices
            svg.select('.bridge.found#a-1').classed('defocused', false);
            svg.selectAll('.vertex').classed('defocused', false);
        },
        next: function() {
            disableProgressButtons(1200);

            // find median of smaller set
            // and color smaller set accordingly
            var [xs, ys] = unzip(vertices);

            svg.append('path')
                .classed('median', true)
                .attr('d', line([[d3.median(xs), 15], [d3.median(xs), height - 15]]) + 'Z')
                .style('opacity', 0)
                .transition()
                .style('opacity', 1);

            d3.selectAll("circle")
                .filter(function() { return !d3.select(this).classed('defocused'); })
                .transition()
                .duration(400)
                .delay(400)
                .style("fill", function() {
                    var cx = d3.select(this).attr("cx");
                    if (cx < d3.median(xs)) return color_pairs[1][0];
                    else return color_pairs[1][1];
                });

            svg.select('.median')
                .transition()
                .delay(800)
                .style('opacity', 0)
                .remove();
        },
    },{ // step 14: second bridge (first animated one)
        prev: function() {
            disableProgressButtons(400);

            var bbox = $('.bridge.actual#a-1')[0].getBBox();
            var x_c  = bbox.x + bbox.width / 2;

            d3.selectAll("circle")
                .filter(function() { return !d3.select(this).classed('defocused'); })
                .transition()
                .duration(400)
                .style("fill", function() {
                    if (d3.select(this).attr("cx") < x_c) return color_pairs[0][0];
                    else return color_pairs[0][1];
                });
        },
        next: function() {
            $('.next-button').addClass('disabled');
            $('.prev-button').addClass('disabled');

            // store backup
            vertices_backup['b-1'] = vertices.slice(0);

            // find second bridge
            var bridgeNotFound = true;
            animateBridgeFinding(vertices, 'b-1');

            // update text when bridge is found
            var checkForBridge = setInterval(function() {
                if ($('.bridge.found#b-1').length > 0) {
                    clearInterval(checkForBridge);
                    updateInstructions("So using the same process, we were again able to quickly find a bridge edge. Now we have two of our convex hull edges! Like before, we can continue the recursion down until we've gotten all of the convex hull edges on this side.");

                    vertices = vertices_backup['b-1'];

                    $('.next-button').removeClass('disabled');
                }
            }, 500);
        },
    },{ // step ...:
        prev: function() {
            console.log('should not be triggered....');
        },
        next: function() {
            // for rest of vertices on side, "compute" CH edges
            animateRemainingRecursion(vertices);

            // focus on other side
            var ch    = d3.polygonHull(vertices);
            var delay = ch.length * 400;
            setTimeout(function() {
                svg.selectAll('.vertex').classed('defocused', false);
                svg.selectAll('.bridge.found').classed('defocused', false);
                svg.selectAll('.bridge.found#b-1').classed('removed', true);
                updateInstructions("Through recursing on one of our smaller sets, we've found all of the edges on that side. Thus we can see that by recursing on the <i>other</i> side, we will get the remaining edges in our convex hull!");

            }, delay);

            // go back to original colors
            var [xs,ys] = unzip(vertices_backup['a-1'].slice(0));
            d3.selectAll("circle")
                .transition()
                .duration(400)
                .delay(delay)
                .style("fill", function() {
                    var cx = d3.select(this).attr("cx");
                    if (cx < d3.median(xs)) return color_pairs[0][0];
                    else return color_pairs[0][1];
                });
        }
    },{ // step ...:
        prev: function() {
            // re-update instructions
            updateInstructions("So using the same process, we were again able to quickly find a bridge edge. Now we have two of our convex hull edges! Like before, we can continue the recursion down until we've gotten all of the convex hull edges on this side.");

            // remove all "remaining" edges added
            svg.selectAll('.bridge#remaining')
                .classed('removed', true)
                .transition()
                .delay(400)
                .remove();

            // defocus other side
            svg.selectAll('.bridge#a-1').classed('defocused', true);
            
            // store back up
            vertices_backup['b-1'] = vertices.slice(0);
            vertices = [ ];

            // calculate center line so we can partition points 
            var bbox = $('.bridge.actual#a-1')[0].getBBox();
            var x_c  = bbox.x + bbox.width / 2;

            // attempt to focus on blue vertices
            svg.selectAll('.vertex')
                .each(function() { 
                    var p = d3.select(this);
                    var coor = [parseFloat(p.attr("cx")), parseFloat(p.attr("cy"))];
                    if (!p.classed('removed') && parseFloat(p.attr("cx")) < x_c) {
                        vertices.push(coor);
                    } else if (!p.classed('removed')) {
                        p.classed('defocused', true)
                            .attr('id', 'c-1')
                    }
                });

            // if fewer blue vertices left, focus on red vertices
            if (vertices.length < svg.selectAll('.vertex').filter(function() { return !d3.select(this).classed('removed'); }).size() / 2) {
                vertices = [ ];
                svg.selectAll('.vertex')
                    .each(function() { 
                        var p = d3.select(this);
                        var coor = [parseFloat(p.attr("cx")), parseFloat(p.attr("cy"))];
                        if (!p.classed('removed') && parseFloat(p.attr("cx")) > x_c) {
                            vertices.push(coor);
                            p.classed('defocused', false).attr('id', null);
                        } else if (!p.classed('removed')) {
                            p.classed('defocused', true)
                                .attr('id', 'c-1');
                        }
                    });
            }


        },
        next: function() {
            // get list of vertices for uncomputed side
            var other_vertices = [ ];
            svg.selectAll('#c-1')
                .each(function() {
                    var p = d3.select(this);
                    other_vertices.push([parseFloat(p.attr('cx')), parseFloat(p.attr('cy'))]);
                });

            // for rest of vertices on OTHER side, "compute" CH edges       
            animateRemainingRecursion(other_vertices);

            // focus on other side
            if (other_vertices.length > 2) {
                var ch    = d3.polygonHull(other_vertices);
                var delay = ch.length * 400;
            } else {
                var delay = 400
            }

            setTimeout(function() {
                svg.selectAll('.vertex').classed('defocused', false);
                svg.selectAll('.bridge.found').classed('defocused', false);
                updateInstructions("Great, we're done! We found our entire upper hull in $O(n \\log n)$ time. Now that we understand the algorithm, we can apply it to the lower hull and then merge it with our upper hull for the full convex hull of our original $n$ points. <br /> Feel free to refresh the page and try the algorithm out on a different set of points! Also feel free to explore more information on the algorithm via the material both above and below.");
            }, delay);

        }
    },{ // step ...:
        prev: function() {

        },
        next: function() {

        }
    }
];

// enable forward and back step buttons
$(document).ready(function() {
    // initialize instructions
    updateInstructions(instructions[0]);

    $('.next-button').click(function() {
        console.log('fxn step: ', fxn_i);

        if (fxn_i < fxns.length - 1 && !$('.next-button').hasClass('disabled')) {
            updateInstructions(instructions[fxn_i + 1]);
            fxns[fxn_i].next();
            fxn_i++;
        }

        if (fxn_i == fxns.length - 1) $('.next-button').addClass('disabled');
        if (fxn_i == 1) $('.prev-button').removeClass('disabled');
    });    

    $('.prev-button').click(function() {
        console.log('fxn step: ', fxn_i);

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
        else if (e.keyCode == 32 && fxn_i == 0) {
            for (var i = 0; i < 5; i++) {
                // generate a random point
                var p_x = Math.random() * (width - 50) + 25;
                var p_y = Math.random() * (height - 50) + 25;

                // add it to vertices
                vertices.push([p_x, p_y]);
                redrawVerticies();

                // check if at least 5 edges in convex hull
                var ch = d3.polygonHull(vertices);
                if (ch && ch.length >= 5) $('.next-button').removeClass('disabled');
            }
        }
    });
});