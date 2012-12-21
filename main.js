
var stringify = function(obj) {
    return typeof obj == 'string' ? obj : JSON.stringify(obj, null, 4);
};

var viewModel = {
    inputText: ko.observable('Frogs are a diverse and largely carnivorous group of \nshort-bodied, tailless amphibians composing the order Anura \n(Ancient Greek an-, without + oura, tail).\nThe oldest fossil "proto-frog" appeared in the early Triassic of Madagascar,\n but molecular clock dating suggests their origins may extend\nfurther back to the Permian, 265 million years ago.'),
    inputFocused: ko.observable(false),
    outputFocused: ko.observable(false),
    treeWidth: ko.observable(500),
    treeHeight: ko.observable(500),
    hovers: ko.observableArray(),
    selected: ko.observable()
};

viewModel.deepestHover = ko.computed(function() {
    var candidates = viewModel.hovers();
    candidates.sort(function(a, b) {
        return a.depth() - b.depth();
    });
    return candidates[candidates.length - 1];
});

var node = function() {
    var model = {};
    model.hovering = ko.observable(false);
    model.deepestHover = ko.computed(function() {
        return viewModel.deepestHover() == model;
    });
    ko.computed(function() {
        if (model.hovering()) {
            if (viewModel.hovers.indexOf(model) == -1) {
                viewModel.hovers.push(model);
            }
        } else {
            viewModel.hovers.remove(model);
        }
    });
    model.present = ko.observable(true);
    model.presentChanged = function() {
        if (!model.present()) {
            model.remove();
        }
    };
    model.parent = ko.observable(null);
    model.depth = ko.computed(function() {
        return !model.parent() ? 0 : model.parent().depth() + 1;
    });
    model.select = function(obj, ev) {
        viewModel.selected(model);
        ev.cancelBubble = true;
    };
    model.selected = ko.computed(function() {
        return viewModel.selected() == model;
    });
    model.latestInput = ko.observable('');
    model.latestOutput = ko.observable('');
    return model;
};

var pipeline = function(saved) {
    var ops = ko.observableArray();

    var loadOperator = function(saved) {
        if (saved.name && ko.isObservable(saved.name)) {
            return saved; // already loaded
        }
        return operators[saved.name](saved);
    };

    var model = node();
    model.operators = ko.computed(function() {
        // protect from modification (a bit)
        return ops();
    });
    model.removeOperator = function(operator) {
        operator.parent(null);
        ops.remove(operator);
    };
    model.insertOperator = function(index, operator) {
        operator = loadOperator(operator);
        ops.splice(index, 0, operator);
        operator.parent(model);
    };
    model.addOperator = function(operator) {
        operator = loadOperator(operator);
        ops.push(operator);
        operator.parent(model);
    };

    if (Array.isArray(saved)) {
        saved.forEach(function(savedOp) {
            model.addOperator(savedOp);
        });
    }
    model.execute = function(value) {
        model.latestInput(stringify(value));
        ops().forEach(function(operator) {
            operator.latestInput(stringify(value));
            value = operator.execute(value);
            operator.latestOutput(stringify(value));
        });
        model.latestOutput(stringify(value));
        return value;
    };
    model.dropped = function(context, dropped) {
        model.addOperator(dropped);
    };
    model.save = function() {
        return ops().map(function(operator) {
            return operator.save();
        });
    };
    return model;
};

var operator = function(saved) {
    var model = node();
    model.name = ko.observable(saved.name);

    model.remove = function() {
        if (model.parent()) {
            model.parent().removeOperator(model);
        }
    };

    model.dropped = function(context, dropped) {
        model.parent().insertOperator(context.$index(), dropped);
    };
    model.save = function() {
        return { name: model.name() };
    };
    model.extendSave = function(handler) {
        var baseSave = model.save;
        model.save = function() {
            var saved = baseSave();
            handler(saved);
            return saved;
        };
    };
    return model;
};

var makeSettingsModel = function(saved, settings) {
    var model = operator(saved);

    if (!model.settings) {
        model.settings = [];
    }

    Object.keys(settings).forEach(function(name) {
        var setting = settings[name];
        if (!model[name]) {
            model[name] = ko.observable(name in saved ? saved[name] : settings[name].init);
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

    model.extendSave(function(saved) {
        Object.keys(settings).forEach(function(name) {
            saved[name] = model[name]();
        });
    });
    return model;
};

var operators = {};

operators.split = function(saved) {
    var model = makeSettingsModel(saved, {
       separator: { init: '\n', size: 30 }
    });
    model.execute = function(input) {
        if (input && typeof input.split == 'function') {
            return input.split(model.separator());
        }
        return input;
    };
    return model;
};

operators.join = function(saved) {
    var model = makeSettingsModel(saved, {
        separator: { init: '\n', size: 30 }
    });
    model.execute = function(input) {
        if (input && typeof input.join == 'function') {
            return input.join(model.separator());
        }
        return input;
    };
    return model;
};

operators.pick = function(saved) {
    var model = makeSettingsModel(saved, {
        item: { init: '' }
    });
    model.execute = function(input) {
        if (input) {
            return input[model.item()];
        }
        return input;
    };
    return model;
};

operators.string = function(saved) {
    var model = makeSettingsModel(saved, {
        value: { init: '' }
    });
    model.execute = function() {
        return model.value();
    };
    return model;
};

operators.trim = function(saved) {
    var model = makeSettingsModel(saved, {});
    model.execute = function(input) {
        if (input && input.trim) {
            return input.trim();
        }
        return input;
    };
    return model;
};

operators.sum = function(saved) {
    var model = makeSettingsModel(saved, {});
    model.execute = function(input) {
        if (Array.isArray(input)) {
            return input.reduce(function(l, r) {
                return l + r;
            });
        }
        return input;
    };
    return model;
};

operators.map = function(saved) {
    var data = ko.observable([]);

    var model = operator(saved);
    model.withEachItem = pipeline(saved.withEachItem);
    model.withEachItem.parent(model);
    model.position = ko.observable(0);
    model.displayPosition = ko.computed(function() {
        return model.position() + 1;
    });
    model.length = ko.computed(function() {
        return data().length;
    });

    ko.computed(function() {
        model.position(Math.min(model.position(), (data().length - 1)));
    }).extend({ throttle: 100 });

    var update = function() {
        var obj = data(), pos = model.position();
        if (obj && obj.length && (pos < obj.length)) {
            model.withEachItem.execute(obj[pos]);
        }
    };

    model.hasPrevious = ko.computed(function() {
        return model.position() > 0;
    });
    model.hasNext = ko.computed(function() {
        return model.position() < (data().length - 1);
    });
    model.previous = function(obj, ev) {
        ev.cancelBubble = true;
        if (model.hasPrevious()) {
            model.position(model.position() - 1);
            update();
        }
    };
    model.next = function(obj, ev) {
        ev.cancelBubble = true;
        if (model.hasNext()) {
            model.position(model.position() + 1);
            update();
        }
    };
    model.execute = function(input) {
        data(Array.isArray(input) ? input : []);
        if (input && typeof input.map == 'function') {
            var output = input.map(function(item) {
                return model.withEachItem.execute(item);
            });
            update();
            return output;
        }
        return input;
    };

    model.extendSave(function(saved) {
        saved.withEachItem = model.withEachItem.save();
    });

    return model;
};

operators.sequence = function(saved) {
    var model = operator(saved);

    var makeItem = function(saved) {
        var itemModel = pipeline(saved);
        itemModel.parent(model);
        itemModel.remove = function() {
            model.items.remove(itemModel);
        };
        itemModel.sequenceDropped = function(context, dropped) {
            model.items.splice(context.$index(), 0, makeItem([dropped]));
        };
        return itemModel;
    };

    model.items = ko.observableArray(saved.items ? saved.items.map(makeItem) : []);
    model.execute = function(input) {
        return model.items().map(function(itemPipeline) {
            return itemPipeline.execute(input);
        });
    };
    model.sequenceDropped = function(context, dropped) {
        model.items.push(makeItem([dropped]));
    };
    model.extendSave(function(saved) {
        saved.items = model.items().map(function(item) {
            return item.save();
        });
    });

    return model;
};

var saved = localStorage.getItem('savedPipeline');
try {
    saved = JSON.parse(saved);
} catch (x) {
    saved = [];
}

viewModel.pipeline = pipeline(saved);

ko.computed(function() {
    localStorage.setItem("savedPipeline", stringify(viewModel.pipeline.save()));
});

viewModel.outputText = ko.computed(function() {
    return stringify(viewModel.pipeline.execute(viewModel.inputText()));
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
        create: function() {
            return { name: name };
        }
    };
}));

$(function() {
    ko.applyBindings(viewModel);
});
