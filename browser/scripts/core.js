/*
The MIT License (MIT)

Copyright (c) 2011 Lasse Jul Nielsen

Permission is hereby granted, free of charge, to any person obtaining a copy of this software 
and associated documentation files (the "Software"), to deal in the Software without restriction, 
including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, 
and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, 
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial 
portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var Application = require('./application').Application;
var TreeView = require('./treeview').TreeView;
var Graph = require('./graph').Graph;
var Renderer = require('./renderer').Renderer;
var PluginManager = require('./plugin-manager').PluginManager;

var engiUtil = require('./util')
var msg = engiUtil.msg;
var load_location_hash = engiUtil.load_location_hash;

var URL_GRAPHS = '/data/graphs/'

window.E2 = E2 = {};

E2.app = null;
E2.dom = {};
E2.plugins = {};
E2.slot_type = { input: 0, output: 1 };
E2.erase_color = '#ff3b3b';

// XXX set up window globals to be removed
console.warn('setting up Renderer globals');
window.Material = require('./material').Material;
window.Renderer = Renderer;
window.Connection = require('./connection').Connection;
window.Color = require('./color').Color;
window.Camera = require('./camera').Camera;
window.Mesh = require('./mesh').Mesh;
window.VertexBuffer = require('./vertex-buffer').VertexBuffer;
window.IndexBuffer = require('./index-buffer').IndexBuffer;
window.ShaderProgram = require('./shader-program').ShaderProgram;
window.Texture = require('./texture').Texture;

function Delegate(delegate, dt, count)
{
	this.delegate = delegate;
	this.dt = dt;
	this.count = count;
}

function AssetTracker(core)
{
	this.core = core;
	this.started = 0;
	this.completed = 0;
	this.failed = 0;
	this.listeners = [];
}

AssetTracker.prototype.add_listener = function(listener)
{
	this.listeners.push(listener);
};

AssetTracker.prototype.remove_listener = function(listener)
{
	this.listeners.remove(listener);
};

AssetTracker.prototype.signal_started = function()
{
	this.started++;
	this.signal_update();
};

AssetTracker.prototype.signal_completed = function()
{
	this.completed++;
	this.signal_update();
};

AssetTracker.prototype.signal_failed = function()
{
	this.failed++;
	this.signal_update();
};

AssetTracker.prototype.signal_update = function()
{
	var l = this.listeners;
	
	if(E2.dom.load_spinner)
		E2.dom.load_spinner.css('display', this.started === (this.completed + this.failed) ? 'none' : 'inherit');
	
	for(var i = 0, len = l.length; i < len; i++)
		l[i]();
};

function Core(app) {
	var self = this;
	
	this.datatypes = {
		FLOAT: { id: 0, name: 'Float' },
		SHADER: { id: 1, name: 'Shader' },
		TEXTURE: { id: 2, name: 'Texture' },
		COLOR: { id: 3, name: 'Color' },
		MATRIX: { id: 4, name: 'Matrix' },
		VECTOR: { id: 5, name: 'Vector' },
		CAMERA: { id: 6, name: 'Camera' },
		BOOL: { id: 7, name: 'Boolean' },
		ANY: { id: 8, name: 'Arbitrary' },
		MESH: { id: 9, name: 'Mesh' },
		AUDIO: { id: 10, name: 'Audio' },
		SCENE: { id: 11, name: 'Scene' },
		MATERIAL: { id: 12, name: 'Material' },
		LIGHT: { id: 13, name: 'Light' },
		DELEGATE: { id: 14, name: 'Delegate' },
		TEXT: { id: 15, name: 'Text' },
		VIDEO: { id: 16, name: 'Video' },
		ARRAY: { id: 17, name: 'Array' },
		OBJECT: { id: 18, name: 'Object' }
	};
	
	this.asset_tracker = new AssetTracker(this);
	this.renderer = new Renderer('#webgl-canvas', this);
	this.active_graph = this.root_graph = null;
	this.active_graph_dirty = true;
	this.graphs = [];
	this.abs_t = 0.0;
	this.delta_t = 0.0;
	this.graph_uid = 0;
	this.app = app;
	this.plugin_mgr = new PluginManager(this, 'plugins', E2.app ? E2.app.onPluginInstantiated : null,
		function()
		{
			load_location_hash(URL_GRAPHS);
		});
	this.aux_scripts = {};
	this.aux_styles = {};
	
	this.resolve_dt = []; // Make a table for easy reverse lookup of dt reference by id.
	
	for(var i in this.datatypes)
	{
		var dt = this.datatypes[i];
		
		this.resolve_dt[dt.id] = dt;
	}
	
	this.get_graph_uid = function()
	{
		return self.graph_uid++;
	};
	
	this.update = function(abs_t, delta_t)
	{
		self.abs_t = abs_t;
		self.delta_t = delta_t;
		
		self.renderer.begin_frame();
		self.root_graph.update(delta_t);
		self.renderer.end_frame();
				
		var dirty = self.active_graph_dirty;
				
		self.active_graph_dirty = false;
				
		return dirty; // Did connection state change?
	};
	
	this.onGraphSelected = function(graph)
	{
		self.active_graph.destroy_ui();
		self.active_graph = graph;
		
		// TODO: Fix this up later. We need to reset this position to make
		// copy / paste and switching graphs more humane, but right now this 
		// introduces a bug in the connection rendering logic for some (copied)
		// nested subgraphs.
		
		/*E2.dom.canvas_parent.scrollTop(0);
		E2.dom.canvas_parent.scrollLeft(0);
		self.scrollOffset = [0, 0];*/
		
		// Clear the current breadcrumb elements and rebuild.
		E2.dom.breadcrumb.children().remove();
		self.active_graph.build_breadcrumb(E2.dom.breadcrumb, false);
		
		self.active_graph.create_ui();
		self.active_graph.reset();
		self.active_graph_dirty = true;
	};
	
	this.create_dialog = function(diag, title, w, h, done_func, open_func)
	{
		var modal = $('.modal-template').clone();

		function close()
		{
			modal.unbind();
			modal.remove();
		}

		function ok()
		{
			done_func();
			modal.modal('hide');
		}

		$('.modal-title', modal).html(title);
		$('.modal-body', modal).html(diag);

		modal.on('show.bs.modal', function()
		{
			$('.modal-dialog', modal).css('width', w + 40);
		});

		modal.on('shown.bs.modal', function()
		{
			if(open_func)
				open_func();
		});

		modal.on('hidden.bs.modal', close);
		modal.modal({ keyboard: true });

		modal.on('keypress', function(e)
		{
			if(e.keyCode === 13)
			{
				if(e.target.nodeName !== 'TEXTAREA')
					ok();
			}
		})

		$('button:last', modal).click(ok);
	};
	
	this.get_default_value = function(dt)
	{
		var dts = self.datatypes;
		
		if(dt === dts.FLOAT)
			return 0.0;
		else if(dt === dts.COLOR)
			return new Color(1, 1, 1);
		else if(dt === dts.MATRIX)
		{
			var m = mat4.create();
	
			mat4.identity(m);
			return m;
		}
		else if (dt === dts.TEXTURE)
			return self.renderer.default_tex;
		else if(dt === dts.VECTOR)
			return [0.0, 0.0, 0.0];
		else if(dt === dts.CAMERA)
			return new Camera(self.renderer.context);
		else if(dt === dts.BOOL)
			return false;
		else if(dt === dts.MATERIAL)
			return new Material();
		else if(dt === dts.TEXT)
			return '';
		else if(dt === dts.ARRAY)
		{
			var a = new ArrayBuffer(0);
			
			a.stride = a.datatype = 1; // Uint8
			return a;
		}
		else if(dt === dts.OBJECT)
			return {};
		
		// Shaders, textures, scenes, light and delegates and ALL legally defaults to null.
		return null;
	};
	
	this.serialise = function()
	{
		var d = {};
		
		d.abs_t = Math.round(self.abs_t * Math.pow(10, 4)) / Math.pow(10, 4);
		d.active_graph = self.active_graph.uid;
		d.graph_uid = self.graph_uid;
		d.root = self.root_graph.serialise();
		
		return JSON.stringify(d, undefined, 4);
	};
	
	this.deserialise = function(str)
	{
		var d = JSON.parse(str);
		
		self.abs_t = d.abs_t;
		self.delta_t = 0.0;
		self.graph_uid = d.graph_uid;

		self.active_graph.destroy_ui();
		
		var graphs = self.graphs = [];
		
		self.root_graph = new Graph(this, null, null);
		self.root_graph.deserialise(d.root);
		self.graphs.push(self.root_graph);
		
		self.root_graph.patch_up(self.graphs);
		self.root_graph.initialise(self.graphs);
			
		self.active_graph = Graph.resolve_graph(self.graphs, d.active_graph); 
		
		if(E2.dom.structure)
		{
			self.rebuild_structure_tree();
			self.active_graph.tree_node.activate();
		}
	};
	
	this.rebuild_structure_tree = function()
	{
		var build = function(graph, name)
		{
			var nodes = graph.nodes;
			
			if(graph.parent_graph !== null)
			{
				var tnode = graph.parent_graph.tree_node.add_child(name);

				tnode.closed = !graph.open;
				graph.tree_node = tnode;
				tnode.graph = graph;
			}		
			
			for(var i = 0, len = nodes.length; i < len; i++)
			{
				var n = nodes[i];

				if(n.plugin.e2_is_graph)
					build(n.plugin.graph, n.get_disp_name());
			}
		};

		E2.dom.structure.tree.reset();
		self.root_graph.tree_node = E2.dom.structure.tree.root;
		E2.dom.structure.tree.root.graph = self.root_graph;
		build(self.root_graph, 'Root');
	};
	
	this.add_aux_script = function(script_url)
	{
		if(self.aux_scripts.hasOwnProperty(script_url))
			return;
		
		load_script('plugins/external/' + script_url);
		self.aux_scripts[script_url] = true;
	};

	this.add_aux_style = function(style_url)
	{
		if(self.aux_styles.hasOwnProperty(style_url))
			return;
		
		load_style('plugins/external/' + style_url);
		self.aux_styles[style_url] = true;
	};
}

exports.Core = Core;

E2.InitialiseEngi = function()
{
	E2.dom.canvas_parent = $('#canvas_parent');
	E2.dom.canvas = $('#canvas');
	E2.dom.controls = $('#controls');
	E2.dom.webgl_canvas = $('#webgl-canvas');
	E2.dom.left_nav = $('#left-nav');
	E2.dom.dbg = $('#dbg');
	E2.dom.play = $('#play');
	E2.dom.pause = $('#pause');
	E2.dom.stop = $('#stop');
	E2.dom.refresh = $('#refresh');
	E2.dom.save = $('#save');
	E2.dom.dl_graph = $('#dl-graph');
	E2.dom.open = $('#open');
	E2.dom.load_clipboard = $('#load-clipboard');
	E2.dom.structure = $('#structure');
	E2.dom.info = $('#info');
	E2.dom.info._defaultContent = E2.dom.info.html()
	E2.dom.tabs = $('#tabs');
	E2.dom.graphs_list = $('#graphs-list');
	E2.dom.presets_list = $('#presets');
	E2.dom.breadcrumb = $('#breadcrumb');
	E2.dom.load_spinner = $('#load-spinner');

	E2.dom.filename_input = $('#filename-input');

	$.ajaxSetup({ cache: false });

	msg('Welcome to WebFx. ' + (new Date()));
	
	E2.dom.dbg.ajaxError(function(e, jqxhr, settings, ex) 
	{
		if(settings.dataType === 'script' && !settings.url.match(/^plugins\/all.plugins\.js/)) 
		{
			if(typeof(ex) === 'string')
			{
				msg(ex);
				return;
			}
				
			var m = 'ERROR: Script exception:\n';
			
			if(ex.fileName)
				m += '\tFilename: ' + ex.fileName;
				
			if(ex.lineNumber)
				m += '\tLine number: ' + ex.lineNumber;
			
			if(ex.message)
				m += '\tMessage: ' + ex.message;
				
			msg(m);
		}
	});

	E2.app = new Application();

	E2.dom.structure.tree = new TreeView(E2.dom.structure, function(graph)
	{ // On item activation
		E2.app.clearEditState();
		E2.app.clearSelection();
		E2.app.player.core.onGraphSelected(graph);
		E2.app.updateCanvas(true);
	},
	function(graph, original, sibling, insert_after)
	{ // On child dropped
		graph.reorder_children(original, sibling, insert_after);
	});

	var Player = require('./player').Player;
	E2.app.player = new Player(E2.dom.webgl_canvas, E2.app, E2.dom.structure.tree.root);
	
	E2.dom.save.click(E2.app.onSaveClicked);
	E2.dom.open.click(E2.app.onOpenClicked);

	E2.dom.play.click(E2.app.onPlayClicked);
	E2.dom.pause.click(E2.app.onPauseClicked);
	E2.dom.stop.click(E2.app.onStopClicked);

	E2.app.onWindowResize();
	
	if(E2.app.player.core.plugin_mgr.release_mode)
	{
		window.onbeforeunload = function(e)
		{
		    return 'You might be leaving behind unsaved work!';
		};
	}
}

