(function ($) {

    var 
        wm = new skylarkjs.ui.sbswt.WindowManager({
        container: "#windowPane",
        windowTemplate: skylarkjs.langx.trim($('#basic_window_template').html())
    });
    window.wm = wm;
    var basic_counter = 0,
        table_counter = 0,
        form_counter = 0,
        parent_counter = 0,
        child_counter = 0,
        maximizable_counter = 0;
    
    $('.new_basic').on('click', function (event) {
        event.preventDefault();
        basic_counter++;
        wm.createWindow({
            title: "Basic Window #" + basic_counter,
            bodyContent: "<p>One fine body...</p>",
            footerContent: '<button type="button" class="btn btn-default" data-dismiss="window">Close</button><button type="button" class="btn btn-primary">Save changes</button>'
        });
    });
    $('.new_table').on('click', function (event) {
        event.preventDefault();
        table_counter++;
        wm.createWindow({
            title: "Table Window #" + table_counter,
            bodyContent: skylarkjs.langx.trim($('#table_window_template').html()),
            footerContent: '<button type="button" class="btn btn-default" data-dismiss="window">Close</button><button type="button" class="btn btn-primary">Save changes</button>'
        });
    });
    $('.new_parent').on('click', function (event) {
        event.preventDefault();
        parent_counter++;
        var parent = wm.createWindow({
            title: "Parent Window #" + parent_counter,
            bodyContent: skylarkjs.langx.trim($('#parent_window_body').html()),
            footerContent: '<button type="button" class="btn btn-default" data-dismiss="window">Close</button><button type="button" class="btn btn-primary">Save changes</button>'
        });
        $('pre code').each(function(i, e) {hljs.highlightBlock(e)});
        parent.getElement().find('.new_child').on('click', function (event) {
            event.preventDefault();
            child_counter++;
            var child = wm.createWindow({
                title: "Child Window #" + child_counter,
                bodyContent: "<p>One fine body...</p>",
                footerContent: '<button type="button" class="btn btn-default" data-dismiss="window">Close</button><button type="button" class="btn btn-primary">Save changes</button>'
            });
            parent.setBlocker(child);
        });
    });
    $('.new_form').on('click', function (event) {
        event.preventDefault();
        form_counter++;
        wm.createWindow({
            title: "Form Window #" + form_counter,
            bodyContent: skylarkjs.langx.trim($('#form_window_template').html()),
            footerContent: '<button type="button" class="btn btn-default" data-dismiss="window">Close</button><button type="button" class="btn btn-primary">Submit</button>'
        });
    });
    $('.new_maximizable').on('click', function (event) {
        event.preventDefault();
        maximizable_counter++;
        wm.createWindow({
            title: "Maximizable Window #" + maximizable_counter,
            bodyContent: "<p>One fine body...</p>",
            footerContent: '<button type="button" class="btn btn-default" data-dismiss="window">Close</button><button type="button" class="btn btn-primary">Submit</button>',
            maximizable: true
        });
    });

}(skylarkjs.query));