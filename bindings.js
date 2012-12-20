

/*
ko.bindingHandlers.watermark = {
    init: function (element, valueAccessor, allBindingsAccessor) {
        var value = valueAccessor(), allBindings = allBindingsAccessor();
        var defaultWatermark = ko.utils.unwrapObservable(value);

        setTimeout(function() { element.value = defaultWatermark; }, 0);

        element.focus(
            function () {
                if (element.value === defaultWatermark) {
                    element.value = '';
                }
            }).blur(function () {
                if (element.value === '') {
                    element.value = defaultWatermark;
                }
            });
    }
};
    */