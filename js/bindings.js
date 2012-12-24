
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
                return;
            }
            $('.ko-drag-autoscroll').each(function() {
                var scrollableArea = $(this);
                var areaOffset = scrollableArea.offset();
                var l = areaOffset.left,
                    t = areaOffset.top,
                    r = areaOffset.left + scrollableArea.width(),
                    b = areaOffset.top + scrollableArea.height();
                if (dragX > l && dragX < r && dragY > t && dragY < b) {
                    l += margin;
                    t += margin;
                    r -= margin;
                    b -= margin;
                    var scrollX = 0, scrollY = 0;
                    if (dragX < l) {
                        scrollX = -1;
                    }
                    if (dragX > r) {
                        scrollX = 1;
                    }
                    if (dragY < t) {
                        scrollY = -1;
                    }
                    if (dragY > b) {
                        scrollY = 1;
                    }
                    scrollableArea[0].scrollLeft += (scrollX * speed);
                    scrollableArea[0].scrollTop += (scrollY * speed);
                }
            });
        };


        var value = valueAccessor();
        $(element).draggable({
            containment: 'window',
            helper: function(a, b, c) {
                var h = $(element).clone().css({
                    width: $(element).width()
                });
                h.data('ko.draggable.data', value(context));
                return h;
            },
            appendTo: 'body',
            start: function(evt, ui) {
                dragTimer = setInterval(dragScroll, 100);
            },
            drag: function(evt, ui) {
                dragX = ui.offset.left;
                dragY = ui.offset.top;
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
