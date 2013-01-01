
commands.push({
    name: 'save',
    execute: function() {

        var vm = {
            name: ko.observable(viewModel.saveName()),
            existingNames: []
        };

        var dlg = $('<table><tr><td>Name</td><td><input data-bind="value: name, autocomplete: existingNames"></td></tr></table>');
        dlg.dialog({
            width: 440,
            title: 'Save',
            modal: true,
            autoOpen: true,
            close: function() {
                dlg.remove();
            },
            buttons: [{
                text: 'OK',
                click: function() {
                    $.ajax({
                        type: 'POST',
                        url: 'users/' + viewModel.currentUserId() + '/saved/' + vm.name(),
                        dataType: 'json',
                        data: save()
                    }).then(function() {
                        viewModel.saveName(vm.name());
                    }, function() {
                        alert('Couldn\'t save for some reason');
                    });
                    dlg.dialog('close');
                }
            }, {
                text: 'Cancel',
                click: function() {
                    dlg.dialog('close');
                }
            }]
        });

        ko.applyBindings(vm, dlg[0]);
    }
});

commands.push({
    name: 'new',
    execute: function() {
        viewModel.pipeline(pipeline([]));
        location.hash = '';
    }
});

var config;
$.get('config').done(function(c) {
    config = c;
});

commands.push({
    name: ko.computed(function() {
        return viewModel.currentUserId() ? 'log off' : 'log on';
    }),
    execute: function() {
        if (viewModel.currentUserId()) {
            viewModel.currentUserId(null);
        } else {
            if (config.live) {
                var frame = $('<iframe src="logon.html" width="100%" height="100%" border="0" frameborder="0"></div>');
                var dlg = $('<div style="position: relative; overflow: hidden;"></div>');
                dlg.append(frame);
                dlg.dialog({
                    width: 440,
                    height: 300,
                    title: 'Logon',
                    modal: true,
                    autoOpen: true,
                    close: function() {
                        viewModel.logonDialog(null);
                        dlg.remove();
                    },
                    buttons: [{
                        text: 'Cancel',
                        click: function() {
                            dlg.dialog('close');
                        }
                    }]
                });
                viewModel.logonDialog({
                    finish: function(userId) {
                        viewModel.currentUserId(userId);
                        dlg.dialog('close');
                    }
                });
            } else {
                viewModel.currentUserId('httpZ58ZZ47ZZ47Ztwitter.comZ47ZaccountZ47ZprofileZ63Zuser_idZ61Z132106170');
            }
        }
    }
});

viewModel.currentUserInfo = ko.computed(function() {
    return viewModel.currentUserId() ?
        $.get('users/' + viewModel.currentUserId()) : null;
}).extend({ async: null });

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
