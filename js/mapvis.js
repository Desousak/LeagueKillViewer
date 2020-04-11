var mapData = [];

function initMapVis() {
    showAnnotations();
    d3.csv("dataset/kills.csv").then((d) => {
        if (mapData.length == 0) {
            mapData = d;
        }
        // mapVis(mapData);
    });

}

function mapVis(data, blue_team = "", red_team = "") {
    d3.select("#map-vis-overlay").selectAll("svg").remove();
    d3.select("#map-vis-brush").selectAll("svg").remove();
    data = pruneData(data, ["Time", "Killer", "x_pos", "Victim", "y_pos"]);

    // Filter to keep only the kills from the two teams
    if (blue_team != "" && red_team != "") {
        data = data.filter((d) => {
            return (d.Killer.includes(blue_team) && d.Victim.includes(red_team)
            || d.Victim.includes(blue_team) && d.Killer.includes(red_team))
        });
    }
   
    let gran = 300; // How many squares to render
    let buckets = []; // Actual data 
    let x_labels = []; // X labels
    let y_labels = []; // Y labels
    let x_max = d3.max(data, d => +d.x_pos), y_max = d3.max(data, d => +d.y_pos);

    // Generate buckets
    for (let i = 0; i <= Math.round(x_max / gran) * gran; i += gran) {
        x_labels.push(i);
        let fill_y = false;
        if (i == 0) fill_y = true; // Generate y labels only once

        for (let j = 0; j <= Math.round(y_max / gran) * gran; j += gran) {
            if (fill_y) y_labels.push(j);

            buckets.push({
                x_pos: i,
                y_pos: j,
                value: 0
            });
        }
    }
    // Fill buckets
    fillBuckets(data, buckets, gran, 0, 100);

    // Create the visuals
    let overlay = d3.select("#map-vis-img").node();
    let width = overlay.offsetWidth, height = overlay.offsetHeight;
    let x = d3.scaleBand()
        .range([width * 0.1, width / 1.13])
        .domain(x_labels)
        .padding(0.1);
    let y = d3.scaleBand()
        .range([height / 1.05, height * 0.075])
        .domain(y_labels)
        .padding(0.1);
    let color = d3.scaleLinear()
        .range(["rgba(0,0,0,0)", "red"])
        .domain([0, d3.max(buckets, d => +d.value)]);

    d3.select("#map-vis-annotation").style("height", height); // Fix height of annotation image
    let svg = d3.select("#map-vis-overlay").style("height", height).append("svg");
    svg.selectAll("rect")
        .data(buckets)
        .enter()
        .append("rect")
        .attr("x", d => x(d.x_pos))
        .attr("y", d => y(d.y_pos))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", d => color(d.value));

    // Create the brush 
    let controls = d3.select("#map-vis-brush").append("svg");
    let brush_dim = [20, d3.select("#map-vis-img").node().getBoundingClientRect().width - 20]; // The max that the brush can go to
    let brush_scale = d3.scaleLinear().domain([brush_dim[0], brush_dim[1]]).range(d3.extent(data, d => parseInt(d["Time"])));

    // On brush move update the chart
    function brushed() {
        let pos = d3.event.selection;
        let new_buckets = [...buckets];
        for (item of new_buckets) item.value = 0;
        fillBuckets(data, new_buckets, y_labels.length, gran, brush_scale(pos[0]), brush_scale(pos[1]));

        color = d3.scaleLinear()
            .range(["rgba(0,0,0,0)", "red"])
            .domain([0, d3.max(new_buckets, d => +d.value)]);

        svg.selectAll("rect")
            .data(new_buckets)
            .join(
                enter => enter.append("circle")
                    .attr("x", d => x(d.x_pos))
                    .attr("y", d => y(d.y_pos))
                    .attr("width", x.bandwidth())
                    .attr("height", y.bandwidth())
                    .style("fill", d => color(d.value)),
                update => update.transition()
                    .attr("x", d => x(d.x_pos))
                    .attr("y", d => y(d.y_pos))
                    .style("fill", d => color(d.value)),
                exit => exit.remove()
            );
    }

    let brush = d3.brushX()
        .extent([[brush_dim[0], 0], [brush_dim[1], 25]])
        .on("brush", brushed)
    // .on("end", brushended);
    controls.append("g")
        .call(brush)
        .call(brush.move, [brush_dim[0], 140]);

    // Create the axis for the brush
    controls.append("g")
        .call(d3.axisBottom(
            d3.scaleLinear()
                .domain(d3.extent(data, d => d["Time"]))
                .range([brush_dim[0], brush_dim[1]])));
}

function fillBuckets(data, buckets, y_len, gran, start_time, end_time) {
    let filtered_data = data.filter((d) => {
        return (parseInt(d["Time"]) >= start_time && parseInt(d["Time"]) <= end_time)
    });

    for (row of filtered_data) {
        let x_pos = Math.round(row.x_pos / gran);
        let y_pos = Math.round(row.y_pos / gran);

        if (!Number.isNaN(x_pos) && !Number.isNaN(y_pos)) {
            buckets[(x_pos * y_len) + y_pos].value += 1;
        }
    }
}

function showAnnotations() {
    let isChecked = document.getElementById("map-vis-toggle").checked;
    if (!isChecked) {
        document.getElementById("map-vis-annotation").style.display = "none";
    } else {
        document.getElementById("map-vis-annotation").style.display = "block";
    }
}