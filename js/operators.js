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

operators.join = function(saved) {
    var model = makeSettingsModel(saved, {
        separator: { init: '\n', size: 30 }
    });
    model.outputValue = ko.computed(function() {
        var input = model.inputValue();
        if (input && typeof input.join == 'function') {
            return input.join(model.separator());
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
        expression: { type: 'string', init: '', size: 120 }
    };
    var model = makeSettingsModel(saved, settings);
    var func = ko.computed(function() {
        try {
            var f = Function('context', 'with(context) { return ' + model.expression() + ' }');
            settings.expression.errorMessage('');
            return f;
        } catch(x) {
            settings.expression.errorMessage(x.message);
        }
    });
    model.outputValue = ko.computed(function() {
        var input = model.inputValue();
        try {
            return func().call(input, input);
        } catch(x) {
            return x.message;
        }
    });
    return model;
};

operators.sum = function(saved) {
    var model = makeSettingsModel(saved, {});
    model.outputValue = ko.computed(function() {
        var input = model.inputValue();
        if (Array.isArray(input)) {
            return input.reduce(function(l, r) {
                return l + r;
            });
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
    var model = makeSettingsModel(saved, {});

    var recurseNode = function(nodes) {
        var ar = [];
        nodes.each(function() {
            var node = $(this);
            var obj = {
                tag: node[0].tagName.toLowerCase()
            };
            var ch = recurseNode(node.children());
            if (ch.length) {
                obj.children = ch;
            }
            var attr = node[0].attributes;
            if (attr && attr.length) {
                var attrObj = obj['attributes'] = {};
                for (var i = 0; i < attr.length; i++) {
                    attrObj[attr[i].name] = attr[i].value;
                }
            }
            var text = [];
            var ch = node[0].childNodes;
            for (var n = 0; n < ch.length; n++) {
                if (ch[n].nodeType == 3) {
                    text.push(ch[n].nodeValue);
                }
            }
            if (text.length) {
                obj.text = text.join('');
            }
            ar.push(obj);
        });
        return ar;
    };

    model.outputValue = ko.computed(function() {
        var input = model.inputValue();
        if (typeof input == 'string') {
            var dom = $('<div></div>');
            dom.html(input);
            return recurseNode(dom.children());
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
            itemModel.previousSibling(makeItem([dropped]));
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
        model.lastChild(makeItem([dropped]));
    };
    model.extendSave(function(saved) {
        saved.items = model.readOnlyChildren().map(function(item) {
            return item.save();
        });
    });

    return model;
};

