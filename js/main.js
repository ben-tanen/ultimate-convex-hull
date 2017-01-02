$(document).ready(function() {
    /********* INFO INIT ************/
    $('.info-btn').click(function() {
        if ($(this).hasClass('show')) {
            $(this).addClass('hide').removeClass('show');
            $($(this).parent().children('.sub_info')).slideUp();
            $(this).attr('src','img/hide.png');
        } else {
            $(this).addClass('show').removeClass('hide');
            $($(this).parent().children('.sub_info')).slideDown();
            $(this).attr('src','img/show.png');
        }
    }); 

    /********* VISUALIZATION INIT **********/
    // initialize instructions
    updateInstructions(instructions[0]);

    $('.next-button').click(function() {
        if (fxn_i < fxns.length - 1 && !$('.next-button').hasClass('disabled')) {
            updateInstructions(instructions[fxn_i + 1]);
            fxns[fxn_i].next();
            fxn_i++;
        }

        if (fxn_i == fxns.length - 1) $('.next-button').addClass('disabled');
        if (fxn_i == 1) $('.prev-button').removeClass('disabled');
    });    

    $('.prev-button').click(function() {
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
        else if (e.keyCode == 80 && fxn_i == 0) {
            for (var i = 0; i < 5; i++) {
                // generate a random point
                var p_x = Math.random() * (width - 50) + 25;
                var p_y = Math.random() * (height - 50) + 25;

                // add it to vertices
                vertices.push([p_x, p_y]);
                redrawVerticies();
            }
            
            // check if at least 5 edges in upper hull
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
                return d[1] <= (d[0] - x_min[0]) * sl + x_min[1]
            }

            var upperHullCount = svg.selectAll('.vertex').filter(function(d) { return inLowerHull(d); }).size();
            if (upperHullCount >= 6) $('.next-button').removeClass('disabled');
            else $('.next-button').addClass('disabled');
        }
    });
});