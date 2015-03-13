/**
 * Created by Christian on 25.02.2015.
 */
define(["d3", "../caleydo/main"], function (d3, C) {

  function Selection() {
    this.hovered = [];
    this.selected = [];
  }

  //TODO: take care of duplicate ids
  Selection.prototype = {
    setSelection: function (ids, type) {
      if (ids instanceof Array) {
        this[type] = ids;
      } else {
        this[type] = [ids];
      }
    },

    addToSelection: function (ids, type) {
      if (typeof this[type] === "undefined") {
        this[type] = [];
      }
      if (ids instanceof Array) {
        this[type].pushAll(ids);
      } else {
        this[type].push(ids);
      }
    },

    removeFromSelection: function (ids, type) {
      if (typeof this[type] === "undefined") {
        this[type] = [];
        return;
      }

      if (ids instanceof Array) {
        ids.forEach(function (id) {
          this.removeSingleId(id, type);
        });
      } else {
        this.removeSingleId(ids, type);
      }
    },

    removeSingleId: function (id, type) {
      var index = this[type].indexOf(id);
      while (index > -1) {
        this[type].splice(index, 1);
        index = this[type].indexOf(id);
      }
    }


  };


  function removeListener(l, listeners) {

  }

  return {
    selections: {
      node: new Selection(),
      set: new Selection(),
      path: new Selection()
    },

    listeners: {
      node: [],
      set: [],
      path: []
    },

    notify: function (idType, selectionType) {
      var listeners = this.listeners[idType];
      listeners.forEach(function (l) {
        l(selectionType);
      })
    },

    removeListeners: function (listeners) {
      var that = this;
      if (listeners instanceof Array) {
        listeners.forEach(function (l) {
          removeSingle(l);
        });
      } else {
        removeSingle(listeners);
      }

      function removeSingle(l) {
        for (var key in that.listeners) {
          var index = that.listeners[key].indexOf(l);
          if (index > -1) {
            that.listeners[key].splice(index, 1);
          }
        }
      }
    },

    addListener: function (idType, listener) {
      this.listeners[idType].push(listener);
    },

    addDefaultListener: function (parent, selector, idAccessor, idType) {

      var that = this;
      var elements = parent.selectAll(selector)
        .on("mouseover", function (d) {
          that.selections[idType].setSelection(idAccessor(d), "hovered");
          that.notify(idType, "hovered");
        })
        .on("mouseout", function (d) {
          that.selections[idType].removeFromSelection(idAccessor(d), "hovered");
          that.notify(idType, "hovered");
        })
        .on("click", function (d) {
          if (d3.event.ctrlKey) {
            that.selections[idType].addToSelection(idAccessor(d), "selected");
          } else {
            that.selections[idType].setSelection(idAccessor(d), "selected");
          }
          that.notify(idType, "selected");
        });


      var listener = function (selectionType) {
        parent.selectAll(selector)
          .each(function (d) {
            var id = idAccessor(d);
            var selectedIds = (that.selections[idType])[selectionType];
            var selected = false;
            for (var i = 0; i < selectedIds.length; i++) {
              if (selectedIds[i] === id) {
                d3.select(this).classed(selectionType, true);
                selected = true;
                break;
              }
            }
            if (!selected) {
              d3.select(this).classed(selectionType, false);
            }
          });
      };

      this.listeners[idType].push(listener);


      //make sure to set correct selection from start
      listener("hovered");
      listener("selected");
      //this.notify(idType, "hovered");
      //this.notify(idType, "selected");

      //This would be the way to go but reordering elements triggers the node removed event

      //C.onDOMNodeRemoved(parent.node(), function (n) {
      //  var index = that.listeners[idType].indexOf(listener);
      //  if (index > -1) {
      //    that.listeners[idType].splice(index, 1);
      //  }
      //});

      return listener;

      //elements.node().addEventListener('DOMNodeRemoved')
      //
      //arr.forEach((n) = > {
      //  function l(evt)
      //{
      //  //since this event bubbles check if it the right node
      //  var act = n;
      //  while (act) { //check if node or its parent are removed
      //    if (evt.target === act) {
      //      node = null;
      //      n.removeEventListener('DOMNodeRemoved', l);
      //      body.removeEventListener('DOMNodeRemoved', l);
      //      callback.call(thisArg, n);
      //      return;
      //    }
      //    act = act.parentNode;
      //  }
      //}
      //
      //n.addEventListener('DOMNodeRemoved', l);
      //body.addEventListener('DOMNodeRemoved', l);
    }
  }
})
;
