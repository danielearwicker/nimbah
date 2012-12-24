
var viewModel = {
    inputText: ko.observable(localStorage.getItem('savedInputText') || ''),
    inputFocused: ko.observable(false),
    outputFocused: ko.observable(false),
    treeWidth: ko.observable(500),
    treeHeight: ko.observable(500),
    hovers: ko.observableArray(),
    selected: ko.observable(),
    stringify: function(obj) {
        return typeof obj == 'string' ? obj : JSON.stringify(obj);
    },
    pipeline: ko.observable(null)
};

ko.computed(function() {
    localStorage.setItem('savedInputText', viewModel.inputText());
}).extend({ throttle: 200 });

viewModel.formatData = function(data) {
    if (data && typeof data == 'object') {
        return {
            text: '',
            fields: Object.keys(data).map(function(key) {
                return {
                    name: key,
                    value: viewModel.stringify(data[key]),
                    pick: function() {
                        return { name: 'pick', item: key };
                    }
                };
            })
        }
    }
    return {
        text: viewModel.stringify(data),
        fields: []
    };
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
            if (viewModel.selected() == model) {
                viewModel.selected(null);
            }
            model.remove();
        }
    };
    model.parent = ko.observable(null);
    model.depth = ko.computed(function() {
        return !model.parent() ? 0 : model.parent().depth() + 1;
    });
    model.select = function(obj, ev) {
        if (model.parent()) {
            viewModel.selected(model);
            ev.cancelBubble = true;
        }
    };
    model.selected = ko.computed(function() {
        return viewModel.selected() == model;
    });
    model.latestInput = ko.observable(null);
    model.latestOutput = ko.observable(null);
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
    model.execute = function(value, depth) {
        model.latestInput(value);
        ops().forEach(function(operator) {
            operator.latestInput(value);
            value = operator.execute(value, depth + 1);
            operator.latestOutput(value);

            var log = [];
            for (var i = 0; i < depth; i++) {
                log.push('    ');
            }
            log.push(JSON.stringify(operator.latestInput()));
            log.push(' -> ');
            log.push(JSON.stringify(operator.latestOutput()));
            console.log(log.join(''));
        });
        model.latestOutput(value);
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
    model.name = saved.name;
    model.template = saved.name;

    model.remove = function() {
        if (model.parent()) {
            model.parent().removeOperator(model);
        }
    };

    model.dropped = function(context, dropped) {
        model.parent().insertOperator(context.$index(), dropped);
    };
    model.save = function() {
        return { name: ko.utils.unwrapObservable(model.name) };
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

    model.template = 'settings';

    if (!model.settings) {
        model.settings = [];
    }

    Object.keys(settings).forEach(function(name) {
        var setting = settings[name];
        if (!model[name]) {
            model[name] = ko.observable(name in saved ? saved[name] : settings[name].init);
        }

        var invalid;

        setting.type = setting.type || 'any';
        setting.size = setting.size || 100;
        setting.value = model[name];
        setting.errorMessage = ko.observable('');
        setting.hasError = ko.computed(function() {
            return !!setting.errorMessage();
        });

        setting.valueAsJson = ko.computed({
            read: function() {
                if (setting.errorMessage()) {
                    return invalid;
                }
                return JSON.stringify(setting.value());
            },
            write: function(val) {
                try {
                    setting.value(JSON.parse(val));
                    setting.errorMessage('');
                } catch (x) {
                    invalid = val;
                    setting.errorMessage(x.message);
                }
            }
        });

        model.settings.push(setting);
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
    var settings = {
        item: { init: null, type: 'options' }
    };

    var model = makeSettingsModel(saved, settings);

    settings.item.options = ko.computed(function() {
        var input = model.latestInput();
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

operators.equals = function(saved) {
    var model = makeSettingsModel(saved, {
        value: { init: '', size: 120 }
    });
    model.execute = function(input) {
        return input == model.value();
    };
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
    model.execute = function(input) {
        try {
            return func().call(input, input);
        } catch(x) {
            return x.message;
        }
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
            ar.push(obj);
        });
        return ar;
    };

    model.execute = function(input) {
        if (typeof input == 'string') {
            var dom = $('<div></div>');
            dom.html(input);
            return recurseNode(dom.children());
        }
        return input;
    };
    return model;
};

var dataNavigator = function(saved) {
    var data = ko.observable([]);

    var model = operator(saved);
    model.template = 'dataNavigator';
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
        model.position(
            Math.max(0, Math.min(model.position(), (data().length - 1)))
        );
    }).extend({ throttle: 100 });

    model.update = function() {
        var obj = data(), pos = model.position();
        if (obj && obj.length && (pos < obj.length)) {
            console.log('started updating data navigator');
            model.withEachItem.execute(obj[pos], 0);
            console.log('finished updating data navigator');
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
            model.update();
        }
    };
    model.next = function(obj, ev) {
        ev.cancelBubble = true;
        if (model.hasNext()) {
            model.position(model.position() + 1);
            model.update();
        }
    };

    model.extendSave(function(saved) {
        saved.withEachItem = model.withEachItem.save();
    });

    model.execute = function(input, depth) {
        data(Array.isArray(input) ? input : []);
        if (input && typeof input.filter == 'function') {
            var output = model.executeArray(input, depth);
            model.update();
            return output;
        }
        return input;
    };

    return model;
};

operators.map = function(saved) {
    var model = dataNavigator(saved);
    model.executeArray = function(input, depth) {
        return input.map(function(item) {
            return model.withEachItem.execute(item, depth);
        });
    };

    return model;
};

operators.filter = function(saved) {
    var model = dataNavigator(saved);
    model.executeArray = function(input, depth) {
        return input.filter(function(item) {
            return model.withEachItem.execute(item, depth);
        });
    };
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
    model.execute = function(input, depth) {
        return model.items().map(function(itemPipeline) {
            return itemPipeline.execute(input, depth);
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

var load = function(source) {
    try {
        viewModel.pipeline(pipeline(JSON.parse(source)));
    } catch (x) {
        if (!viewModel.pipeline()) {
            viewModel.pipeline(pipeline([]));
        }
    }
};

var save = function() {
    return viewModel.pipeline() ? JSON.stringify(viewModel.pipeline().save()) : [];
};

viewModel.outputText = ko.computed(function() {
    return viewModel.pipeline() ? stringify(viewModel.pipeline().execute(viewModel.inputText(), 0)) : '';
});

viewModel.inputOpacity = ko.computed(function() {
    return (!viewModel.inputFocused() && !viewModel.inputText()) ? 0.3 : 1;
});

viewModel.outputOpacity = ko.computed(function() {
    return (!viewModel.outputFocused() && !viewModel.outputText()) ? 0.3 : 1;
});

var commands = {};

var undoStack = ko.observableArray(), redoStack = ko.observableArray();

var ignoreNextChange = true;

var oldSave = [];

ko.computed(function() {
    var currentSave = oldSave;
    oldSave = save();
    if (ignoreNextChange) {
        ignoreNextChange = false;
    } else {
        redoStack.removeAll();
        undoStack.push(currentSave);
    }
}).extend({ throttle: 200 });

commands.undo = {
    execute: function() {
        var popped = undoStack.pop();
        if (popped) {
            redoStack.push(save());
            ignoreNextChange = true;
            load(popped);
        }
    },
    name: ko.computed(function() {
        return 'undo (' + undoStack().length + ')'
    }),
    enabled: ko.computed(function() {
        return undoStack().length != 0;
    })
};

commands.redo = {
    execute: function() {
        var popped = redoStack.pop();
        if (popped) {
            undoStack.push(save());
            ignoreNextChange = true;
            load(popped);
        }
    },
    name: ko.computed(function() {
        return 'redo (' + redoStack().length + ')'
    }),
    enabled: ko.computed(function() {
        return redoStack().length != 0;
    })
};

var sortedCommands = Object.keys(commands);
sortedCommands.sort();
viewModel.commands = ko.observableArray(sortedCommands.map(function(name) {
    var command = commands[name];
    if (!command.name) {
        command.name = name;
    }
    return command;
}));

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

ignoreNextChange = true;
load(localStorage.getItem('savedPipeline'));

ko.computed(function() {
    localStorage.setItem("savedPipeline", save());
});

$(function() {
    ko.applyBindings(viewModel);
});
