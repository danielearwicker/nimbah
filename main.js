
var viewModel = {
    inputText: ko.observable(''),
    inputFocused: ko.observable(false),
    outputFocused: ko.observable(false),
    treeWidth: ko.observable(500),
    treeHeight: ko.observable(500)
};

var pipeline = function(operators) {
    return ko.observableArray(operators);
};

var executePipeline = function(operators, value) {
    operators.forEach(function(operator) {
        value = operator.execute(value);
    });
    return value;
};

var makeSettingsModel = function(name, model, settings) {
    model.name = ko.observable(name);

    if (!model.settings) {
        model.settings = [];
    }

    Object.keys(settings).forEach(function(name) {
        var setting = settings[name];
        if (!model[name]) {
            model[name] = ko.observable(setting.init);
        }

        var error = ko.observable('');
        var invalid;

        model.settings.push({
            name: name,
            size: setting.size || 100,
            value: ko.computed({
                read: function() {
                    if (error()) {
                        return invalid;
                    }
                    return JSON.stringify(model[name]());
                },
                write: function(val) {
                    try {
                        model[name](JSON.parse(val));
                        error('');
                    } catch (x) {
                        invalid = val;
                        error(x.message);
                    }
                }
            }),
            errorMessage: error,
            hasError: ko.computed(function() {
                return !!error();
            })
        });
    });

    return model;
};

var operators = {};

operators.split = function(separator) {
    var model = makeSettingsModel('split', {}, {
       separator: { init: separator || '', size: 30 }
    });
    model.execute = function(input) {
        if (input && typeof input.split == 'function') {
            return input.split(model.separator());
        }
        return input;
    };
    return model;
};

operators.join = function(separator) {
    var model = makeSettingsModel('join', {}, {
        separator: { init: separator || '', size: 30 }
    });
    model.execute = function(input) {
        if (input && typeof input.join == 'function') {
            return input.join(model.separator());
        }
        return input;
    };
    return model;
};

operators.pick = function(item) {
    if (arguments.length === 0) {
        item = '';
    }
    var model = makeSettingsModel('pick', {}, {
        item: { init: item }
    });
    model.execute = function(input) {
        if (input) {
            return input[model.item()];
        }
        return input;
    };
    return model;
};

operators.string = function(val) {
    var model = makeSettingsModel('string', {}, {
        value: { init: val || '' }
    });
    model.execute = function(input) {
        return model.value();
    };
    return model;
};

operators.map = function(withEachItem) {
    var data = ko.observable([]);
    var model = {
        name: ko.observable('map'),
        withEachItem: pipeline(withEachItem || []),
        position: ko.observable(0)
    };
    model.displayPosition = ko.computed(function() {
        return model.position() + 1;
    });
    model.length = ko.computed(function() {
        return data().length;
    })
    model.hasPrevious = ko.computed(function() {
        return model.position() > 0;
    });
    model.hasNext = ko.computed(function() {
        return model.position() < (data().length - 1);
    });
    model.previous = function() {
        if (model.hasPrevious()) {
            model.position(model.position() - 1);
        }
    };
    model.next = function() {
        if (model.hasNext()) {
            model.position(model.position() + 1);
        }
    };

    model.execute = function(input) {
        if (Array.isArray(input)) {
            model.position(Math.min(model.position(), (input.length - 1)));
            data(input);
        }
        if (input && typeof input.map == 'function') {
            return input.map(function(item) {
                return executePipeline(model.withEachItem(), item);
            });
        }
        return input;
    };
    return model;
};

operators.sequence = function(items) {
    var model = {
        name: ko.observable('sequence'),
        items: ko.observableArray(items ? items.map(function(itemObservables) {
            if (ko.isObservable(itemObservables)) {
                return itemObservables;
            }
            if (Array.isArray(itemObservables)) {
                return ko.observableArray(itemObservables);
            }
            return ko.observableArray([itemObservables]);
        }) : [])
    };
    model.execute = function(input) {
        return model.items().map(function(itemPipeline) {
            return executePipeline(itemPipeline(), input);
        });
    };
    return model;
};

viewModel.pipeline = pipeline([
    operators.split('\n'),
    operators.map([
        operators.split(' '),
        operators.sequence([
            [ operators.string('First: ') ],
            [ operators.pick(0) ],
            [ operators.string(', Second: ') ],
            [ operators.pick(1) ]
        ]),
        operators.join('')
    ]),
    operators.join('\n')
]);

viewModel.outputText = ko.computed(function() {
    var output = executePipeline(viewModel.pipeline(), viewModel.inputText());
    return (typeof output == 'string') ? output : JSON.stringify(output, null, 4);
}).extend({ throttle: 200 });

viewModel.inputOpacity = ko.computed(function() {
    return (!viewModel.inputFocused() && !viewModel.inputText()) ? 0.3 : 1;
});

viewModel.outputOpacity = ko.computed(function() {
    return (!viewModel.outputFocused() && !viewModel.outputText()) ? 0.3 : 1;
});

var sortedOperators = Object.keys(operators);
sortedOperators.sort();

viewModel.operators = ko.observableArray(sortedOperators.map(function(name) {
    return {
        name: name,
        create: operators[name]
    };
}));

$(function() {
    ko.applyBindings(viewModel);
});
