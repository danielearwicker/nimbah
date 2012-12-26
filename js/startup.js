
commands.push({
    name: 'save',
    execute: function() {
        location.hash = encodeURIComponent(save());
    }
});

commands.push({
    name: 'new',
    execute: function() {
        viewModel.pipeline(pipeline([]));
        location.hash = '';
    }
});

viewModel.commands = ko.observableArray(commands.map(function(command) {
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
        load(decodeURIComponent(location.hash.substr(1)));
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
