class DragNDropAPI {
    nodes = {}; // Keeps track of all the nodes that exist
    connections = {}; // Keeps track of all the connections that exist

    node_editor; // Keeps track of the div with the nodes in it
    connection_editor; // Keeps track of the svg with the connections in it

    constructor() {
        this.node_editor = $('div.nodes');
        this.connection_editor = document.getElementsByClassName('connections')[0];
    }

    add_block(header, main, inputs, outputs, id = null) {
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
        let drag = new DragElement(this, node, inputs, outputs);
        this.nodes[id] = drag;

        node.find('div.incoming').on('dblclick', 'div.block_dot', {drag_elem: drag}, function (e) {
            e.data.drag_elem.remove_incoming($(this).find('div.label').text());
        });
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
                line.finalize(end_node, line_id, start_dot_name, end_dot_name);
                line.update_end(snap_x, snap_y);

                // =============================================================
                // +++++ Remove this to have multiple inputs for an output +++++
                // =============================================================
                if (end_node.incoming[end_dot_name].length > 0) { // Removes any inputs that are already connected
                    for (let connection of end_node.incoming[end_dot_name]) {
                        this.remove_line(connection.line);
                    }
                }
                // =============================================================

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
        delete this.nodes[line.line.id];

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

    export_nodes () { // Exports all the nodes
        let data = {};
        for (let id in this.nodes) {
            let node = this.nodes[id];

            let outgoing = {}
            let incoming = {}

            for (let dot in node.outgoing) {
                outgoing[dot] = [];
                for (let connection of node.outgoing[dot]) {
                    outgoing[dot].push(connection.end_node.id);
                }
            }

            for (let dot in node.incoming) {
                incoming[dot] = [];
                for (let connection of node.incoming[dot]) {
                    incoming[dot].push(connection.start_node.id);
                }
            }

            data[node.id] = {
                incoming: incoming,
                outgoing: outgoing
            }
        }

        return data;
    }
}

class DragElement { // Drag-able Element
    api; // Reference to the API
    node; // Reference to jquery element
    id; // ID of the element
    mouse_offset_x = 0;
    mouse_offset_y = 0;
    window_x = 0;
    window_y = 0;
    outgoing = {}; // Link to the outgoing connection and the other node
    incoming = {}; // Link to the incoming connection and the other node

    constructor(api, node, inputs, outputs) {
        this.api = api;
        this.node = node;
        this.id = node.attr('id');

        for (let input of inputs) {
            this.incoming[input] = [];
            this.incoming[input] = [];
        }

        for (let output of outputs) {
            this.outgoing[output] = [];
        }

        this.node.find('div.block_header').on('mousedown', {drag_elem: this},function (e) { // If header of window is being started to dragged
            e.data.drag_elem.window_pickup(e);
        });

        this.node.find('div.outgoing').on('mousedown','div.block_dot', {drag_elem: this},function (e) { // If output node is dragged
                e.data.drag_elem.line_pickup(e);
        });
    }

    line_pickup(e) { // Line is being started to dragged
        e = e || window.event; // Prevent
        e.preventDefault();

        if (e.button === 0) { // Check that the left mouse button is pressed
            let dot = $(e.target);

            let offset = dot.offset();
            let start_x = offset.left + (dot.outerWidth()/2);
            let start_y = offset.top + (dot.outerHeight()/2);

            let line = this.api.add_line(this);
            line.update_start(start_x, start_y);
            line.update_end(e.clientX, e.clientY);
            line.update();

            $(document).on('mouseup', {drag_elem: this, line_elem: line, dot_name: dot.find('div.label').text()}, function (e) { // Drop the line
                e.data.drag_elem.line_drop(e);
            });
            $(document).on('mousemove', {drag_elem: this, line_elem: line}, function (e) { // Update the line end position
                e.data.drag_elem.line_move(e);
            });
        }
    }

    line_move(e) {
        e = e || window.event;
        e.preventDefault();

        let line = e.data.line_elem;

        if (e.target.classList.contains('hitbox')) {
            line.change_color('black');
        } else {
            line.change_color('gray');
        }

        line.update_end(e.clientX, e.clientY);
        line.update();
    }

    line_drop(e) {
        $(document).off('mousemove');
        $(document).off('mouseup');

        this.api.finalize_line(this, $(e.target), e.data.line_elem, e.data.dot_name)
    }

    window_pickup(e) {
        e = e || window.event;
        e.preventDefault();

        this.mouse_offset_x = e.clientX;
        this.mouse_offset_y = e.clientY;

        $(document).on('mouseup', {drag_elem: this}, function (e) {
            e.data.drag_elem.window_drop(e);
        });
        $(document).on('mousemove', {drag_elem: this}, function (e) {
            e.data.drag_elem.window_move(e);
        });
    }

    window_move(e) {
        e = e || window.event;
        e.preventDefault();

        this.window_x = this.mouse_offset_x - e.clientX;
        this.window_y = this.mouse_offset_y - e.clientY;
        this.mouse_offset_x = e.clientX;
        this.mouse_offset_y = e.clientY;

        this.node.css('top', (this.node.offset().top - this.window_y) + "px");
        this.node.css('left', (this.node.offset().left - this.window_x) + "px");


        for (let dot of this.node.find('div.incoming div.block_dot')) {
            dot = $(dot);
            let label = dot.find('div.label').text();
            if (this.incoming[label].length > 0){
                let offset = dot.offset();
                let end_x = offset.left + (dot.outerWidth()/2);
                let end_y = offset.top + (dot.outerHeight()/2);
                for (let i = 0; i < this.incoming[label].length; i++) {
                    let line = this.incoming[label][i].line;

                    line.update_end(end_x, end_y);
                    line.update();
                }
            }
        }

        for (let dot of this.node.find('div.outgoing div.block_dot')) {
            dot = $(dot);
            let label = dot.find('div.label').text();
            if (this.outgoing[label].length > 0){
                let offset = dot.offset();
                let start_x = offset.left + (dot.outerWidth()/2);
                let start_y = offset.top + (dot.outerHeight()/2);
                for (let i = 0; i < this.outgoing[label].length; i++) {
                    let line = this.outgoing[label][i].line;

                    line.update_start(start_x, start_y);
                    line.update();
                }
            }
        }
    }

    window_drop(e) {
        $(document).off('mousemove');
        $(document).off('mouseup');
    }

    remove_incoming(dot_name) {
        for (let connection of this.incoming[dot_name]) {
            this.api.remove_line(connection.line);
        }
    }

    remove_outgoing(dot_name) {
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

    constructor(api, start_node, path) {
        this.api = api;
        this.start_node = start_node;
        this.path = path;

    }

    update_start(x, y) {
        this.start_x = x;
        this.start_y = y;
    }

    update_end(x, y) {
        this.end_x = x;
        this.end_y = y;
    }

    update() {
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

    finalize(end_node, id, start_dot_name, end_dot_name) {
        this.end_node = end_node;
        this.start_dot_name = start_dot_name;
        this.end_dot_name = end_dot_name;
        this.id = id;
        this.path.setAttribute('id', id);
    }

    commit_sodoku() {
        this.path.remove();
    }

    change_color(color) {
        this.path.setAttribute('stroke', color);
    }
}