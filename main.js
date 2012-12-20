
var viewModel = {
    inputText: ko.observable(''),
    inputFocused: ko.observable(false),
    outputFocused: ko.observable(false),
    treeWidth: ko.observable(500),
    treeHeight: ko.observable(500),
    pipeline: ko.observableArray()
};

viewModel.outputText = ko.computed(function() {
    return viewModel.inputText();
}).extend({ throttle: 200 });

viewModel.inputOpacity = ko.computed(function() {
    return (!viewModel.inputFocused() && !viewModel.inputText()) ? 0.3 : 1;
});

viewModel.outputOpacity = ko.computed(function() {
    return (!viewModel.outputFocused() && !viewModel.outputText()) ? 0.3 : 1;
});

var stack = function(items) {
    return function(size, ctx) {
        var y = 0;
        var centreX = size.width / 2;
        items.forEach(function(item) {
            var itemSize = item({ width: size.width, height: 0 }, ctx);
            ctx.save();
            ctx.translate(centreX - (itemSize.width / 2), y);
            item(itemSize, ctx);
            ctx.restore();
        });

        var maxWidth = size.width, height = 0;
        items.forEach(function(item) {
            var itemSize = item({ width: size.width, height: 0 }, ctx);
            maxWidth = Math.max(maxWidth, itemSize.width);
            height += itemSize.height;
        });
        return { width: maxWidth, height: height };
    };
};

var textBox = function(label, background) {
    return function(size, ctx) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, size.width, size.height);
        ctx.strokeStyle = 'black';
        ctx.strokeRect(0, 0, size.width, size.height);
        ctx.fillStyle = 'black';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(label, 0, 0);
        return {
            width: ctx.measureText(label).width,
            height: 20
        };
    };
};

var arrow = function(size, ctx) {
    ctx.moveTo(5, 0);
    ctx.lineTo(5, size.height);
    return {
        width: 10, height: 32
    };
};

var intersperse = function(arr, sep) {
    var result = [];
    for (var i = 0; i < arr.length; i++) {
        if (i != 0) {
            result.push(sep);
        }
        result.push(arr[i]);
    }
    return result;
};

var flatten = function(arr) {
    var result = [];
    arr.forEach(function(item) {
        if (Array.isArray(item)) {
            item.forEach(function(subItem) {
                result.push(subItem);
            });
        } else {
            result.push(item);
        }
    });
    return result;
};

var pipeline = function(pipes) {
    return stack(intersperse(flatten([ textBox('in'),pipes, textBox('out') ]), arrow));
};

var renderer = pipeline([]);

$(function() {
    ko.applyBindings(viewModel);

    ko.computed(function() {

        var ctx = $('canvas')[0].getContext('2d');
        var size = renderer({ width: 200, height: 100 }, ctx);

        ctx.canvas.width = size.width;
        ctx.canvas.height = size.height;
        renderer(size, ctx);

    }).extend({ throttle: 10 });

});
