define(['jquery', 'd3', 'webcola', 'dagre', '../listeners', '../selectionutil', '../list/pathsorting', '../query/pathquery', '../config', '../view'],
  function ($, d3, webcola, dagre, listeners, selectionUtil, pathSorting, pathQuery, config, View) {
    'use strict';

    var w = 800;
    var h = 700;

    var sideSpacing = 10;
    //var arrowWidth = 7;
    var nodeWidth = 50;
    var nodeHeight = 20;

    function PathGraphView() {
      View.call(this, "#pathgraph");
      this.grabHSpace = true;
      this.grabVSpace = true;

      this.paths = [];
      this.graph = new dagre.graphlib.Graph().setGraph({
        rankdir: "LR",
        marginx: 5,
        marginy: 5
      });
    }

    PathGraphView.prototype = Object.create(View.prototype);

    PathGraphView.prototype.getMinSize = function () {
      if (this.graph.nodes().length === 0) {
        return {width: 200, height: 200};
      }

      return {width: Math.max(this.graph.graph().width, 200), height: Math.max(this.graph.graph().height, 200)};
    };

    PathGraphView.prototype.init = function () {
      View.prototype.init.call(this);
      var graphGroup = d3.select(this.parentSelector + " svg").append("g")
        .attr("class", "graph");

      graphGroup.append("g")
        .classed("edgeGroup", true);
      graphGroup.append("g")
        .classed("nodeGroup", true);


      $(window).on('resize.center', function (e) {
        that.centerGraph();
      });

      var that = this;

      selectionUtil.addListener("path", function (selectionType) {
        var selectedIds = (selectionUtil.selections["path"])[selectionType];
        var selected = false;

        var selectedNodes = {};
        var selectedPaths = [];
        selectedIds.forEach(function (pathId) {

          for (var i = 0; i < that.paths.length; i++) {
            var path = that.paths[i];
            if (path.id === pathId) {
              selectedPaths.push(path);
              path.nodes.forEach(function (node) {
                selectedNodes[node.id.toString()] = true;
              });
            }
          }
        });

        var svg = d3.select("#pathgraph svg");
        svg.selectAll("g.node")
          .classed("path_" + selectionType, function (d) {
            return (typeof selectedNodes[d] !== "undefined");
          });

        svg.selectAll("g.edgePath path")
          .classed("path_" + selectionType, function (d) {


            return (typeof selectedNodes[d.v] !== "undefined") && (typeof selectedNodes[d.w] !== "undefined");
          });


      });

      listeners.add(function (query) {
        if (pathQuery.isRemoveFilteredPaths() || pathQuery.isRemoteQuery()) {
          that.updateGraphToFilteredPaths();
        } else {
          that.updateFilter();
        }
      }, listeners.updateType.QUERY_UPDATE);
      listeners.add(function (remove) {
        if (remove) {
          that.updateGraphToFilteredPaths();
        } else {
          that.updateGraphToAllPaths();
        }
      }, listeners.updateType.REMOVE_FILTERED_PATHS_UPDATE);
    };

    PathGraphView.prototype.addPathsToGraph = function (paths) {

      var that = this;


      paths.forEach(function (path) {
          var prevNode = 0;

          for (var i = 0; i < path.nodes.length; i++) {
            var node = path.nodes[i];
            that.graph.setNode(node.id, {
              label: node.properties[config.getNodeNameProperty(node)],
              node: node,
              width: nodeWidth,
              height: nodeHeight

            });
            if (prevNode !== 0) {
              that.graph.setEdge(prevNode.id, node.id, {
                label: path.edges[i - 1].id.toString(),
                edge: path.edges[i - 1]
              });
            }
            prevNode = node;
          }


        }
      );
    };

    PathGraphView.prototype.centerGraph = function () {
      var svg = d3.select("#pathgraph svg");
      var svgWidth = $(svg[0]).width();
      var svgHeight = $(svg[0]).height();
      var graphWidth = this.graph.graph().width;
      var graphHeight = this.graph.graph().height;
      svg.select("g.graph").attr("transform", "translate(" + ((svgWidth - graphWidth) / 2) + ", " + ((svgHeight - graphHeight) / 2) + ")");
    };


    PathGraphView.prototype.updateGraphToFilteredPaths = function () {

      this.graph = new dagre.graphlib.Graph().setGraph({
        rankdir: "LR",
        marginx: 5,
        marginy: 5
      });

      var that = this;

      if (pathQuery.isRemoteQuery()) {
        for (var i = 0; i < this.paths.length; i++) {
          var path = this.paths[i];
          if (pathQuery.isPathFiltered(path.id)) {
            this.paths.splice(i, 1);
            i--;
          }
        }
      }

      this.paths.forEach(function (path) {
        if (!pathQuery.isPathFiltered(path.id)) {
          that.addPathsToGraph([path]);
        }
      });

      this.renderGraph(d3.select("#pathgraph svg"));
    };

    PathGraphView.prototype.updateGraphToAllPaths = function () {
      var that = this;

      this.graph = new dagre.graphlib.Graph().setGraph({
        rankdir: "LR",
        marginx: 5,
        marginy: 5
      });

      that.addPathsToGraph(this.paths);

      this.renderGraph(d3.select("#pathgraph svg"));
    };


    PathGraphView.prototype.updateFilter = function () {

      var svg = d3.select("#pathgraph svg");
      svg.selectAll("g.node")
        .transition()
        .style("opacity", function (d) {
          return pathQuery.isNodeFiltered(d) ? 0.5 : 1;
        });

      svg.selectAll("g.edgePath path")
        .classed("filtered", function (d) {
          return pathQuery.isNodeFiltered(d.v) || pathQuery.isNodeFiltered(d.w);
        });

    };

    PathGraphView.prototype.render = function (paths) {
      this.paths = paths;
      //if (paths.length > 0) {

      var svg = d3.select("#pathgraph svg");
      this.addPathsToGraph(paths);

      this.renderGraph(svg);

    };

    PathGraphView.prototype.addPath = function (path) {
      this.paths.push(path);
      var svg = d3.select("#pathgraph svg");
      this.addPathsToGraph([path]);

      this.renderGraph(svg);
    };

    PathGraphView.prototype.reset = function () {
      var svg = d3.select("#pathgraph svg");

      svg.selectAll("g.graph")
        .remove();

      var graphGroup = svg.append("g")
        .attr("class", "graph");


      graphGroup.append("g")
        .classed("edgeGroup", true);
      graphGroup.append("g")
        .classed("nodeGroup", true);

      this.paths = [];
      this.graph = new dagre.graphlib.Graph().setGraph({
        rankdir: "LR",
        marginx: 5,
        marginy: 5
      });
    };

    PathGraphView.prototype.renderGraph = function (svg) {


      var that = this;

      dagre.layout(this.graph);

      // Set some general styles
      //this.graph.nodes().forEach(function (v) {
      //  var node = that.graph.node(v);
      //  node.rx = node.ry = 5;
      //});

// Add some custom colors based on state
//        g.node('CLOSED').style = "fill: #f77";
//        g.node('ESTAB').style = "fill: #7f7";

      var inner = svg.select("g.graph");
      var edgeGroup = svg.select("g.edgeGroup");

      var allEdges = edgeGroup.selectAll("g.edgePath")
        .data(that.graph.edges(), function (edge) {
          var e = that.graph.edge(edge);
          return e.label;
        });

      allEdges.exit()
        .remove();

      var edge = allEdges
        .enter()
        .append("g")
        .classed("edgePath", true);

      var line = d3.svg.line()
        .x(function (d) {
          return d.x;
        })
        .y(function (d) {
          return d.y;
        })
        .interpolate("basis");

      edge.append("path")
        .style({fill: "none"})
        .classed("lines", true)
        .attr({
          "marker-end": function (d) {
            return "url(#arrowhead" + that.graph.edge(d).label + ")"
          }
        });

      //<marker id="arrowhead1177" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="strokeWidth" markerWidth="8" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" style="stroke-width: 1px; stroke-dasharray: 1px, 0px;"></path></marker>

      edge.append("defs")
        .append("marker")
        .attr("id", function (d) {
          return "arrowhead" + that.graph.edge(d).label;
        })
        .attr("viewBox", "0 0 10 10")
        .attr("refX", "9")
        .attr("refY", "5")
        .attr("markerUnits", "strokeWidth")
        .attr("markerWidth", "8")
        .attr("markerHeight", "6")
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M 0 0 L 10 5 L 0 10 z");

      //<path d="M31.694915254237287,300L80,15L130,15L180,15L205,15"></path>
      //<path class="path" d="M23.52980132450331,307L64,16L113,16L162,16L197,16" marker-end="url(#arrowhead1177)" style="fill: none;"></path>

      allEdges.selectAll("path.lines").attr({
        d: function (d) {
          return line(that.graph.edge(d).points);
        }
      });
      //var edgeLines = edge.append("line");
      //.
      //attr("marker-end", "url(#arrowRight)");

      var nodeGroup = svg.select("g.nodeGroup");

      var allNodes = nodeGroup.selectAll("g.node")
        .data(that.graph.nodes(), function (node) {
          return node;
        });


      allNodes.exit()
        .remove();

      var node = allNodes
        .enter()
        .append("g")
        .classed("node", true)
        .on("dblclick", function (d) {
          pathSorting.sortingManager.addOrReplace(pathSorting.sortingStrategies.getNodePresenceStrategy([d]));
          listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
        });

      selectionUtil.addDefaultListener(nodeGroup, "g.node", function (d) {
          return d;
        },
        "node"
      );

      allNodes
        .attr("transform", function (d) {
          var n = that.graph.node(d);
          return "translate(" + n.x + ", " + n.y + ")";
        });

      var nodeRects = node.append("rect")
        .attr({
          rx: 5,
          ry: 5,
          x: -nodeWidth / 2,
          y: -nodeHeight / 2,
          width: function (d) {
            return that.graph.node(d).width;
          },
          height: function (d) {
            return that.graph.node(d).height;
          }
        });

      var nodeTexts = node.append("text")
        .attr({
          y: nodeHeight / 2 - 5
        })
        .text(function (d) {
          var node = that.graph.node(d).node;
          var text = node.properties[config.getNodeNameProperty(node)];
          if (text.length > 7) {
            text = text.substring(0, 7);
          }
          return text;
        });

      this.updateFilter();

      this.updateViewSize();
      this.centerGraph();

      //inner.selectAll("g.node")
      //  .on("dblclick", function (d) {
      //    pathSorting.sortingManager.addOrReplace(pathSorting.sortingStrategies.getNodePresenceStrategy([d]));
      //    listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
      //  });
      //selectionUtil.addDefaultListener(inner, "g.node", function (d) {
      //    return d;
      //  },
      //  "node"
      //);


    };


    return new PathGraphView();


  }
)
;
