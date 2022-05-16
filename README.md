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

### Getting a export

```js
let data = dnd.export_nodes();
```

## TO-DO
- [X] New Nodes Need to spawn in center of screen
- [X] Expandable Screen
- [ ] Import of Export