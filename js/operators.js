operators.split = function(saved) {
    var model = makeSettingsModel(saved, {
       separator: { init: '\n', size: 30 }
    });
    model.outputValue = ko.computed(function() {
        var input = model.inputValue();
        if (input && typeof input.split == 'function') {
            return input.split(model.separator());
        }
        return input;
    });
    return model;
};

operators.flatten = function(saved) {
    var model = makeSettingsModel(saved, {});
    model.outputValue = ko.computed(function() {
        var input = model.inputValue();
        if (Array.isArray(input)) {
            var combined = [];
            input.forEach(function(ar) {
                if (Array.isArray(ar)) {
                    combined = combined.concat(ar);
                } else {
                    combined.push(ar);
                }
            });
            return combined;
        }
        return input;
    });
    return model;
};

operators.pick = function(saved) {
    var settings = {
        item: { init: null, type: 'options' }
    };

    var model = makeSettingsModel(saved, settings);

    settings.item.options = ko.computed(function() {
        var input = model.inputValue();
        var keys = [], item = model.item();
        if (input && (typeof input == 'object')) {
            keys = Object.keys(input);
        }
        if (item) {
            if (keys.indexOf(item) == -1) {
                keys.push(item);
            }
        }
        return keys;
    });

    model.outputValue = ko.computed(function() {
        var input = model.inputValue();
        if (input) {
            return input[model.item()];
        }
        return input;
    });
    return model;
};

operators.constant = function(saved) {
    var model = makeSettingsModel(saved, {
        value: { init: '' }
    });
    model.outputValue = ko.computed(function() {
        return model.value();
    });
    return model;
};

operators.trim = function(saved) {
    var model = makeSettingsModel(saved, {});
    model.outputValue = ko.computed(function() {
        var input = model.inputValue();
        if (input && input.trim) {
            return input.trim();
        }
        return input;
    });
    return model;
};

operators.equals = function(saved) {
    var model = makeSettingsModel(saved, {
        value: { init: '', size: 120 }
    });
    model.outputValue = ko.computed(function() {
        return model.inputValue() == model.value();
    });
    return model;
};

operators.js = function(saved) {
    var settings = {
        expression: { type: 'js', args: ['context'], init: 'context', size: 120 }
    };
    var model = makeSettingsModel(saved, settings);

    model.outputValue = ko.computed(function() {
        var input = model.inputValue();
        try {
            return settings.expression.evaluate().call(input, input);
        } catch(x) {
            return x.message;
        }
    });
    return model;
};

operators.reduce = function(saved) {
    var settings = {
        expression: { type: 'js', args: ['l', 'r' ], init: 'l + r', size: 120 }
    };
    var model = makeSettingsModel(saved, settings);
    model.outputValue = ko.computed(function() {
        var input = model.inputValue();
        try {
            if (Array.isArray(input) && input.length != 0) {
                return input.reduce(settings.expression.evaluate());
            }
        } catch(x) {
            return x.message;
        }
        return input;
    });
    return model;
};

operators.reverse = function(saved) {
    var model = makeSettingsModel(saved, {});
    model.outputValue = ko.computed(function() {
        var input = model.inputValue();
        if (Array.isArray(input)) {
            var output = input.slice(0);
            output.reverse();
            return output;
        }
        return input;
    });
    return model;
};

operators.html = function(saved) {
    var model = makeSettingsModel(saved, {
        tag: { type: 'string', init: 'tr', size: 100 },
        fetch: { init: 'innerHTML', type: 'options', options: [ 'innerHTML', 'outerHTML', 'innerText'] }
    });

    var forEachTag = function(node, name, func) {
        if (node.nodeType == 1 && node.nodeName == name) {
            func(node);
        } else {
            for (var c = node.firstChild; !!c; c = c.nextSibling) {
                forEachTag(c, name, func);
            }
        }
    };

    model.outputValue = ko.computed(function() {
        var input = model.inputValue();
        var fetch = model.fetch() || 'innerHTML';
        var tag = model.tag().toUpperCase();
        if (typeof input == 'string') {
            var dom = $('<div></div>');
            dom.html(input);
            var tags = [];
            forEachTag(dom[0], tag, function(found) {
                tags.push(found[fetch]);
            });
            return tags;
        }
        return input;
    });
    return model;
};

operators.map = function(saved) {
    var model = dataNavigator(saved);
    model.outputValue = ko.computed(function() {
        return model.inputArray().map(model.evaluate);
    });
    return model;
};

operators.filter = function(saved) {
    var model = dataNavigator(saved);
    model.outputValue = ko.computed(function() {
        return model.inputArray().filter(model.evaluate);
    });
    return model;
};

operators.sequence = function(saved) {
    var model = operator(saved);

    var makeItem = function(saved) {
        var itemModel = pipeline(saved);
        itemModel.sequenceDropped = function(context, dropped) {
            dropDialog(dropped, function(saved) {
                itemModel.previousSibling(makeItem([saved]));
            });
        };
        return itemModel;
    };

    if (Array.isArray(saved.items)) {
        saved.items.forEach(function(savedItem) {
            model.lastChild(makeItem(savedItem));
        });
    }

    model.outputValue = ko.computed(function() {
        var input = model.inputValue();
        var output = [];
        model.readOnlyChildren().forEach(function(item) {
            item.inputValue(input);
            output.push(item.outputValue());
        });
        return output;
    });

    model.sequenceDropped = function(context, dropped) {
        dropDialog(dropped, function(saved) {
            model.lastChild(makeItem([saved]));
        });
    };
    model.extendSave(function(saved) {
        saved.items = model.readOnlyChildren().map(function(item) {
            return item.save();
        });
    });

    return model;
};

