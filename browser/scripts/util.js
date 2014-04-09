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

exports.clone_recursive = function clone_recursive(from, to)
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

exports.clone = function clone(o)
{
	return clone_recursive(o, null);
};

exports.make = function make(tag)
{
	return $(document.createElement(tag));
}

exports.makeButton = function makeButton(text, alt, className)
{
	text = text || '';
	alt = alt || '';
	className = className || '';
	return $('<button class="btn btn-xs ' + className + '" title="' + alt + '">' + text + '</button>');
}

exports.resolve_graph = function resolve_graph(graphs, guid)
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

exports.load_style = function load_style(url)
{
	var link = document.createElement('link');
	var rel = document.createAttribute('rel');
	
	link.rel = 'stylesheet';
	link.href = url;
	
	document.getElementById('head').appendChild(link);
}

exports.sort_dict = function sort_dict(dict)
{
	var s = [], key;
	
	for(key in dict)
		s.push(key);
		
	s.sort();

	return s;
}

exports.msg = function msg(txt)
{
	var d = E2.dom.dbg;

	if(d === undefined)
		return;
	
	if(txt)
	{
		if(txt.substring(0,  7) !== 'ERROR: ')
			d.append(txt + '\n');
		else
			d.append('<span style="color:#f00">' + txt + '</span>\n');
	}
	
	d.scrollTop(d[0].scrollHeight);
}

exports.load_script = function load_script(url, onload, onerror)
{
	var script = document.createElement('script');

	script.src = url;
	
	if(onload)
		script.onload = onload;
	
	if(onerror)
		script.onerror = onerror;
	
	document.getElementsByTagName('head')[0].appendChild(script);	
}
