
ko.bindingHandlers.fadeVisible = {
    init: function(element, valueAccessor) {
        // Initially set the element to be instantly visible/hidden depending on the value
        var value = valueAccessor();
        $(element).toggle(ko.utils.unwrapObservable(value)); // Use "unwrapObservable" so we can handle values that may or may not be observable
    },
    update: function(element, valueAccessor, allBindingsAccessor) {
        // Whenever the value subsequently changes, slowly fade the element in or out
        var value = valueAccessor();
        var after = allBindingsAccessor().after;
        var func = ko.utils.unwrapObservable(value) ? 'fadeIn' : 'fadeOut';
        $(element).stop()[func](after);
    }
};

ko.bindingHandlers.hovering = {
    init: function(element, valueAccessor) {
        var value = valueAccessor();
        $(element).mouseenter(function() {
            value(true);
        }).mouseleave(function() {
            value(false);
        });
    }
};

ko.bindingHandlers.drag = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, context) {

        var dragTimer = null, dragX = 0, dragY = 0, dragLastMoveTime = null;

        var margin = 32, speed = 32;

        var dragScroll = function() {
            if ((new Date().getTime() - dragLastMoveTime) < 1000) {
                console.log('Waiting for stationary mouse...');
                return;
            }
            $('.ko-drag-autoscroll').each(function() {
                var scrollableArea = $(this);
                var areaOffset = scrollableArea.offset();
                var l = areaOffset.left,
                    t = areaOffset.top,
                    r = areaOffset.left + scrollableArea.outerWidth(),
                    b = areaOffset.top + scrollableArea.outerHeight();
                if (dragX > l && dragX < r && dragY > t && dragY < b) {
                    l += margin;
                    t += margin;
                    r -= margin;
                    b -= margin;
                    console.log('Mouse is over autoscroll element: ' + dragX + ', ' + dragY + ' - { ' +
                        l + ', ' + t + ' - ' + r + ', ' + b + ' }');

                    var scrollX = 0, scrollY = 0;
                    if (dragX < l) {
                        scrollX = -1;
                        console.log('Autoscroll right');
                    }
                    if (dragX > r) {
                        scrollX = 1;
                        console.log('Autoscroll left');
                    }
                    if (dragY < t) {
                        scrollY = -1;
                        console.log('Autoscroll top');
                    }
                    if (dragY > b) {
                        scrollY = 1;
                        console.log('Autoscroll bottom');
                    }
                    scrollableArea[0].scrollLeft += (scrollX * speed);
                    scrollableArea[0].scrollTop += (scrollY * speed);
                }
            });
        };

        var value = valueAccessor();
        $(element).draggable({
            containment: 'window',
            helper: function(evt, ui) {
                var h = $(element).clone().css({
                    width: $(element).width(),
                    width: $(element).width()
                });
                h.data('ko.draggable.data', value(context, evt));
                return h;
            },
            appendTo: 'body',
            start: function(evt, ui) {
                dragTimer = setInterval(dragScroll, 100);
            },
            drag: function(evt, ui) {
                dragX = evt.pageX;
                dragY = evt.pageY;
                dragLastMoveTime = new Date().getTime();
            },
            stop: function(evt, ui) {
                if (dragTimer != null) {
                    clearInterval(dragTimer);
                }
            }
        });
    }
};

ko.bindingHandlers.drop = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, context) {
        var value = valueAccessor();
        $(element).droppable({
            tolerance: 'pointer',
            hoverClass: 'dragHover',
            activeClass: 'dragActive',
            drop: function(evt, ui) {
                value(context, ui.helper.data('ko.draggable.data'));
            }
        });
    }
};

var simluatedObservable = (function() {

    var timer = null;
    var items = [];

    var check = function() {
        items = items.filter(function(item) {
            return !!item.elem.parents('html').length;
        });
        if (items.length === 0) {
            clearInterval(timer);
            timer = null;
            return;
        }
        items.forEach(function(item) {
            item.obs(item.getter());
        });
    };

    return function(elem, getter) {
        var obs = ko.observable(getter());
        items.push({ obs: obs, getter: getter, elem: $(elem) });
        if (timer === null) {
            timer = setInterval(check, 100);
        }
        return obs;
    };
})();

ko.bindingHandlers.virtualScroll = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, context) {

        var clone = $(element).clone();
        $(element).empty();

        var config = ko.utils.unwrapObservable(valueAccessor());
        var rowHeight = ko.utils.unwrapObservable(config.rowHeight);

        ko.computed(function() {
            $(element).css({
                height: config.rows().length * rowHeight
            });
        });

        var offset = simluatedObservable(element, function() {
            return $(element).offset().top;
        });

        var windowHeight = simluatedObservable(element, function() {
            return window.innerHeight;
        });

        var created = {};

        var refresh = function() {
            var o = offset();
            var data = config.rows();
            var top = Math.max(0, Math.floor(-o / rowHeight) - 10);
            var bottom = Math.min(data.length, Math.ceil((-o + windowHeight()) / rowHeight));

            var required = {};

            for (var row = top; row < bottom; row++) {
                if (!created[row]) {
                    var rowDiv = $('<div></div>');
                    rowDiv.css({
                        position: 'absolute',
                        height: config.rowHeight,
                        left: 0,
                        right: 0,
                        top: row * config.rowHeight
                    });
                    rowDiv.append(clone.clone().children());
                    ko.applyBindingsToDescendants(context.createChildContext(data[row]), rowDiv[0]);
                    required[row] = rowDiv;
                    $(element).append(rowDiv);
                } else {
                    required[row] = created[row];
                }
            }

            Object.keys(created).forEach(function(rowNum) {
                if (!required[rowNum]) {
                    created[rowNum].remove();
                    delete created[rowNum];
                }
            });

            Object.keys(required).forEach(function(rowNum) {
                if (!created[rowNum]) {
                    created[rowNum] = required[rowNum];
                }
            });
        };

        config.rows.subscribe(function() {
            Object.keys(created).forEach(function(rowNum) {
                created[rowNum].remove();
                delete created[rowNum];
            });
            refresh();
        });

        ko.computed(refresh);

        return { controlsDescendantBindings: true };
    }
};
