# NodeEditor

## Table of Contents

1. [About The Project](#about-the-project)
   - [Built With](#built-with)
2. [Examples](#examples)
3. [TO-DO](#to-do)

## About The Project

I needed code for a Node Editor. Made my own library, since I didn't know what this type of editor was called at that moment. 

### Built With

* [Javascript](www.javascript.com)
* [jQuery](www.jquery.com)

## Examples

Some Examples of how I use the library.

### Creating a API Object

```js
dnd = new DragNDropAPI();
```

### Creating a Node

The addblock has following parameters:
* Header HTML: The HTML that you want in the header
* Body HTML: The HTML that you want in the body
* Inputs: A array of labels with the input. The Label has to be unique for the node.
* Outputs: A array of labels with the output. The Label has to be unique for the node.
* id: (Optional) A string with a unique id. This id has to be unique inbetween the connections and nodes. If none is given or it already exists a new one is generated.

```js
dnd.add_block('Node Header', 'Wow this Node is really cool', ['A', 'B', 'C'], ['S', 'T']);
```

### Getting an export
Exporting Nodes can be either done as json or a js object. It has the following parameters:
- *as_json:* Selects if you want to export it as json. Default is false.

```js
let data = dnd.export_nodes();
```

### Importing a previous save 
Nodes are imported either as json or a js object. With following parameters has the following parameters:
- *data:* Data that you want to import either as json or a js object.
- *import_meta:* Selects if you want to import meta data. Default is true.

```js
let data = dnd.export_nodes(); // Export as Object

dnd.import_nodes(data);
```

## TO-DO
- [X] New Nodes Need to spawn in center of screen
- [X] Expandable Screen
- [X] Import of Export