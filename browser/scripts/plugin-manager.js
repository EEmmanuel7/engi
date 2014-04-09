var PluginGroup = require('./plugin-group').PluginGroup;
var ContextMenu = require('./context-menu').ContextMenu;

function PluginManager(core, base_url, creation_listener, ready_listener) 
{
	var self = this;

	this.base_url = base_url;
	this.core = core;
	this.keybyid = {};
	this.release_mode = false;
	this.lid = 1;
	this.context_menu = null;
	this.total = 0;
	this.loaded = 0;
	this.failed = 0;
	
	this.register_plugin = function(pg_root, key, id)
	{
		self.keybyid[id] = pg_root.insert_relative(key, id);
		msg('\tLoaded ' + id + ' (' + self.lid + ')');
		self.lid++;
	};
	
	this.update_state = function()
	{
		if(this.loaded + this.failed === this.total)
			ready_listener();
	};

	var onload = function()
	{
		self.loaded++;
		self.update_state();
	};
	
	var onerror = function()
	{
		self.failed++;
		self.update_state();
	};

	// First check if we're running a release build by checking for the existence
	// of 'all.plugins.js'
	var url = self.base_url + '/all.plugins.js';
	
	$.ajax({
		url: url,
		type: 'HEAD',
		async: false,
		cache: true,
		success: function() 
		{
			msg('PluginMgr: Running in release mode');
			self.release_mode = true;
		},
		error: function()
		{
			msg('PluginMgr: Running in debug mode');
		}
	});

	$.ajax({
		url: self.base_url + '/plugins.json',
		dataType: 'json',
		async: false,
		cache: true,
		headers: {},
		success: function(data)
		{
			var pg_root = new PluginGroup('root');
			
			$.each(data, function(key, id) 
			{
				self.total++;
			});
			
			$.each(data, function(key, id) 
			{
				// Load the plugin, constrain filenames.
				var url = self.base_url + '/' + id + '.plugin.js';

   				if(!self.release_mode)
					load_script(url, onload, onerror);
   				
				self.register_plugin(pg_root, key, id);
			});
			
			if(creation_listener)
				self.context_menu = new ContextMenu(E2.dom.canvas_parent, pg_root.create_items(), creation_listener);
  		}
	});
	
	if(this.release_mode)
	{
		this.total = 1;
		load_script(url, onload, onerror);
	}
}
 
PluginManager.prototype.create = function(id, node) 
{
	if(E2.plugins.hasOwnProperty(id))
	{
		var p = new E2.plugins[id](this.core, node);
		
		p.id = id;
		
		return p;
	}
		 
	console.assert(false, 'Failed to resolve plugin with id \'' + id + '\'. Please check that the right id is specified by the plugin implementation.');
	return null;
};

exports.PluginManager = PluginManager;
