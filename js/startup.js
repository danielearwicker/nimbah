
commands.save = {
    execute: function() {
        location.hash = save();
    }
};

commands.new = {
    execute: function() {
        viewModel.pipeline(pipeline([]));
        location.hash = '';
    }
};


var sortedCommands = Object.keys(commands);
sortedCommands.sort();
viewModel.commands = ko.observableArray(sortedCommands.map(function(name) {
    var command = commands[name];
    if (!command.name) {
        command.name = name;
    }
    if (!command.enabled) {
        command.enabled = true;
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

if (location.hash) {
    try {
        load(location.hash.substr(1));
    } catch (x) {
        alert(x.message);
    }
} else {
    load(localStorage.getItem('savedPipeline'));
}

ko.computed(function() {
    localStorage.setItem("savedPipeline", save());
});

$(function() {
    ko.applyBindings(viewModel);
});
