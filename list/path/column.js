define(["jquery", "d3", "./settings", "../../listeners", "../../uiutil", "../pathsorting", "../../datastore"], function ($, d3, s, listeners, uiUtil, pathSorting, dataStore) {

  //var DEFAULT_COLUMN_WIDTH = 80;
  var COLUMN_SPACING = 5;
  var BAR_SIZE = 12;


  var RANK_CRITERION_SELECTOR_WIDTH = 100;
  var COLUMN_ELEMENT_SPACING = 5;
  var STRATEGY_SELECTOR_START = 20;
  var DEFAULT_COLUMN_WIDTH = STRATEGY_SELECTOR_START + RANK_CRITERION_SELECTOR_WIDTH + 2 * COLUMN_ELEMENT_SPACING + 2 * 16 + 5;
  //var RANK_CRITERION_ELEMENT_HEIGHT = 22;

  var currentColumnID = 0;
  var allColumns = [];

  function getTotalColumnWidth(columns, index) {

    var maxIndex = (typeof index === "undefined") ? columns.length - 1 : index;

    var width = 0;
    for (var i = 0; i < maxIndex; i++) {
      width += columns[i].getWidth();
      width += COLUMN_SPACING;
    }

    return width;
  }

  function getColumnItemTranlateX(columns, column, pathWrappers, index) {
    var pathWrapper = s.isAlignColumns() ? getMaxLengthPathWrapper(pathWrappers) : pathWrappers[index];
    var translateX = column.pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + s.NODE_WIDTH + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2);
    translateX += getTotalColumnWidth(columns, columns.indexOf(column));
    return translateX;
  }

  function getMaxLengthPathWrapper(pathWrappers) {
    var maxPathLength = 0;
    var maxLengthPathWrapper = 0;

    pathWrappers.forEach(function (p) {
      var l = p.path.nodes.length;
      if (l > maxPathLength) {
        maxPathLength = l;
        maxLengthPathWrapper = p;
      }
    });

    return maxLengthPathWrapper;
  }


  function RankColumnHeader(priority, column, columnManager, selectedStrategyIndex) {
    this.priority = priority;
    this.column = column;
    this.columnManager = columnManager;
    this.selectedStrategyIndex = selectedStrategyIndex || 0;
  }

  RankColumnHeader.prototype = {

    setPriority: function (priority) {
      this.priority = priority;
      if (typeof this.rootDomElement !== "undefined") {
        this.rootDomElement.select("text.priority")
          .text(this.priority.toString() + ".")
      }
    },

    init: function (parent) {

      this.rootDomElement = parent.append("g")
        .classed("rankCriterionElement", true);

      this.rootDomElement.append("rect")
        .attr({
          x: 0,
          y: 0,
          width: DEFAULT_COLUMN_WIDTH,
          height: s.COLUMN_HEADER_HEIGHT
        })
        .style({
          fill: "rgb(240,240,240)"
        });

      this.rootDomElement.append("rect")
        .attr({
          x: 0,
          y: 0,
          rx: 5,
          ry: 5,
          width: DEFAULT_COLUMN_WIDTH,
          height: s.COLUMN_HEADER_HEIGHT
        })
        .style({
          fill: "lightgray"
        });

      this.rootDomElement.append("text")
        .classed("priority", true)
        .attr({
          x: 5,
          y: s.COLUMN_HEADER_HEIGHT / 2 + 5
        })
        .style({
          "font-size": "12px"
        })
        .text(this.priority.toString() + ".");

      this.rootDomElement.append("foreignObject")
        .attr({
          x: STRATEGY_SELECTOR_START,
          y: 2,
          width: DEFAULT_COLUMN_WIDTH - STRATEGY_SELECTOR_START - 2,
          height: s.COLUMN_HEADER_HEIGHT - 4
        }).append("xhtml:div")
        .style("font", "12px 'Arial'")
        .html('<select class="strategySelector"></select>');


      var that = this;
      var selector = this.rootDomElement.select("select.strategySelector");

      this.columnManager.selectableSortingStrategies.forEach(function (strategy, i) {
        selector.append("option")
          .attr({
            value: i
          })
          .text(strategy.label);
      });

      selector.append("title")
        .text(function () {
          return $(selector[0]).text;
        });


      $(selector[0]).width(RANK_CRITERION_SELECTOR_WIDTH);
      $(selector[0]).val(this.selectedStrategyIndex);


      var sortingOrderButton = uiUtil.addOverlayButton(this.rootDomElement, STRATEGY_SELECTOR_START + RANK_CRITERION_SELECTOR_WIDTH + 5, 3, 16, 16, that.orderButtonText(), 16 / 2, 16 - 3, "rgb(30,30,30)", false);

      sortingOrderButton
        .classed("sortOrderButton", true)
        .on("click", function () {
          that.columnManager.selectableSortingStrategies[that.selectedStrategyIndex].ascending = !that.columnManager.selectableSortingStrategies[that.selectedStrategyIndex].ascending;
          that.columnManager.updateSortOrder();
          that.columnManager.notify();
        });

      $(selector[0]).on("change", function () {
        that.selectedStrategyIndex = this.value;
        that.column.setSortingStrategy(that.columnManager.selectableSortingStrategies[that.selectedStrategyIndex]);
        that.columnManager.updateSortOrder();
        that.columnManager.notify();
      });

      var removeButton = uiUtil.addOverlayButton(this.rootDomElement, STRATEGY_SELECTOR_START + RANK_CRITERION_SELECTOR_WIDTH + 10 + 16, 3, 16, 16, "\uf00d", 16 / 2, 16 - 3, "red", true);

      removeButton.attr("display", "none");

      removeButton.on("click", function () {
        //var index = that.columnManager.rankElements.indexOf(that);
        //if (index !== -1) {
        //  that.columnManager.rankElements.splice(index, 1);
        //  that.rootDomElement.remove();
        //  that.columnManager.update();
        //  that.columnManager.notify();
        //}
      });

      $(this.rootDomElement[0]).mouseenter(function () {
        removeButton.attr("display", "inline");
      });

      $(this.rootDomElement[0]).mouseleave(function () {
        removeButton.attr("display", "none");
      });
    },

    orderButtonText: function () {
      return this.columnManager.selectableSortingStrategies[this.selectedStrategyIndex].ascending ? "\uf160" : "\uf161";
    },

    updateSortOrder: function () {
      this.rootDomElement.select("g.sortOrderButton").select("text").text(this.orderButtonText());
    }
  };

  function Column(columnManager, sortingStrategy, priority) {
    this.columnManager = columnManager;
    this.pathList = columnManager.pathList;
    this.id = currentColumnID++;
    this.header = new RankColumnHeader(priority, this, columnManager, columnManager.selectableSortingStrategies.indexOf(sortingStrategy));
    this.setSortingStrategy(sortingStrategy);
  }

  Column.prototype = {
    setSortingStrategy: function (sortingStrategy) {
      this.sortingStrategy = sortingStrategy;
      this.itemRenderer = this.columnManager.itemRenderers[sortingStrategy.id] || new PathItemRenderer();
      d3.selectAll("g.columnItem" + this.id).remove();
    },

    render: function (parent, pathWrappers) {
      this.renderHeader(pathWrappers);
      this.renderBackground(parent, pathWrappers);

      var that = this;

      var allColumnItems = parent.selectAll("g.columnItem" + this.id)
        .data(pathWrappers, function (d) {
          return d.path.id
        });

      var maxLengthPathWrapper = getMaxLengthPathWrapper(pathWrappers);
      var columnItem = allColumnItems.enter()
        .append("g")
        .classed("columnItem" + this.id, true)
        .attr({
          transform: function (d, i) {
            var translateY = s.getPathContainerTranslateY(pathWrappers, i);
            return "translate(" + getColumnItemTranlateX(that.columnManager.columns, that, pathWrappers, i) + "," + translateY + ")";
          }
        });

      columnItem.each(function (pathWrapper, index) {
        var item = d3.select(this);
        that.itemRenderer.enter(item, pathWrapper, index, pathWrappers, that);
      });

      allColumnItems.transition()
        .attr({
          transform: function (d, i) {
            var pathWrapper = s.isAlignColumns() ? maxLengthPathWrapper : d;
            var translateX = that.pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + s.NODE_WIDTH + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2);
            translateX += getTotalColumnWidth(that.columnManager.columns, that.columnManager.columns.indexOf(that));
            var translateY = s.getPathContainerTranslateY(pathWrappers, i);
            return "translate(" + translateX + "," + translateY + ")";
          }
        });

      allColumnItems.each(function (pathWrapper, index) {
        var item = d3.select(this);
        that.itemRenderer.update(item, pathWrapper, index, pathWrappers, that);
      });

      allColumnItems.exit().remove();
    },

    renderHeader: function (pathWrappers) {
      var that = this;
      var translateX = getTotalColumnWidth(that.columnManager.columns, that.columnManager.columns.indexOf(this));
      if (pathWrappers.length !== 0) {
        var pathWrapper = s.isAlignColumns() ? getMaxLengthPathWrapper(pathWrappers) : pathWrappers[0];
        translateX += this.pathList.getNodePositionX(pathWrapper, pathWrapper.path.nodes.length - 1, false) + s.NODE_WIDTH + (s.isTiltAttributes() ? 0 : s.EDGE_SIZE / 2);
      }


      if (!this.headerElement) {
        this.headerElement = d3.select("#columnHeaders svg").append("g")
          .classed("columnHeader" + this.id, true)
          .attr({
            transform: "translate(" + translateX + ",0)"
          });


        this.header.init(this.headerElement);
      }

      this.headerElement.transition()
        .attr({
          transform: "translate(" + translateX + ",0)"
        });

    },

    renderBackground: function (parent, pathWrappers) {

      var that = this;

      if (!this.bgRoot) {
        this.bgRoot = parent.insert("g", ":first-child")
          .classed("columnBackground" + this.id, true);
      }


      var bgDataLeft = [];
      var bgDataRight = [];

      for (var i = 0, j = pathWrappers.length - 1; i < pathWrappers.length && j >= 0; i++, j--) {

        var translateX = getColumnItemTranlateX(that.columnManager.columns, that, pathWrappers, i);
        var translateY = s.getPathContainerTranslateY(pathWrappers, i);

        bgDataLeft.push({
          x: translateX,
          y: translateY
        });
        bgDataLeft.push({
          x: translateX,
          y: translateY + pathWrappers[i].getHeight()
        });

        translateX = getColumnItemTranlateX(that.columnManager.columns, that, pathWrappers, j);
        translateY = s.getPathContainerTranslateY(pathWrappers, j);

        bgDataRight.push({
          x: translateX + that.getWidth(),
          y: translateY + pathWrappers[i].getHeight()
        });
        bgDataRight.push({
          x: translateX + that.getWidth(),
          y: translateY
        });

      }

      var bgData = bgDataLeft.concat(bgDataRight);

      var allBg = this.bgRoot.selectAll("path")
        .data([bgData]);

      var line = d3.svg.line()
        .x(function (d) {
          return d.x;
        })
        .y(function (d) {
          return d.y;
        })
        .interpolate("linear");

      allBg.enter()
        .append("path")
        .attr({
          //stroke: "black",
          fill: "rgb(240,240,240)",
          d: function (d) {
            return line(d) + "Z";
          }
        });

      allBg.transition()
        .attr({
          d: function (d) {
            return line(d) + "Z";
          }
        });

      allBg.exit().remove();


    },

    //onItemEnter: function ($item, pathWrapper, index, pathWrappers) {
    //
    //},
    //
    //onItemUpdate: function ($item, pathWrapper, index, pathWrappers) {
    //
    //},

    destroy: function () {
      if (this.header) {
        this.header.remove();
      }
      if (this.bgRoot) {
        this.bgRoot.remove();
      }
    },

    getWidth: function () {
      return DEFAULT_COLUMN_WIDTH;
    }
  };

  function PathItemRenderer() {
  }

  PathItemRenderer.prototype = {
    enter: function (item, pathWrapper, index, pathWrappers) {

    },

    update: function (item, pathWrapper, index, pathWrappers) {

    }
  };

  function PathLengthRenderer() {
    PathItemRenderer.call(this);
  }

  PathLengthRenderer.prototype = Object.create(PathItemRenderer.prototype);

  PathLengthRenderer.prototype.enter = function (item, pathWrapper, index, pathWrappers, column) {
    var barScale = d3.scale.linear().domain([0, pathWrappers.length > 0 ? getMaxLengthPathWrapper(pathWrappers).path.nodes.length : 1]).range([0, column.getWidth()]);

    var bar = item.append("rect")
      .classed("pathLength", true)
      .attr({
        x: 0,
        y: (s.PATH_HEIGHT - BAR_SIZE) / 2,
        fill: "gray",
        width: barScale(pathWrapper.path.nodes.length),
        height: BAR_SIZE
      });

    bar.append("title")
      .text("Length: " + pathWrapper.path.nodes.length);
  };

  PathLengthRenderer.prototype.update = function (item, pathWrapper, index, pathWrappers, column) {
    var barScale = d3.scale.linear().domain([0, pathWrappers.length > 0 ? getMaxLengthPathWrapper(pathWrappers).path.nodes.length : 1]).range([0, column.getWidth()]);
    item.select("rect.pathLength")
      .transition()
      .attr({
        width: function (d) {
          return barScale(pathWrapper.path.nodes.length);
        }
      });
  };

  function ColumnManager() {
    this.columns = [];
    this.itemRenderers = {};
  }

  ColumnManager.prototype = {

    init: function (pathList) {
      this.pathList = pathList;
      this.itemRenderers[pathSorting.sortingStrategies.pathLength.id] = new PathLengthRenderer();

      var that = this;
      var initialPathSortingStrategies = Object.create(pathSorting.sortingManager.currentStrategyChain);
      initialPathSortingStrategies.splice(pathSorting.sortingManager.currentStrategyChain.length - 1, 1);

      this.selectableSortingStrategies = [pathSorting.sortingStrategies.pathQueryStrategy, pathSorting.sortingStrategies.selectionSortingStrategy,
        pathSorting.sortingStrategies.pathLength, pathSorting.sortingStrategies.setCountEdgeWeight];
      this.selectableSortingStrategies = this.selectableSortingStrategies.concat(dataStore.getDataBasedPathSortingStrategies());

      this.columns = initialPathSortingStrategies.map(function (sortingStrategy, i) {
        return new Column(that, sortingStrategy, i + 1);
      });
    },

    getStrategyChain: function () {
      var chain = [];
      var that = this;

      this.columns.forEach(function (column) {
        chain.push(that.selectableSortingStrategies[column.header.selectedStrategyIndex]);
      });

      return chain;
    },

    notify: function () {
      var chain = this.getStrategyChain();
      chain.push(pathSorting.sortingStrategies.pathId);
      pathSorting.sortingManager.setStrategyChain(chain);
      listeners.notify(pathSorting.updateType, pathSorting.sortingManager.currentComparator);
    },

    updateSortOrder: function () {
      this.columns.forEach(function (column) {
        column.header.updateSortOrder();
      });
    },

    //removeColumn: function (col) {
    //  var index = allColumns.indexOf(col);
    //  if (index !== -1) {
    //    allColumns.splice(index, 1);
    //    col.destroy();
    //  }
    //}
    //,

    renderColumns: function (parent, pathWrappers) {
      this.columns.forEach(function (col) {
        col.render(parent, pathWrappers);
      });
    }
    ,

    getWidth: function () {
      return getTotalColumnWidth(this.columns);
    }

  }
  ;

  return new ColumnManager();

})
;