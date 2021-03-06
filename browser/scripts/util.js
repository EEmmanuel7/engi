// Monkey-patch the window object with a request/cancelAnimationFrame shims.
window.requestAnimFrame = (function()
{
	return window.requestAnimationFrame       || 
		window.webkitRequestAnimationFrame || 
		window.mozRequestAnimationFrame
})();

window.cancelAnimFrame = (function()
{
	return window.cancelAnimationFrame       || 
		window.webkitCancelAnimationFrame || 
		window.mozCancelAnimationFrame
})();

Array.prototype.remove = function(obj)
{
	var i = this.indexOf(obj);
	
	if(i !== -1)
		this.splice(i, 1);
};

function clone_recursive(from, to)
{
    if (from == null || typeof from != "object") return from;
    if (from.constructor != Object && from.constructor != Array) return from;
    if (from.constructor == Date || from.constructor == RegExp || from.constructor == Function ||
        from.constructor == String || from.constructor == Number || from.constructor == Boolean)
        return new from.constructor(from);

    to = to || new from.constructor();

    for (var name in from)
    {
        to[name] = typeof to[name] == "undefined" ? clone_recursive(from[name], null) : to[name];
    }

    return to;
}

function clone(o)
{
	return clone_recursive(o, null);
};

function make(tag)
{
	return $(document.createElement(tag));
}

function makeButton(text, alt, className)
{
	text = text || '';
	alt = alt ? ' title="' + alt + '"' : '';
	className = className ? ' ' + className : '';
	
	return $('<button class="btn btn-xs' + className + '"' + alt + '>' + text + '</button>');
}

function resolve_graph(graphs, guid)
{
	for(var i = 0, len = graphs.length; i < len; i++)
	{
		if(graphs[i].uid === guid)
			return graphs[i]; 
	}

	if(guid !== -1)
		msg('ERROR: Failed to resolve graph(' + guid + ')');
	
	return null;
};

function load_style(url)
{
	var link = document.createElement('link');
	
	link.rel = 'stylesheet';
	link.href = url;
	
	document.getElementById('head').appendChild(link);
}

function sort_dict(dict)
{
	var s = [], key;
	
	for(key in dict)
		s.push(key);
		
	// JS has a quaint notion of what "alphabetically" means. Apparently all 
	// upper caps letters preceeds lower case ones. Let's fix that.
	s.sort(function(a, b)
	{
		var _a = a.toLowerCase();
		var _b = b.toLowerCase();
		
		return _a < _b ? -1 : _a > _b ? 1 : 0;
	});

	return s;
}

function msg(txt)
{
	var d = E2.dom.dbg;

	if(d === undefined)
	{
		console.log(txt);
		return;
	}
	
	if(txt)
	{
		if(txt.substring(0,  7) === 'ERROR: ')
			d.append('<span style="color:#f20">' + txt + '</span>\n');
		else if(txt.substring(0,  9) === 'WARNING: ')
			d.append('<span style="color:#fa0">' + txt + '</span>\n');
		else if(txt.substring(0,  6) === 'INFO: ')
			d.append('<span style="color:#04f">' + txt + '</span>\n');
		else
			d.append(txt + '\n');
	}
	
	d.scrollTop(d[0].scrollHeight);
}

function ExpandableTextfield(node, tf, def_width)
{
	var self = this;
	
	this.node = node;
	this.tf = tf;
	this.def_width = def_width;
	
	this.update = function()
	{
		var s = '' + self.tf.val();
		
		self.tf[0].style.width = ((Math.max(self.def_width, s.length) * 7) + 2) + 'px';
		self.node.geometry_updated();
	};
	
	var handler = function(self) { return function(e)
	{
		self.update();
	}}(this);
	
	tf.change(handler);
	tf.keyup(handler);
}

function load_script(url, onload, onerror)
{
	var script = document.createElement('script');

	script.src = url;
	script.setAttribute('async', 'false');
	
	if(onload)
		script.onload = onload;
	
	if(onerror)
		script.onerror = onerror;
	
	document.getElementsByTagName('head')[0].appendChild(script);	
}
