class DragNDropAPI {
    nodes = {}; // Keeps track of all the nodes that exist
    connections = {}; // Keeps track of all the connections that exist

    node_editor; // Keeps track of the div with the nodes in it
    connection_editor; // Keeps track of the svg with the connections in it

    constructor() {
        this.node_editor = $('div.nodes');
        this.connection_editor = document.getElementsByClassName('connections')[0];
    }

    add_block(header, main, inputs, outputs, id = null, spawn_x = null, spawn_y = null) {
        id = this.get_unique_id(id);

        let html = '<div class="block" id="' + id + '">'; // Starts the html collection

        if (inputs.length > 0) { // Adds the inputs to the html
            html += '<div class="block_io incoming">';
            for (let i = 0; i < inputs.length; i++) {
                html += '<div class="block_dot"><div class="hitbox"></div><div class="label">';
                html += inputs[i];
                html += '</div></div>';
            }
            html += '</div>';
        }

        html += '<div class="block_body"><div class="block_header">';
        html += header;
        html += '</div><div class="block_main">';
        html += main;
        html += '</div></div>';

        if (outputs.length > 0) { // Adds the Outputs to the html
            html += '<div class="block_io outgoing">';
            for (let i = 0; i < outputs.length; i++) {
                html += '<div class="block_dot"><div class="label">';
                html += outputs[i];
                html += '</div></div>';
            }
            html += '</div>';
        }

        html += '</div>';

        let node = $(html);
        this.node_editor.append(node);

        this.update_position(node, spawn_x, spawn_y);

        let drag = new DragElement(this, node, inputs, outputs);
        this.nodes[id] = drag;

        node.find('div.incoming').on('dblclick', 'div.block_dot', {drag_elem: drag}, function (e) {
            e.data.drag_elem.remove_incoming($(this).find('div.label').text());
        });
    }

    update_position (node, x = null, y = null) {
        if (x === null || y === null) {
            node.css('left', (((window.innerWidth / 2) + $(document).scrollLeft()) - (node.width() / 2)) + "px");
            node.css('top', (((window.innerHeight / 2) + $(document).scrollTop()) - (node.height() / 2)) + "px");
        }

        node.css('left', x + "px");
        node.css('top', y + "px");
    }

    get_block (id) { // Returns the Block Object
        if (id in this.nodes) {
            return this.nodes[id];
        }
        return undefined;
    }

    get_connection (id) { // Returns the Connection
        if (id in this.connections) {
            return this.connections[id];
        }
        return undefined;
    }

    add_line(start_node) { // Create new Line and give it back to the Drag-Object
        let path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'gray');
        this.connection_editor.appendChild(path);

        return new Connection(this, start_node, path);
    }

    get_unique_id (id = null) { // Generate new ID
        while ((id == null || id in this.nodes) || id in this.connections) { // Creates a new ID if no ID is given or already exists
            id = Math.random().toString(16).slice(2);
        }

        return id;
    }

    finalize_line(start_node, target, line, start_dot_name) { // Finalizes the line and linking it everywhere it's relevant
        if (target.hasClass('hitbox')) { // Check if target is a hitbox
            let end_node = this.get_block(target.closest('div.block').attr('id')); // Get the end node

            if(end_node.id !== start_node.id) { // Check that you are not connecting a node to itself
                let dot = target.closest('div.block_dot'); // Snap to the ending dot
                let offset = dot.offset();
                let snap_x = offset.left + (dot.outerWidth()/2);
                let snap_y = offset.top + (dot.outerHeight()/2);
                let end_dot_name = dot.find('div.label').text();
                let line_id = this.get_unique_id();

                // =============================================================
                // +++++ Remove this to have multiple inputs for an output +++++
                // =============================================================
                if (end_node.incoming[end_dot_name].length > 0) { // Removes any inputs that are already connected
                    for (let connection of end_node.incoming[end_dot_name]) {
                        this.remove_line(connection.line);
                    }
                }
                // =============================================================

                line.finalize(end_node, line_id, start_dot_name, end_dot_name);
                line.change_color('black');
                line.update_end(snap_x, snap_y);

                start_node.outgoing[start_dot_name].push({ // Adds information to the starting node
                    line: line,
                    end_node: end_node
                });

                end_node.incoming[end_dot_name].push({ // Adds information to the ending node
                    line: line,
                    start_node: start_node
                })

                this.connections[line_id] = { // Adds information to the API
                    line: line,
                    start_node: start_node,
                    end_node: end_node
                }

                line.update();
                return;
            }
        }
        line.commit_sodoku(); // Commits sodoku if doesn't fit description
    }

    remove_line(line) { // Removes line
        line.commit_sodoku();
        let start_node = line.start_node;
        let end_node = line.end_node;
        delete this.connections[line.id];

        for (let i = 0; i < start_node.outgoing[line.start_dot_name].length; i++) { // Removes line of the start node outgoing
            if (start_node.outgoing[line.start_dot_name][i].line === line) {
                start_node.outgoing[line.start_dot_name].splice(i, 1);
            }
        }

        for (let i = 0; i < end_node.incoming[line.end_dot_name].length; i++) { // Removes line of the end node incoming
            if (end_node.incoming[line.end_dot_name][i].line === line) {
                end_node.incoming[line.end_dot_name].splice(i, 1);
            }
        }
    }

    export_nodes (as_json = false) { // Exports all the nodes
        let nodes = {};
        for (let id in this.nodes) {
            let node = this.nodes[id];

            let outgoing = {}
            let incoming = {}

            for (let dot in node.outgoing) {
                outgoing[dot] = [];
                for (let connection of node.outgoing[dot]) {
                    outgoing[dot].push({
                        end_id: connection.end_node.id,
                        end_dot: connection.line.end_dot_name
                    });
                }
            }

            for (let dot in node.incoming) {
                incoming[dot] = [];
                for (let connection of node.incoming[dot]) {
                    incoming[dot].push({
                        start_id: connection.start_node.id,
                        start_dot: connection.line.start_dot_name
                    });
                }
            }

            nodes[node.id] = {
                x: node.node_x,
                y: node.node_y,
                header: node.node.find('div.block_header').html(),
                main: node.node.find('div.block_main').html(),
                incoming: incoming,
                outgoing: outgoing
            }
        }

        let b = $(document.body)

        let data = {
            nodes: nodes,
            meta: {
                width: b.width(),
                height: b.height()
            }
        }

        if (as_json) {
            return JSON.stringify(data);
        }

        return data;
    }

    import_nodes (data, import_meta = true) {
        if (typeof data == 'string') {
            try {
                data = JSON.parse(data);
            } catch (e) {
                console.error('Invalid JSON input into import_nodes.');
                return;
            }
        }

        let meta = data.meta;
        let nodes = data.nodes;
        let w = $(window);
        let d = $(document.body);

        if (import_meta) {
            if (w.width < meta.width) {
                d.width(meta.width);
            }
            if (w.height < meta.height) {
                d.height(meta.height);
            }
        }

        for (let id in nodes) {
            this.add_block(nodes[id].header, nodes[id].main, Object.keys(nodes[id].incoming), Object.keys(nodes[id].outgoing), id, nodes[id].x, nodes[id].y)
        }

        for (let id in nodes) {
            let object = nodes[id];
            for (let dot_label in object.outgoing) {
                let node = this.get_block(id);
                for (let i = 0; i < object.outgoing[dot_label].length; i++) {
                    let line = this.add_line();
                    line.update_start(object.x + node.outgoing_offsets[dot_label].x, object.y + node.outgoing_offsets[dot_label].y);
                    this.finalize_line(
                        node,
                        this.get_block(object.outgoing[dot_label][i].end_id).node.find('div.hitbox'),
                        line,
                        dot_label
                    );
                }
            }
        }
    }
}

class DragElement { // Drag-able Element
    api; // Reference to the API
    node; // Reference to jquery element
    id; // ID of the element
    mouse_offset_x = 0;
    mouse_offset_y = 0;
    width = 0;
    height = 0;
    node_x = 0;
    node_y = 0;
    outgoing = {}; // Link to the outgoing connection and the other node
    incoming = {}; // Link to the incoming connection and the other node
    outgoing_offsets = {};
    incoming_offsets = {};
    outgoing_dots = {};
    incoming_dots = {};

    constructor(api, node, inputs, outputs) {
        this.api = api;
        this.node = node;
        this.id = node.attr('id');
        this.width = node.outerWidth();
        this.height = node.outerHeight();

        for (let input of inputs) {
            this.incoming[input] = [];
        }

        for (let output of outputs) {
            this.outgoing[output] = [];
        }

        this.node_x = this.node.offset().left;
        this.node_y = this.node.offset().top;

        // Calculate offset of every dot
        for (let dot of this.node.find('div.incoming div.block_dot')) {
            this.dot_initialization(dot, this.incoming_offsets, this.incoming_dots);
        }

        for (let dot of this.node.find('div.outgoing div.block_dot')) {
            this.dot_initialization(dot, this.outgoing_offsets, this.outgoing_dots);
        }

        this.node.find('div.block_header').on('mousedown', {drag_elem: this},function (e) { // If header of window is being started to dragged
            e.data.drag_elem.window_pickup(e);
        });

        this.node.find('div.outgoing').on('mousedown','div.block_dot', {drag_elem: this},function (e) { // If output node is dragged
            e.data.drag_elem.line_pickup(e);
        });
    }

    dot_initialization(dot, offset_var, dots) { // Calculates the difference of a dot
        dot = $(dot);
        let label = dot.find('div.label').text();
        let offset = dot.offset();
        let x = offset.left + (dot.outerWidth()/2);
        let y = offset.top + (dot.outerHeight()/2);
        let rel_x = x - this.node_x;
        let rel_y = y - this.node_y;
        dots[label] = dot;
        offset_var[label] = {x: rel_x,  y: rel_y}; // Inserts into given offset object
    }

    line_pickup(e) { // Line is being started to dragged
        e = e || window.event; // Prevent
        e.preventDefault();

        if ($(e.target).hasClass('label')) { // Stops Move if Label is clicked
            return;
        }

        if (e.button === 0) { // Check that the left mouse button is pressed
            let dot = $(e.target);

            let offset = dot.offset();
            let start_x = offset.left + (dot.outerWidth()/2);
            let start_y = offset.top + (dot.outerHeight()/2);

            let line = this.api.add_line(this); // Creates Line and sets its position
            line.update_start(start_x, start_y);
            line.update_end(e.pageX, e.pageY);
            line.update();

            // Adds Events for moving the mouse and letting go of the button
            $(document).on('mouseup', {drag_elem: this, line_elem: line, dot_name: dot.find('div.label').text()}, function (e) { // Drop the line
                e.data.drag_elem.line_drop(e);
            });
            $(document).on('mousemove', {drag_elem: this, line_elem: line}, function (e) { // Update the line end position
                e.data.drag_elem.line_move(e);
            });
        }
    }

    line_move(e) { // If the Line is moved
        e = e || window.event;
        e.preventDefault();

        let line = e.data.line_elem;

        if (e.target.classList.contains('hitbox')) { // Update the Color if a hitbox is selected
            line.change_color('black');
        } else {
            line.change_color('gray');
        }

        // Updates Endpoint to mouse position
        console.log()
        line.update_end(e.pageX, e.pageY);
        line.update();
    }

    line_drop(e) { // If Line is let go
        $(document).off('mousemove');
        $(document).off('mouseup');

        // Does final checks
        this.api.finalize_line(this, $(e.target), e.data.line_elem, e.data.dot_name)
    }

    window_pickup(e) { // Header of a Node is clicked
        e = e || window.event;
        e.preventDefault();

        this.node.find('div.block_header').toggleClass('moving');

        this.mouse_offset_x = e.clientX - this.node.offset().left;
        this.mouse_offset_y = e.clientY - this.node.offset().top;

        $(document).on('mouseup', {drag_elem: this}, function (e) { // Window is let go
            e.data.drag_elem.window_drop(e);
        });
        $(document).on('mousemove', {drag_elem: this}, function (e) { // Window is moved
            e.data.drag_elem.window_move(e);
        });
    }

    window_move(e) { // Window is moved
        e = e || window.event;
        e.preventDefault();


        this.node_x = e.clientX - this.mouse_offset_x;
        this.node_y =  e.clientY - this.mouse_offset_y;


        let d = $(document);
        let b = $(document.body);
        let w = $(window)

        let max_width = this.width * 1.3;
        while (this.node_x + max_width - d.scrollLeft() > w.width()) {
            if (this.node_x + max_width > b.width()) {
                b.width(b.width() + 3);
            }
            d.scrollLeft(d.scrollLeft() + 3);
            this.mouse_offset_x -= 3;
        }

        let max_height = this.height * 1.3;
        while (this.node_y + max_height - d.scrollTop() > w.height()) {
            if (this.node_y + max_height > b.height()) {
                b.height(b.height() + 3);
            }
            d.scrollTop(d.scrollTop() + 3);
            this.mouse_offset_y -= 3;
        }

        let min_width = this.width * 0.3;
        while (d.scrollLeft() > min_width && this.node_x - d.scrollLeft() < min_width) {
            d.scrollLeft(d.scrollLeft() - 3);
            this.mouse_offset_x += 3;
        }

        let min_height = this.height * 0.3;
        while (d.scrollTop() > min_height && this.node_y - d.scrollTop() < min_height) {
            d.scrollTop(d.scrollTop() - 3);
            this.mouse_offset_y += 3;
        }

        if (this.node_x < 0) {
            this.node_x = 0;
        }

        if (this.node_y < 0) {
            this.node_y = 0;
        }

        /*let body = $(document.body)

        if (body.width() - 200 < node_x) {
            console.log(body.width());
            body.css('width', (body.width() + 200) + 'px')
            console.log(body.width());
        }*/

        this.node.css('top', this.node_y + "px");
        this.node.css('left', this.node_x + "px");

        // Updates position of connected lines
        for (let input in this.incoming) {
            let incomingElement = this.incoming[input];
            if (incomingElement.length > 0) {
                let x = this.node_x + this.incoming_offsets[input].x;
                let y = this.node_y + this.incoming_offsets[input].y;
                for (let i = 0; i < incomingElement.length; i++) {
                    incomingElement[i].line.update_end(x, y);
                    incomingElement[i].line.update();
                }
            }
        }

        for (let output in this.outgoing) {
            let outgoingElement = this.outgoing[output];
            if (outgoingElement.length > 0) {
                let x = this.node_x + this.outgoing_offsets[output].x;
                let y = this.node_y + this.outgoing_offsets[output].y;
                for (let i = 0; i < outgoingElement.length; i++) {
                    outgoingElement[i].line.update_start(x, y);
                    outgoingElement[i].line.update();
                }
            }
        }
    }

    window_drop(e) { // Window is droped
        this.node.find('div.block_header').toggleClass('moving');
        $(document).off('mousemove');
        $(document).off('mouseup');
    }

    remove_incoming(dot_name) { // Removes Incoming Connection
        for (let connection of this.incoming[dot_name]) {
            this.api.remove_line(connection.line);
        }
    }

    remove_outgoing(dot_name) { // Removes Outgoing Connection
        for (let connection of this.outgoing[dot_name]) {
            this.api.remove_line(connection.line);
        }
    }
}

class Connection {
    api;
    start_node;
    start_dot_name;
    end_node;
    end_dot_name;
    id;
    start_x = 0;
    start_y = 0;
    end_x = 0;
    end_y = 0;
    path;

    constructor(api, start_node, path) { // Creates Connection
        this.api = api;
        this.start_node = start_node;
        this.path = path;
    }

    update_start(x, y) { // Updates Startpoint
        this.start_x = x;
        this.start_y = y;
    }

    update_end(x, y) { // Updates EndPoint
        this.end_x = x;
        this.end_y = y;
    }

    update() { // Updates the Line
        let position = 'M ' + this.start_x + ',' + this.start_y; // Start Point
        let dist = Math.abs(this.end_x - this.start_x)
        if (dist < 150) {
            dist = 150;
        }
        let half_dist_x = dist/2;
        let straight_dist = dist/6;
        position += ' h ' + straight_dist;
        position += ' C ' + (this.start_x + half_dist_x + straight_dist) + ',' + this.start_y; // First Control point
        position += ' ' + (this.end_x - half_dist_x - straight_dist) +  ',' + this.end_y; // Second Control point
        position += ' ' + (this.end_x - straight_dist) +  ',' + this.end_y;
        position += ' h ' + straight_dist; // End Point

        this.path.setAttribute('d', position)
    }

    finalize(end_node, id, start_dot_name, end_dot_name) { // Finalize the Line by saving important data
        this.end_node = end_node;
        this.start_dot_name = start_dot_name;
        this.end_dot_name = end_dot_name;
        this.id = id;
        this.path.setAttribute('id', id);
    }

    commit_sodoku() { // Commits Sodoku
        this.path.remove();
    }

    change_color(color) { // Changes Color of the Line
        this.path.setAttribute('stroke', color);
    }
}
