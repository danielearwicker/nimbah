var ignoreNextChange = true;

(function() {

    var undoStack = ko.observableArray(), redoStack = ko.observableArray();

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

    commands.push({
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
    });

    commands.push({
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
    });

})();