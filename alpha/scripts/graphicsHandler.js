var node_list_d3 = {nodes: [], links: []};
//Format of node_list_d3 data: 
//NOTE: "hash" and "minion_name" are only
//      needed and used for script nodes
//
//node_list_d3 = {nodes: [{id:, group:, hash:, minion_name:],
//                links: [{source: "id", target: "id", type:}]}
var node_names = new Set();
var script_names = new Set();

function addScriptToGraph(script_name, minion_name, hash){
  var minion_number = minion_name.substr(9);
  var new_script_name = script_name + "-m."+minion_number;
  if(script_names.has(new_script_name)){
    var x = 1;
    var duplicate_script_name = new_script_name + "(" + x + ")";

    while(script_names.has(duplicate_script_name)){
      x++;
      duplicate_script_name = new_script_name + "(" + x + ")";
    }
    new_script_name = duplicate_script_name;
  }
  node_list_d3.nodes.push({id: new_script_name, group: 6, program_hash: hash, minion_name: "Lambda-m."+minion_number});
  addLinkToGraph(new_script_name, "Lambda-m."+minion_number, 2);
  script_names.add(new_script_name);
}

function addNodeToGraph(node_name, mapping){
  var type;
  if(!node_names.has(node_name)){
    switch(node_name){
      case "omega":
        type = 1;
          node_names.forEach(function(value){
            addLinkToGraph(node_name, value, 1);
          });
        break;
      case "alpha":
        type = 2;
          node_names.forEach(function(value){
            if (value == "Lambda-M" || value == "omega" || value == "delta")
              addLinkToGraph(node_name, value, 1);
          });
        break;
      case "delta":
        type = 3;
          node_names.forEach(function(value){
            if (value == "omega" || value == "alpha" || value.indexOf("Lambda-m") >= 0)
              addLinkToGraph(node_name, value, 1);
          });
        break;
      case "Lambda-M":
        type = 4;
          node_names.forEach(function(value){
            if (value == "omega" || value == "alpha" || value.indexOf("Lambda-m") >= 0)
              addLinkToGraph(node_name, value, 1);
          });
        break;
      default:
        type = 5;
          node_names.forEach(function(value){
            if (value == "omega" || value == "delta" || value == "Lambda-M")
              addLinkToGraph(node_name, value, 1);
          });
        break;
    }
    node_list_d3.nodes.push({id: node_name, group: type, map: mapping});
    node_names.add(node_name);

    //USED FOR RIDICULOUS COLOR PICKING FUNCTION
    return type;
  }
}

function addLinkToGraph(source_name, target_name, link_type){
  node_list_d3.links.push({source: source_name, target: target_name, type_value: link_type});
}

var node_json_data;

function buildForceGraph(){

  var node_text_svg = [];

  xhrGet("/nodes", function (xhr) {
    node_json_data=parseJSON(xhr.response); // got json object of nodes
  })

  d3.selectAll("svg").remove();

  var graphJSONtext = JSON.stringify(node_list_d3);
  var graph = JSON.parse(graphJSONtext);

  var div_vals = document.getElementById("contentView_nodes");
  var width = div_vals.clientWidth;
  var height = div_vals.clientHeight;
  var link_distance = 240;
  var radius_size = 15;
  var svg_width = width*.19;
  var svg_height = height*.30;

  var svg_container = d3.select("div.contentView")
    .style("overflow-x", "hidden")
    .style("overlow", "hidden")
    .insert("svg")
    .attr("width", width)
    .attr("height", height)
    .style("margin", 0)
    .call(d3.zoom().on("zoom", zoomed))
      //Disabling the obnoxious double click zoom function
      .on("dblclick.zoom", null);

  var svg = svg_container.append("g");
  
  var color = d3.scaleOrdinal(d3.schemeCategory20);

  var simulation = d3.forceSimulation()
    .force("link", d3.forceLink()
      .id(function(d){ 
        return d.id;
      })
      .distance(function(d){
        return (link_distance / d.type_value);
      }))
    .force("charge", d3.forceManyBody().strength(-60))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide(radius_size));

  var link = svg.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(graph.links)
    .enter().append("line")
    .attr("stroke-width", 3);

  var node = svg.append("g")
    .attr("class", "nodes")
    .selectAll(".nodes")
    .data(graph.nodes)
    .enter().append("g")
    .attr("class", "nodes")
    .attr("id", function(d){
      return d.id + "_g0";
    })
    .on("click", clicked)
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

  //table_buttons.data(graph.nodes.filter(function(d){return d.id == table_buttons.attr("id");}))
  //.data(graph.nodes.filter(function(d){return d.program_hash == null;}), function(d){return d.id})
  //.select(function(d){return jq(d.id + "-table0");})
  //.attr("id", function(d){d.id + "-table0"})
  //.data(graph.nodes.filter(function(d){return d.program_hash == null;}))
/*var table_buttons = d3.select(jq("r2c1_nodes"))
  .selectAll("tr")
    .data(graph.nodes);

    table_buttons
    .attr("id", function(d){return d.id + "-table0"})
    .on("click", clicked)
    .select("div.circle").style("border", null);*/

    function keymatch(d){
      return d.id;
    }

var table_group = d3.select(jq("r2c1_nodes"));

var button_group = table_group.selectAll("tr")
    .data(graph.nodes);

  button_group.data(graph.nodes, keymatch)
    .on("click", clicked);

  button_group.attr("id", function(d){return d.id + "-table0"}).select("div.circle").style("border", null);

  button_group.select("p").text(function(d){return d.id;});


  node.append("circle")
    .attr("cx", 0)
    .attr("cy", 0)
    .attr("r", radius_size)
    .attr("stroke", function(d){
      return ridiculousColorPickingFunction(d.group);
    })
    .attr("stroke-width", "1.5px")
    //.attr("fill", function(d) { return color(d.group); });
    .attr("fill", "#1c1c1c");
      
  node.append("text")
    .style("pointer-events", "none")
    .style("font-size", "25px")
    .attr("dx", 0)
    .attr("dy", ".35em")
    .attr("text-anchor", "middle")
    //.attr("stroke", "#000000")
    .attr("fill", function(d){
      return ridiculousColorPickingFunction(d.group);
    })
    .html(function(d){
      return groupToGreek(d.group);
    });

  simulation
    .nodes(graph.nodes)
    .on("tick", ticked);

  simulation.force("link")
    .links(graph.links);

  function clicked(d){
    //Using group ID to check if currently clicked and if previously clicked
    var real_id = d3.select(this).attr("id");
    var g_id_data = real_id.substr(real_id.length - 1);
    var g_id;
    var t_id;
    var node_t;
    var node_g 

    if(d.program_hash != null){
      node_g = d3.select(this);
      g_id = node_g.attr("id");
    }
    else{
      g_id = jq(d.id + "_g" + g_id_data);
      node_g = d3.select(g_id);
    }

    if(g_id_data != "2"){
      d.fx = d.x;
      d.fy = d.y;
      d.fixed = true;
      node_g.select("circle").attr("stroke-width", "3.5px");
      //TEMP FOR TESTING
      if(d.program_hash == null)
        displayNodeDataSVG(d, node_g);
      //TEMP FOR TESTING
      if (d.program_hash != null){
        if (g_id_data == "0"){
         
          var textbox = node_g.append("foreignObject")
          .attr("x", radius_size)
          .attr("y", -2.5*radius_size);

  
            var b_id = "foreign-" + g_id;
  
            var textbody = textbox.append("xhtml:body")
              .attr("id", b_id)
              .on("click", function(){d3.event.stopPropagation();})
              .call(d3.drag()).on("start", function(){d3.event.stopPropagation();})
              .style("display", "inline-block")
              .style("pointer-events", "none");

            genOutputTextBoxes(d.program_hash, b_id, d.minion_name, d);

            textbody.select("table").style("pointer-events", "auto");
            textbody.selectAll("textarea").style("pointer-events", "auto");
        }
        else{
          node_g.select("foreignObject").style("visibility", "visible");
        }
      }
      else{
        t_id= jq(d.id + "-table" + g_id_data);
        node_t = d3.select(t_id);
        node_t.select("div.circle").style("border", "3px solid " + ridiculousColorPickingFunction(d.group));
        node_t.attr("id", d.id + "-table2");
      }
      node_g.attr("id", d.id + "_g2");
    }
    else{
      d.fx = null;
      d.fy = null;
      d.fixed = false;
      dragended(d);
      //TEMP FOR TESTING
      if(d.program_hash == null)
      removeNodeDataSVG(d, node_g);
      //TEMP FOR TESTING
      node_g.select("circle").attr("stroke-width", "1.5px");

      if (d.program_hash != null)
        node_g.select("foreignObject").style("visibility", "hidden");
      else{
        t_id= jq(d.id + "-table" + g_id_data);
        node_t = d3.select(t_id);
        node_t.select("div.circle").style("border", null);
        node_t.attr("id", d.id + "-table1");
      }
      node_g.attr("id", d.id + "_g1");
  
    }
  }

  function ticked() {
    link
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    node
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
        //.attr("cx", function(d) { return d.x; })
        //.attr("cy", function(d) { return d.y; });
  }

  function zoomed(){
    svg.attr("transform", d3.event.transform);
  }

  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }
  
  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    if(!d.fixed){
    d.fx = null;
    d.fy = null;
  }
  } 

  function displayNodeDataSVG(d, elem){
    
    var text_container = elem;
    /*var text_container = elem.append("svg")
      //.style("position", "absolute")
      .style("margin", "0")
      .style("pointer-events", "none")
      .attr("id", d.id + "-svgtext")
      .attr("width", svg_width)
      .attr("height", svg_height);
      */

    //node_text_svg.push(d.id);
    //correctLocations(d.id, text_container);


    var fo = text_container.append("foreignObject")
      .attr("id", d.id + "-svgtext")
      .attr("x", radius_size)
      .attr("y", -2.5*radius_size);

    var bod = fo.append("xhtml:body");
      /*.style("font-family", "'Lucida Console', Monaco, monospace")
      .style("font-size", "10px")
      .style("color", "rgb(255, 250, 239)");*/

      bod.on("click", function(){d3.event.stopPropagation();})
              .call(d3.drag()).on("start", function(){d3.event.stopPropagation();})
              .style("display", "inline-block")
              .style("pointer-events", "none");



      bod.append("p")
        .html(d.id);

      bod.append("table").append("tr").append("tp")
      //.style("font-family", "'Lucida Console', Monaco, monospace")
        .html("info")
        .style("color", "#fffaef");

    var tab = bod.append("table");

    var info_text = tab.append("tr")
          .append("td")

    var output = "Node ID: " + d.id + "\n";

    var ref;

    if(d.map != null){
      ref = getNodeJsonObject(d);
      for (var key in ref){
      output += key +": " + ref[key] + "\n";
      }
    }
    else{
      ref = d;
      for (var key in ref){
        output += key + ": " + ref[key] + "\n";
      }

    }
    info_text.append("textarea")
      .attr("disabled", "undefined")
      .style("color", "#fffaef")
      .style("background-color", "rgba(28,28,28,.5")
      .style("pointer-events", "auto")
      .html(output);
        
  }

  function removeNodeDataSVG(d, elem){
    var tempid = d.id + "-svgtext";
    var addr = jq(tempid);
    var svgpointer = elem.select(addr);
    //svgpointer.selectAll("*").remove();
    svgpointer.remove();
    //correctLocations(d.id);
  }

  //Determines and sets proper (x,y) starting position for 
  //onclick node text svg element.
  //
  //Function is called in two locations and will recieve one or both parameters.
  //1) From displayNodeDataSVG(), passes id and svg_element, when a node has 
  //been clicked ON in order to correctly place an svg element 
  //which displays information about the clicked node. 
  //2) From removeNodeDataSVG(), only passes id, when a node has 
  //been clickd OFF in order to reposition the existing elements. 
  function correctLocations(id, svg_element){

    if(svg_element != undefined){
      var wrap = Math.floor(width/svg_width);
      var pos = node_text_svg.indexOf(id);
      var tempx = (pos % wrap)*(svg_width);
      var tempy = Math.floor(pos/wrap)*(svg_height);

      svg_element
        .style("top", tempy)
        .style("left", tempx);
    }
    else{
      var pos = node_text_svg.indexOf(id);
      node_text_svg.splice(pos, 1);

      for (var i = pos; i < node_text_svg.length; i++){
        id = node_text_svg[i];
        var svg_id = jq(id + "-svgtext");
        var svg_elem = d3.select(svg_id);
        correctLocations(id, svg_elem);
      }
    }
  }

  function mouseover(d){
      d3.select(this).append("text")
          .attr("class", "hover")
          .attr('transform', function(d){
              return 'translate(5, -10)';
          })
          .text("Node: " + d.id);
  }
  
  function mouseout(d){
      d3.select(this).select("text.hover").remove();
  }
}

function getNodeJsonObject(d){
    for(var i = 0, total_objects = node_json_data.length; i < total_objects; i++)
      if(node_json_data[i].name == d.id)
        return node_json_data[i];
  }

  function getNodeInfoString(d){
    var output = "Node ID: " + d.id + "\n";

    var ref;

    if(d.map != null){
      ref = getNodeJsonObject(d);
      for (var key in ref){
      output += key +": " + ref[key] + "\n";
      }
    }
    else{
      ref = d;
      for (var key in ref){
        output += key + ": " + ref[key] + "\n";
      }
    }

    return output;
  }


//Returns html entity for greek symbols corresponding to node group.
function groupToGreek(group){
  var greek_val;
  switch(group){
    case 1:
      greek_val = "&omega;";
      break;
    case 2:
      greek_val = "&alpha;";
      break;
    case 3:
      greek_val = "&delta;";
      break;
    case 4:
      greek_val = "&Lambda;";
      break;
    case 5:
      greek_val = "&lambda;";
      break;
    default:
      greek_val = "&sigma;";
      break;
  }
  return greek_val;
}

//Used to convert ids which contain symbols also used as CSS notation
//Required for proper selection by unique DOM ID.
function jq( myid ) {
    var temp = myid.replace(/\\/g, "");
    return "#" + temp.replace( /(:|\.|\[|\]|,|\(|\)|=)/g, "\\$1" );
}

//CRITICAL COMPONENT DO NOT DELETE
function ridiculousColorPickingFunction(number){
  var most_important_aspect_of_this_project;
  switch (number){
    case 1:
      most_important_aspect_of_this_project = "rgb(81,237,188)";
      break;
    case 2:
      most_important_aspect_of_this_project = "rgb(253, 151, 31)";
      break;
    case 3:
      most_important_aspect_of_this_project = "rgb(249,38,114)";
      break;
    case 4:
      most_important_aspect_of_this_project = "rgb(255, 255, 0)";
      break;
    case 5:
      most_important_aspect_of_this_project = "rgb(132, 50, 255)";
      break;
    default:
      most_important_aspect_of_this_project = "rgb(116,226,46)";
      break;
  }
  return most_important_aspect_of_this_project;
}