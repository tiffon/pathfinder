define(['jquery', 'd3', '../view', '../uiUtil'], function ($, d3, View, uiUtil) {

  var RANK_CRITERION_ELEMENT_WIDTH = 165;
  var RANK_CRITERION_ELEMENT_HEIGHT = 22;
  var STRATEGY_SELECTOR_START = 20;
  var RANK_CRITERION_ELEMENT_SPACING = 5;

  function RankCriterionElement(selectableStrategies, selectedStrategyIndex) {
    this.priority = 0;
    this.selectedStrategyIndex = selectedStrategyIndex || 0;
    this.selectableStrategies = selectableStrategies;

  }

  RankCriterionElement.prototype = {

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
          rx: 5,
          ry: 5,
          width: RANK_CRITERION_ELEMENT_WIDTH,
          height: RANK_CRITERION_ELEMENT_HEIGHT
        })
        .style({
          fill: "lightgray"
        });

      this.rootDomElement.append("text")
        .classed("priority", true)
        .attr({
          x: 5,
          y: RANK_CRITERION_ELEMENT_HEIGHT / 2 + 5
        })
        .style({
          "font-size": "12px"
        })
        .text(this.priority.toString() + ".")

      this.rootDomElement.append("foreignObject")
        .attr({
          x: STRATEGY_SELECTOR_START,
          y: 2,
          width: RANK_CRITERION_ELEMENT_WIDTH - STRATEGY_SELECTOR_START - 2,
          height: RANK_CRITERION_ELEMENT_HEIGHT - 4
        }).append("xhtml:div")
        .style("font", "12px 'Arial'")
        .html('<select class="strategySelector"></select>');


      var selector = this.rootDomElement.select("select.strategySelector");

      this.selectableStrategies.forEach(function (strategy, i) {
        selector.append("option")
          .attr({
            value: i
          })
          .text(strategy.label);
      });

      $(selector[0]).width(100);
      $(selector[0]).val(this.selectedStrategyIndex);

      var sortingOrderButton = uiUtil.addOverlayButton(this.rootDomElement, STRATEGY_SELECTOR_START + 100 + 5, 3, 16, 16, "\uf160", 16 / 2, 16 - 3, "rgb(30,30,30)", false);

      sortingOrderButton.on("click", function() {
        d3.select(this).select("text").text("\uf161")
      });

      //var removeButton = uiUtil.addOverlayButton(this.rootDomElement, STRATEGY_SELECTOR_START + 100 + 10+16, 3, 16, 16, "\uf00d", 16 / 2, 16 - 3, "red", true);



      //selector.attr("width", 50);
      //selector.attr("size", 50);


    }


  };


  function RankConfigView(parentSelector, selectableSortingStrategies, idSortingStrategy, initialSortingStrategies) {
    View.call(this, parentSelector);
    this.selectableSortingStrategies = selectableSortingStrategies;
    this.idSortingStrategy = idSortingStrategy;
    this.initialSortingStrategies = initialSortingStrategies;
    this.rankElements = [];
  }

  RankConfigView.prototype = Object.create(View.prototype);

  RankConfigView.prototype.init = function () {
    View.prototype.init.call(this);

    var that = this;


    this.initialSortingStrategies.forEach(function (strat) {
      that.addRankCriterionElement(strat);
    });

    this.update()

  };

  RankConfigView.prototype.addRankCriterionElement = function (selectedStrategy) {
    var svg = d3.select(this.parentSelector + " svg");
    var el = new RankCriterionElement(this.selectableSortingStrategies, this.selectableSortingStrategies.indexOf(selectedStrategy));
    el.init(svg);
    this.rankElements.push(el);
  };

  RankConfigView.prototype.update = function () {
    this.rankElements.forEach(function (element, i) {
      element.rootDomElement.attr({
        transform: "translate(" + (i * (RANK_CRITERION_ELEMENT_WIDTH + RANK_CRITERION_ELEMENT_SPACING)) + ", 0)"
      });
      element.setPriority(i + 1);
    });
  };

  RankConfigView.prototype.getMinSize = function () {
    return {
      width: Math.max(200, RANK_CRITERION_ELEMENT_WIDTH * this.rankElements.length + RANK_CRITERION_ELEMENT_SPACING * (this.rankElements.length - 1)),
      height: RANK_CRITERION_ELEMENT_HEIGHT
    };
  };

  return RankConfigView;
})
;
