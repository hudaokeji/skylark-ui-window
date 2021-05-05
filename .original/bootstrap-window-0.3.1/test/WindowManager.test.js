(function($) {
    'use strict';
    var wm,
        testing_options = {
            container: "#windowPane",
            windowTemplate: $('#template').html()
        };

    module("Basic WindowManager Tests");
    QUnit.test('Class Test', function() {
        expect(1);
        ok(!!WindowManager, 'WindowManager class exists');
    });
    QUnit.test('Can instantiate WindowManager class', function() {
        expect(1);

        var wm = new WindowManager(testing_options);
        ok(wm instanceof WindowManager, "Window instantiates properly");
    });

    module("Method tests", {
        setup: function() {
            wm = new WindowManager(testing_options);
        },
        teardown: function() {
            wm = null;
        }
    });

    QUnit.test('test window management', function() {
        var win = wm.createWindow({
            title: "Test Window",
            bodyContent: $('#table_window_template').html(),
            footerContent: '<button type="button" class="btn btn-default" data-dismiss="window">Close</button><button type="button" class="btn btn-primary">Save changes</button>'
        });
        var win2 = wm.createWindow({
            title: "Test Window",
            bodyContent: $('#table_window_template').html(),
            footerContent: '<button type="button" class="btn btn-default" data-dismiss="window">Close</button><button type="button" class="btn btn-primary">Save changes</button>'
        });
        ok(win instanceof Window, 'window created successfully');
        wm.sendToBack(win2);
        ok(wm.windows.indexOf(win2) === 0, 'sendToBack sends window to beginning of stack');


        ok(wm.destroyWindow(win) === true, 'window destroyed successfully');
        ok(wm.closeWindow(win2) === true, 'window closed successfully');
    });

}(jQuery));
