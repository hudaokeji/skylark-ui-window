(function($) {
    'use strict';
    var win,
        testing_options = {
            template: $('#template').html(),
            title: "Basic Window",
            bodyContent: "<p>One fine body...</p>",
            footerContent: '<button type="button" class="btn btn-default" data-dismiss="window">Close</button><button type="button" class="btn btn-primary">Save changes</button>'
        };

    module("Basic Window Tests");
    QUnit.test('Class Test', function() {
        expect(1);
        ok(!!Window, 'Window class exists');
    });
    QUnit.test('Can instantiate Window class', function() {
        expect(1);
        win = new Window({
            template: "empty"
        });
        ok(win instanceof Window, "Window instantiates properly");
    });

    module("Method tests", {
        setup: function() {
            win = new Window(testing_options);
        },
        teardown: function() {
            win.close();
            win = null;
        }
    });
    QUnit.test('getElement', function() {
        expect(2);
        ok(win instanceof Window, "Window instantiated properly");
        ok(win.getElement() instanceof jQuery, "getElement() returns the jQuery object");
    });

    QUnit.test('setSticky', function() {
        ok(typeof win.options.sticky === "undefined", "sticky mode not set by default");
        win.setSticky(true);
        ok(win.options.sticky === true, "setSticky() properly sets sticky mode: true");
        ok(win.getElement().css('position') === 'fixed', 'getSticky() properly sets css attribute: true');
        win.setSticky(false);
        ok(win.options.sticky === false, "setSticky() properly sets sticky mode: false");
        ok(win.getElement().css('position') === 'absolute', 'getSticky() properly sets css attribute: false');
    });

    QUnit.test('getSticky', function() {
        ok(typeof win.getSticky() === "undefined", "sticky mode not set by default");
        win.setSticky(true);
        ok(win.getSticky() === true, "getSticky() properly retrieves sticky mode: true");

        win.setSticky(false);
        ok(win.getSticky() === false, "getSticky() properly retrieves sticky mode: false");
    });

    QUnit.test('setEffect', function() {
        ok(win.options.effect === "fade", "effect mode set to 'fade' by default");
        ok(typeof win.setEffect === "function", "setEffect method exists");
        win.setEffect('none');
        ok(win.options.effect === "none", "setEffect call to set effect to 'none'");
    });

    QUnit.test('getEffect', function() {
        ok(win.options.effect === "fade", "effect mode set to 'fade' by default");
        ok(typeof win.getEffect === "function", "getEffect method exists");
        win.options.effect = 'none';
        ok(win.getEffect() === 'none', 'getEffect call retrieves proper value');
    });

    QUnit.test('callBacks (fade effect)', function(assert) {
        var done = assert.async();
        assert.expect(2);
        win.show(function() {
            ok(true, "show callback fires properly using fade effect");
        });

        win.close(function() {
            ok(true, "close callback fires properly using fade effect");
        });

        setTimeout(function() {
            done();
        }, 2000);
    });

    QUnit.test('callBacks (no effect)', function(assert) {
        var done = assert.async();
        assert.expect(2);
        win.options.effect = 'none';
        win.show(function() {
            ok(true, "show callback fires properly no effect");
        });

        win.close(function() {
            ok(true, "close callback fires properly using no effect");
        });
        setTimeout(function() {
            done();
        }, 2000);
    });


    QUnit.test('eventTriggers (fade effect)', function(assert) {
        var done = assert.async();
        assert.expect(4);
        win.on('bsw.show', function() {
            ok(true, "show trigger fires properly");
        });


        win.on('bsw.maximize', function() {
            ok(true, "maximize trigger fires properly");
        });
        win.maximize();

        win.on('bsw.restore', function() {
            ok(true, "restore trigger fires properly");
        });
        win.restore();

        win.on('bsw.close', function() {
            ok(true, "close trigger fires properly");
        });
        win.close();


        setTimeout(function() {
            done();
        }, 2000);
    });


QUnit.test('eventTriggers (no effect)', function(assert) {
        var done = assert.async();
        assert.expect(4);
        win.options.effect = "none";
        win.on('bsw.show', function() {
            ok(true, "show trigger fires properly");
        });
        win.show();


        win.on('bsw.maximize', function() {
            ok(true, "maximize trigger fires properly");
        });
        win.maximize();

        win.on('bsw.restore', function() {
            ok(true, "restore trigger fires properly");
        });
        win.restore();

        win.on('bsw.close', function() {
            ok(true, "close trigger fires properly");
        });
        win.close();


        setTimeout(function() {
            done();
        }, 2000);
    });


}(jQuery));
