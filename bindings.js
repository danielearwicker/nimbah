
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
        var value = valueAccessor();
        $(element).draggable({
            start: function(evt, ui) {
                console.log(ui);
            },
            containment: 'document',
            helper: function(a, b, c) {
                var h = $(element).clone().css({
                    width: $(element).width()
                });
                h.data('ko.draggable.data', value(context));
                return h;
            },
            appendTo: 'body'
        });
    }
};

ko.bindingHandlers.drop = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, context) {
        var value = valueAccessor();
        $(element).droppable({
            tolerance: 'pointer',
            hoverClass: 'dragHover',
            drop: function(evt, ui) {
                value(context, ui.helper.data('ko.draggable.data'));
            }
        });
    }
};